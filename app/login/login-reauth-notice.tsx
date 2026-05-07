"use client";

import { useSearchParams } from "next/navigation";
import { LOGIN_FORM_COPY } from "@/app/login/constants";

export function LoginReauthNotice() {
  const from = useSearchParams().get("from");
  if (!from || from === "/login") {
    return null;
  }

  return (
    <p
      role="status"
      className="mb-4 rounded-md border border-info/25 bg-info/5 px-3 py-2 text-sm text-text-primary"
    >
      {LOGIN_FORM_COPY.REAUTH_NOTICE}
    </p>
  );
}
