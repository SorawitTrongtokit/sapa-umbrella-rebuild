import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function jsonError(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
  }

  const message = error instanceof Error ? error.message : "เกิดข้อผิดพลาด";
  return NextResponse.json({ ok: false, error: message }, { status: 500 });
}

export function requestMeta(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return {
    ip: forwardedFor || null,
    userAgent: request.headers.get("user-agent")
  };
}
