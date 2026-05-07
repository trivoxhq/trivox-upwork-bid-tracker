/**
 * Static copy and configuration for the login route.
 * UI strings live here so the page and preview stay presentational.
 */

export const LOGIN_ROUTES = {
  DASHBOARD: "/dashboard",
} as const;

export const LOGIN_API = {
  LOGIN: "/api/auth/login",
} as const;

export const LOGIN_FORM_COPY = {
  TITLE: "Sign in",
  /** Shown when middleware redirects here with a `from` query (e.g. expired session). */
  REAUTH_NOTICE: "Please sign in again to continue.",
  SUBTITLE:
    "Use your work email and password. They are only sent when you click Sign in.",
  EMAIL_LABEL: "Email",
  PASSWORD_LABEL: "Password",
  EMAIL_PLACEHOLDER: "you@company.com",
  PASSWORD_PLACEHOLDER: "Your password",
  PASSWORD_HELPER: "Enter the correct credentials.",
  FORGOT_PASSWORD: "Forgot password?",
  SUBMIT: "Sign in",
  SUBMIT_LOADING: "Signing in…",
  ARIA_SHOW_PASSWORD: "Show password",
  ARIA_HIDE_PASSWORD: "Hide password",
} as const;

export const LOGIN_VALIDATION_MESSAGES = {
  EMAIL_REQUIRED: "Please enter your email address.",
  PASSWORD_REQUIRED: "Please enter your password.",
  LOGIN_FAILED: "Login failed. Please try again.",
  NETWORK_ERROR: "Unable to sign in right now. Please try again.",
} as const;

export const LOGIN_PREVIEW = {
  SLIDE_COUNT: 3,
  AUTOPLAY_INTERVAL_MS: 6000,
  BRAND_MARK: "U",
  BRAND_NAME: "UPWORK BID TRACKER",
  BRAND_TAGLINE: "Your pipeline, simplified",
  ARIA_PREVIOUS_SLIDE: "Previous slide",
  ARIA_NEXT_SLIDE: "Next slide",
} as const;

export function loginPreviewAriaGoToSlide(index: number): string {
  return `Go to slide ${index + 1}`;
}

export const PREVIEW_SLIDE_1 = {
  TITLE: "Welcome back",
  BODY: "Proposals, replies, and outcomes in one place—pick up your Upwork pipeline where you left off.",
  PROPOSALS_SENT_LABEL: "Proposals sent",
  PROPOSALS_SENT_VALUE: "128",
  PROPOSALS_DELTA: "+14 vs last month",
  OFFER_HIRE_LABEL: "Offer → hire",
  DONUT_VALUE: "34%",
  DONUT_CAPTION: "Hired from offers",
  CTA_PLUS: "+",
  CTA_TITLE: "Log a proposal",
  CTA_BODY: "Job post, rate, and stage—keep the team aligned.",
} as const;

export const PREVIEW_SLIDE_2 = {
  TITLE: "Pipeline clarity",
  BODY: "See what is submitted, where clients replied, and how volume trends week to week.",
  CHART_LABEL: "Proposals logged",
  CHART_BADGE: "This week",
} as const;

/** Relative bar heights for the demo chart (percent of track). */
export const PREVIEW_BAR_HEIGHTS = [42, 68, 52, 88, 60, 78, 50] as const;

export const PREVIEW_SLIDE_3 = {
  TITLE: "Team timeline",
  BODY: "Invites, messages, and offers in order—no more digging through Upwork threads.",
  RECENT_EVENTS_LABEL: "Recent events",
  BOOKED_LABEL: "Booked (MTD)",
  BOOKED_VALUE: "$12.4k",
  BOOKED_CAPTION: "Fixed & hourly, net of fees",
  REPLY_LABEL: "Avg. first reply",
  REPLY_VALUE: "Under 24h",
  REPLY_CAPTION: "To client messages on active threads.",
} as const;

export type TimelinePreviewRow = {
  readonly label: string;
  readonly time: string;
  readonly progressWidth: string;
};

export const TIMELINE_PREVIEW_EVENTS: readonly TimelinePreviewRow[] = [
  { label: "Proposal · React dashboard", time: "2h ago", progressWidth: "92%" },
  { label: "Invite · API integration", time: "Yesterday", progressWidth: "64%" },
  { label: "Offer · $2.8k fixed", time: "Mon", progressWidth: "100%" },
  { label: "Reply · Brand marketing site", time: "4h ago", progressWidth: "78%" },
  { label: "Interview · SaaS analytics", time: "Tue", progressWidth: "55%" },
  { label: "Contract · Mobile MVP", time: "Wed", progressWidth: "88%" },
] as const;
