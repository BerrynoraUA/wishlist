"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { easeOut } from "./motion";

type Props = {
  children: ReactNode;
  className?: string;
  /** Position in a group; each step adds 60ms. */
  index?: number;
  as?: "div" | "li";
};

/**
 * Fades a block in with a 16px rise the first time it scrolls into view,
 * like the app's FadeInDown entering animation. Reduced motion keeps the fade.
 */
export function Reveal({ children, className, index = 0, as = "div" }: Props) {
  const Tag = as === "li" ? motion.li : motion.div;

  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -60px 0px" }}
      transition={{ duration: 0.25, ease: easeOut, delay: index * 0.06 }}
    >
      {children}
    </Tag>
  );
}
