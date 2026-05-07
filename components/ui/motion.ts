export const motionTransition = {
  duration: 0.25,
  ease: "easeOut" as const,
};

export const fadeSlideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: motionTransition,
};

export const pageTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: {
    duration: 0.2,
    ease: "easeOut" as const,
  },
};

export const modalAnimation = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  transition: motionTransition,
};

export const buttonMotion = {
  whileHover: { scale: 1.03 },
  whileTap: { scale: 0.97 },
  transition: {
    duration: 0.2,
    ease: "easeOut" as const,
  },
};
