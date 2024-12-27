import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function Splash({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    // Trigger the completion callback after animation
    const timer = setTimeout(() => {
      onComplete();
    }, 2000); // 2 seconds total duration

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 flex items-center justify-center bg-background"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="text-4xl md:text-6xl font-bold text-primary"
      >
        PoetPortal
      </motion.div>
    </motion.div>
  );
}