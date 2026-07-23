import { NextRequest, NextResponse } from "next/server";
import { resolvePreviewToken } from "@/lib/content/preview";

export const runtime = "nodejs";

type Params = { params: Promise<{ token: string }> };

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

/** Public A1 resolve — token authenticates; no session cookie. */
export async function GET(_request: NextRequest, { params }: Params) {
  const { token } = await params;
  const row = await resolvePreviewToken(token);
  if (!row) {
    return NextResponse.json(
      { ok: false, error: "Preview expired or not found" },
      { status: 404, headers: corsHeaders() },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      type: row.content_type,
      item: row.payload,
      expiresAt: row.expires_at instanceof Date ? row.expires_at.toISOString() : row.expires_at,
    },
    { headers: corsHeaders() },
  );
}
