import { NextResponse } from "next/server";

export function readOnlyForbiddenResponse() {
  return NextResponse.json({ success: false, message: "Read-only access." }, { status: 403 });
}
