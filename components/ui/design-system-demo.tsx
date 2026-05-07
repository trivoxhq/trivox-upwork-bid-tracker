"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";
import Modal from "@/components/ui/modal";
import { fadeSlideUp, pageTransition } from "@/components/ui/motion";

export default function DesignSystemDemo() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <motion.main
      className="mx-auto w-full max-w-4xl p-6 md:p-10"
      initial={pageTransition.initial}
      animate={pageTransition.animate}
      transition={pageTransition.transition}
    >
      <Card
        title="Dashboard Card"
        description="Clean SaaS surface, subtle border, and fast motion."
      >
        <div className="flex flex-wrap gap-3 pb-4">
          <Button>Primary Action</Button>
          <Button variant="secondary">Secondary Action</Button>
          <Button variant="secondary" onClick={() => setIsModalOpen(true)}>
            Open Modal
          </Button>
        </div>

        <div className="mt-2">
          <label className="mb-2 block text-sm font-semibold text-text-primary">
            Search Project
          </label>
          <input
            className="w-full rounded-md border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none transition-shadow duration-200 ease-out focus:ring-2 focus:ring-brand-primary/30"
            placeholder="Type to search..."
          />
        </div>

        <div className="mt-5">
          <Button
            variant="secondary"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
          >
            Toggle Dropdown
          </Button>
          <AnimatePresence>
            {isDropdownOpen ? (
              <motion.div
                className="mt-3 w-56 rounded-md border border-border bg-bg-primary p-2 shadow-sm"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <p className="rounded px-2 py-1 text-sm text-text-secondary hover:bg-bg-secondary">
                  Profile
                </p>
                <p className="rounded px-2 py-1 text-sm text-text-secondary hover:bg-bg-secondary">
                  Settings
                </p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </Card>

      <motion.section
        className="mt-6 rounded-lg border border-border bg-bg-primary shadow-sm"
        initial={fadeSlideUp.initial}
        animate={fadeSlideUp.animate}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <div className="border-b border-border p-4">
          <h3 className="text-sm font-semibold text-text-primary">Recent Bids</h3>
          <p className="text-xs text-text-secondary">Table row hover demo</p>
        </div>
        <div className="p-2">
          <div className="rounded-md px-3 py-2 text-sm text-text-primary transition-colors duration-200 ease-out hover:bg-bg-secondary">
            Frontend Developer - Proposal Sent
          </div>
          <div className="rounded-md px-3 py-2 text-sm text-text-primary transition-colors duration-200 ease-out hover:bg-bg-secondary">
            API Integration - Interview Scheduled
          </div>
        </div>
      </motion.section>

      <Modal
        open={isModalOpen}
        title="Create New Bid"
        description="This modal uses a subtle scale + fade animation for smooth UX."
        onClose={() => setIsModalOpen(false)}
      />
    </motion.main>
  );
}
