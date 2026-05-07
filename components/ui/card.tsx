"use client";

import { motion } from "framer-motion";
import { fadeSlideUp } from "@/components/ui/motion";

type CardProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export default function Card({ title, description, children }: CardProps) {
  return (
    <motion.section
      className="rounded-lg border border-border bg-bg-secondary p-6 shadow-sm"
      initial={fadeSlideUp.initial}
      animate={fadeSlideUp.animate}
      transition={fadeSlideUp.transition}
    >
      <h2 className="text-lg font-bold text-text-primary">{title}</h2>
      {description ? (
        <p className="mt-2 text-sm text-text-secondary">{description}</p>
      ) : null}
      <div className="mt-5">{children}</div>
    </motion.section>
  );
}
