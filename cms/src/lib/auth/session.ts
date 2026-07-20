import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
  role: "super_admin" | "editor" | "reviewer";
};

export type SessionData = {
  user?: SessionUser;
  /** Unix ms — updated on each authenticated request */
  lastActivityAt?: number;
};

function sessionPassword(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set and at least 32 characters");
  }
  return secret;
}

export function sessionTimeoutMs(): number {
  const minutes = Number(process.env.SESSION_TIMEOUT_MINUTES ?? "30");
  return (Number.isFinite(minutes) && minutes > 0 ? minutes : 30) * 60 * 1000;
}

export function getSessionOptions(): SessionOptions {
  return {
    cookieName: "crsic_cms_session",
    password: sessionPassword(),
    ttl: Math.ceil(sessionTimeoutMs() / 1000),
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
  };
}

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), getSessionOptions());
}

export async function requireUser(): Promise<SessionUser> {
  const session = await getSession();
  const now = Date.now();
  const timeout = sessionTimeoutMs();

  if (!session.user || !session.lastActivityAt) {
    session.destroy();
    throw new Error("UNAUTHENTICATED");
  }

  if (now - session.lastActivityAt > timeout) {
    session.destroy();
    throw new Error("SESSION_EXPIRED");
  }

  session.lastActivityAt = now;
  await session.save();
  return session.user;
}
