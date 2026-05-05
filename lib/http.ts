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

export function jsonBadRequest(message: string) {
  return jsonError(new HttpError(400, message));
}

export function jsonError(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
  }

  if (error instanceof SyntaxError) {
    return NextResponse.json({ ok: false, error: "ข้อมูล JSON ไม่ถูกต้อง" }, { status: 400 });
  }

  console.error(error);
  return NextResponse.json({ ok: false, error: "เกิดข้อผิดพลาด" }, { status: 500 });
}

export function requestMeta(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return {
    ip: forwardedFor || null,
    userAgent: request.headers.get("user-agent")
  };
}
