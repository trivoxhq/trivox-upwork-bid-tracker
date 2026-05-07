"use client";

import { motion } from "framer-motion";
import { buttonMotion } from "@/components/ui/motion";

type ButtonProps = {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
};

export default function Button({
  children,
  variant = "primary",
  onClick,
  type = "button",
}: ButtonProps) {
  const baseClasses =
    "inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-semibold transition-colors duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-brand-primary/30";

  const variantClasses =
    variant === "secondary"
      ? "border-border bg-bg-primary text-text-primary hover:bg-bg-secondary"
      : "border-brand-primary bg-brand-primary text-white hover:border-brand-hover hover:bg-brand-hover";

  return (
    <motion.button
      type={type}
      onClick={onClick}
      className={`${baseClasses} ${variantClasses}`}
      whileHover={buttonMotion.whileHover}
      whileTap={buttonMotion.whileTap}
      transition={buttonMotion.transition}
    >
      {children}
    </motion.button>
  );
}
