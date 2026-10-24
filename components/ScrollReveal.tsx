"use client";

import React, { useEffect, useRef, useState } from "react";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  yOffset?: number;
  as?: "div" | "section" | "article";
  style?: React.CSSProperties;
}

export default function ScrollReveal({
  children,
  className = "",
  delay = 0,
  duration = 1200,
  yOffset = 32,
  as: Component = "div",
  style,
}: ScrollRevealProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      setIsVisible(true);
      return;
    }

    if (typeof window === "undefined") {
      setIsVisible(true);
      return;
    }

    // Accessibility check: user prefers reduced motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }

    // Immediately reveal if element is already in viewport or above the fold on initial load
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight || 800;
    if (rect.top <= vh * 0.95 && rect.bottom >= 0) {
      setIsVisible(true);
      return;
    }

    if (!("IntersectionObserver" in window)) {
      setIsVisible(true);
      return;
    }

    // Trigger when the element enters the viewport so user sees the slow, stunning fade in on all devices
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting || entry.intersectionRatio > 0) {
            setIsVisible(true);
            observer.unobserve(entry.target);
            break;
          }
        }
      },
      {
        threshold: 0.01,
        rootMargin: "0px 0px 50px 0px",
      }
    );

    observer.observe(el);

    // Backup scroll listener for smooth triggering across all browsers
    const handleScroll = () => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const currentVh = window.innerHeight || 800;
      if (r.top <= currentVh + 60 && r.bottom >= -50) {
        setIsVisible(true);
        window.removeEventListener("scroll", handleScroll);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Safety fallback: guaranteed reveal so elements at the bottom never stay blank
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1500);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", handleScroll);
      observer.disconnect();
    };
  }, []);

  const ComponentTag = Component as "div";

  return (
    <ComponentTag
      ref={ref}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible
          ? "translateY(0) scale(1)"
          : `translateY(${yOffset}px) scale(0.97)`,
        transition: `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        willChange: isVisible ? "auto" : "opacity, transform",
        ...style,
      }}
      className={className}
    >
      {children}
    </ComponentTag>
  );
}
