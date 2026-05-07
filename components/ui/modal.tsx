"use client";

import { AnimatePresence, motion } from "framer-motion";
import { modalAnimation } from "@/components/ui/motion";
import Button from "@/components/ui/button";

type ModalProps = {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
};

export default function Modal({ open, title, description, onClose }: ModalProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <motion.div
            className="w-full max-w-md rounded-lg border border-border bg-bg-primary p-6 shadow-sm"
            initial={modalAnimation.initial}
            animate={modalAnimation.animate}
            exit={modalAnimation.initial}
            transition={modalAnimation.transition}
          >
            <h3 className="text-lg font-bold text-text-primary">{title}</h3>
            <p className="mt-2 text-sm text-text-secondary">{description}</p>
            <div className="mt-5 flex justify-end">
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
