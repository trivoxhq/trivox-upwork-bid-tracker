import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin-api";

/** Whether “Reset all data” requires ADMIN_DESTRUCTIVE_PIN in the delete request body. */
export async function GET() {
  const gate = await requireAdminApi();
  if (!gate.ok) return gate.response;

  const pinRequired = Boolean(process.env.ADMIN_DESTRUCTIVE_PIN?.trim());

  return NextResponse.json({ pinRequired });
}
