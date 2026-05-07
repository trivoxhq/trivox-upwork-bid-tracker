type SummaryPayload = {
  dateLabel: string;
  totalBids: number;
  wonCount: number;
  revenue: number;
  text: string;
};

export async function sendDailySummaryEmail(payload: SummaryPayload): Promise<{
  ok: boolean;
  skippedReason?: string;
}> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = process.env.DAILY_SUMMARY_TO?.trim();
  const from =
    process.env.DAILY_SUMMARY_FROM?.trim() ||
    "Upwork Bid Tracker <onboarding@resend.dev>";

  if (!apiKey) {
    return { ok: false, skippedReason: "RESEND_API_KEY not set" };
  }
  if (!to) {
    return { ok: false, skippedReason: "DAILY_SUMMARY_TO not set" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `Bid tracker — daily summary (${payload.dateLabel})`,
      text: payload.text,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    return { ok: false, skippedReason: `Resend error ${res.status}: ${errText.slice(0, 200)}` };
  }

  return { ok: true };
}
