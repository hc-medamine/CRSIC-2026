import { getIronSession, type SessionOptions, type IronSession } from "iron-session";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import type { NextResponse } from "next/server";

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
  role: "super_admin" | "editor" | "reviewer";
};

export type SessionData = {
  user?: SessionUser;
  /** Unix ms — updated on login and via /api/auth/touch */
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

/** Server Components — read only (cannot modify cookies here in Next.js) */
export async function getSession() {
  return getIronSession<SessionData>(await cookies(), getSessionOptions());
}

/**
 * Route Handlers / Server Actions — pass Response so Set-Cookie is attached.
 */
export async function getSessionForRoute(
  request: NextRequest,
  response: NextResponse,
): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(request, response, getSessionOptions());
}

function isSessionActive(session: SessionData): session is SessionData & {
  user: SessionUser;
  lastActivityAt: number;
} {
  if (!session.user || !session.lastActivityAt) return false;
  return Date.now() - session.lastActivityAt <= sessionTimeoutMs();
}

/**
 * For Server Components / layouts — read-only. Do not save() or destroy() here.
 */
export async function requireUser(): Promise<SessionUser> {
  const session = await getSession();
  if (!isSessionActive(session)) {
    throw new Error("UNAUTHENTICATED");
  }
  return session.user;
}
