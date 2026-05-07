"use client";

import { FormEvent, Suspense, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { AuthSessionOverlay } from "@/components/auth/auth-session-overlay";
import { AUTH_SESSION_OVERLAY } from "@/components/auth/constants";
import {
  LOGIN_API,
  LOGIN_FORM_COPY,
  LOGIN_ROUTES,
  LOGIN_VALIDATION_MESSAGES,
} from "@/app/login/constants";
import {
  cardAnimation,
  inputAnimation,
  inputContainerAnimation,
  pageAnimation,
} from "@/app/login/motion-presets";
import type { LoginResponse } from "@/app/login/types";
import { LoginPreviewCarousel } from "@/components/login/LoginPreviewCarousel";
import { LoginOfficeNotice } from "@/app/login/login-office-notice";
import { LoginReauthNotice } from "@/app/login/login-reauth-notice";
import { ThemeCycleButton } from "@/components/theme/theme-cycle-button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  /** `idle` → `submitting` (request) → `redirecting` (navigation; stays until route unmounts). */
  const [authPhase, setAuthPhase] = useState<"idle" | "submitting" | "redirecting">("idle");

  const isBusy = authPhase !== "idle";
  const overlayMessage =
    authPhase === "redirecting"
      ? AUTH_SESSION_OVERLAY.LOGIN_REDIRECT
      : AUTH_SESSION_OVERLAY.LOGIN_SUBMIT;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim()) {
      setErrorMessage(LOGIN_VALIDATION_MESSAGES.EMAIL_REQUIRED);
      return;
    }

    if (!password) {
      setErrorMessage(LOGIN_VALIDATION_MESSAGES.PASSWORD_REQUIRED);
      return;
    }

    setErrorMessage("");
    setAuthPhase("submitting");

    try {
      const response = await fetch(LOGIN_API.LOGIN, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = (await response.json().catch(() => null)) as LoginResponse | null;

      if (!response.ok) {
        setErrorMessage(data?.message ?? LOGIN_VALIDATION_MESSAGES.LOGIN_FAILED);
        setAuthPhase("idle");
        return;
      }

      setAuthPhase("redirecting");
      router.refresh();
      router.push(LOGIN_ROUTES.DASHBOARD);
    } catch {
      setErrorMessage(LOGIN_VALIDATION_MESSAGES.NETWORK_ERROR);
      setAuthPhase("idle");
    }
  };

  const inputBaseClass =
    "w-full rounded-md border bg-bg-secondary py-2.5 pl-11 pr-4 text-sm text-text-primary outline-none transition-[border-color,box-shadow] duration-200 ease-out placeholder:text-text-secondary/60 focus:border-brand-primary focus:ring-2 focus:ring-green-100 dark:bg-bg-primary dark:focus:ring-brand-primary/25 disabled:cursor-not-allowed disabled:opacity-60";
  const inputErrorClass = errorMessage
    ? "border-danger focus:border-danger focus:ring-red-100 dark:focus:ring-danger/30"
    : "border-input-border";

  return (
    <motion.main
      className="min-h-dvh bg-bg-primary supports-[min-height:100dvh]:min-h-dvh dark:bg-bg-secondary lg:min-h-screen"
      initial={pageAnimation.initial}
      animate={pageAnimation.animate}
      transition={pageAnimation.transition}
    >
      <div className="w-full">
        <section className="grid min-h-dvh w-full grid-cols-1 overflow-x-clip bg-bg-primary supports-[min-height:100dvh]:min-h-dvh dark:bg-bg-secondary lg:min-h-screen lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
          <div className="relative hidden min-h-0 flex-col border-r border-border/70 bg-linear-to-br from-[#eef2ed] via-[#f7f9f7] to-[#e8edf1] dark:border-border dark:from-[#1a1a1a] dark:via-[#171717] dark:to-[#141414] lg:flex lg:pb-[max(3rem,env(safe-area-inset-bottom))] lg:pt-[max(1.25rem,env(safe-area-inset-top))] xl:pb-[max(3.5rem,env(safe-area-inset-bottom))]">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_24%_18%,rgba(16,138,0,0.14),transparent_56%)] dark:bg-[radial-gradient(ellipse_90%_70%_at_24%_18%,rgb(16_163_127_/0.12),transparent_58%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_78%_84%,rgba(55,138,221,0.12),transparent_65%)] dark:bg-[radial-gradient(ellipse_70%_60%_at_78%_84%,rgb(255_255_255_/0.04),transparent_65%)]" />
            <div className="pointer-events-none absolute left-[10%] top-6 h-20 w-20 rounded-full bg-brand-primary/10 blur-2xl dark:bg-[rgb(16_163_127_/0.12)] sm:left-10 sm:top-8 sm:h-24 sm:w-24 lg:top-8" />
            <div className="pointer-events-none absolute -right-16 top-0 hidden h-full w-28 rotate-6 bg-bg-primary/95 dark:bg-bg-primary/90 lg:block" />
            <div className="relative flex min-h-0 flex-1 flex-col px-6 py-10 lg:min-h-[min(100dvh,680px)] lg:px-10 xl:min-h-[min(760px,calc(100dvh-2rem))] xl:px-14 2xl:px-16">
              <LoginPreviewCarousel />
            </div>
          </div>

          <div
            className="relative flex min-h-0 items-center justify-center bg-bg-primary px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8 sm:pb-12 sm:pt-14 lg:px-10 xl:px-12"
            aria-labelledby="login-heading"
          >
            <div className="pointer-events-auto absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-20 sm:right-6 sm:top-[max(1rem,env(safe-area-inset-top))]">
              <ThemeCycleButton iconOnly className="border-border/70 shadow-md" />
            </div>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_70%_15%,rgba(16,138,0,0.05),transparent_55%)] dark:bg-[radial-gradient(ellipse_70%_40%_at_70%_15%,rgb(255_255_255_/0.04),transparent_55%)]" />
            <motion.section
              className="relative z-10 mx-auto w-full max-w-[420px]"
              initial={cardAnimation.initial}
              animate={cardAnimation.animate}
              transition={cardAnimation.transition}
            >
              <Suspense fallback={null}>
                <LoginOfficeNotice />
                <LoginReauthNotice />
              </Suspense>
              <header className="mb-6 sm:mb-8">
                <h1
                  id="login-heading"
                  className="text-[1.625rem] font-bold tracking-tight text-text-primary sm:text-[2.25rem] sm:leading-tight"
                >
                  {LOGIN_FORM_COPY.TITLE}
                </h1>
                <p className="mt-2 max-w-prose text-sm leading-relaxed text-text-secondary md:text-[0.9375rem]">
                  {LOGIN_FORM_COPY.SUBTITLE}
                </p>
              </header>

              <form
                onSubmit={handleSubmit}
                noValidate
                className="space-y-5"
                aria-busy={isBusy}
              >
                <motion.div
                  className="space-y-5"
                  initial={inputContainerAnimation.initial}
                  animate={inputContainerAnimation.animate}
                >
                  <motion.div
                    className="space-y-1.5"
                    initial={inputAnimation.initial}
                    animate={inputAnimation.animate}
                    transition={inputAnimation.transition}
                  >
                    <label htmlFor="email" className="text-sm font-semibold text-text-primary">
                      {LOGIN_FORM_COPY.EMAIL_LABEL}
                    </label>
                    <div className="relative">
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => {
                          setEmail(event.target.value);
                          if (errorMessage) setErrorMessage("");
                        }}
                        className={`${inputBaseClass} ${inputErrorClass} pr-4`}
                        placeholder={LOGIN_FORM_COPY.EMAIL_PLACEHOLDER}
                        required
                        disabled={isBusy}
                        aria-invalid={Boolean(errorMessage)}
                        aria-describedby={errorMessage ? "login-error" : undefined}
                      />
                      <span
                        className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-text-secondary"
                        aria-hidden
                      >
                        <svg
                          className="h-4 w-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect x="3" y="5" width="18" height="14" rx="2" />
                          <path d="m3 7 9 6 9-6" />
                        </svg>
                      </span>
                    </div>
                  </motion.div>

                  <motion.div
                    className="space-y-1.5"
                    initial={inputAnimation.initial}
                    animate={inputAnimation.animate}
                    transition={inputAnimation.transition}
                  >
                    <label htmlFor="password" className="text-sm font-semibold text-text-primary">
                      {LOGIN_FORM_COPY.PASSWORD_LABEL}
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => {
                          setPassword(event.target.value);
                          if (errorMessage) setErrorMessage("");
                        }}
                        className={`${inputBaseClass} ${inputErrorClass} pr-11`}
                        placeholder={LOGIN_FORM_COPY.PASSWORD_PLACEHOLDER}
                        required
                        disabled={isBusy}
                        aria-invalid={Boolean(errorMessage)}
                        aria-describedby={errorMessage ? "login-error" : undefined}
                      />
                      <span
                        className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-text-secondary"
                        aria-hidden
                      >
                        <svg
                          className="h-4 w-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect x="5" y="11" width="14" height="9" rx="2" />
                          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                        </svg>
                      </span>
                      <button
                        type="button"
                        className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1 text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={
                          showPassword
                            ? LOGIN_FORM_COPY.ARIA_HIDE_PASSWORD
                            : LOGIN_FORM_COPY.ARIA_SHOW_PASSWORD
                        }
                        disabled={isBusy}
                      >
                        {showPassword ? (
                          <svg
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            aria-hidden
                          >
                            <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A10.4 10.4 0 0 1 12 5c5 0 9.3 3.3 10 8-.2 1.2-.8 2.3-1.6 3.3M6.1 6.1C4.2 7.6 2.7 9.7 2 12c.7 2.3 2.2 4.4 4.2 5.9" />
                            <path d="M9.9 14.1A2 2 0 0 1 5 12c0-1.1.9-2 2-2 .4 0 .8.1 1.1.3" />
                          </svg>
                        ) : (
                          <svg
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            aria-hidden
                          >
                            <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-text-secondary">{LOGIN_FORM_COPY.PASSWORD_HELPER}</p>
                  </motion.div>
                </motion.div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-sm font-semibold text-brand-primary transition-opacity hover:opacity-80 focus:outline-none focus-visible:underline"
                  >
                    {LOGIN_FORM_COPY.FORGOT_PASSWORD}
                  </button>
                </div>

                <AnimatePresence>
                  {errorMessage ? (
                    <motion.p
                      id="login-error"
                      role="alert"
                      key="login-error"
                      className="rounded-md border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                      {errorMessage}
                    </motion.p>
                  ) : null}
                </AnimatePresence>

                <motion.button
                  type="submit"
                  disabled={isBusy}
                  className="touch-manipulation inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-brand-primary py-3 text-sm font-semibold text-white shadow-sm transition-colors duration-200 ease-out hover:bg-brand-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 sm:min-h-12"
                  whileHover={isBusy ? undefined : { scale: 1.02 }}
                  whileTap={isBusy ? undefined : { scale: 0.98 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  {isBusy ? (
                    <>
                      <span
                        className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/70 border-t-white"
                        aria-hidden
                      />
                      {authPhase === "redirecting"
                        ? AUTH_SESSION_OVERLAY.LOGIN_REDIRECT
                        : LOGIN_FORM_COPY.SUBMIT_LOADING}
                    </>
                  ) : (
                    LOGIN_FORM_COPY.SUBMIT
                  )}
                </motion.button>
              </form>
            </motion.section>
          </div>
        </section>
      </div>
      <AuthSessionOverlay open={isBusy} message={overlayMessage} />
    </motion.main>
  );
}
