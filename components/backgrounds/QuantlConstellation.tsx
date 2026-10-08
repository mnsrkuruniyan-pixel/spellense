"use client";

import React, { useEffect, useRef } from "react";

export default function QuantlConstellation() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let mouse = {
      x: width * 0.5,
      y: height * 0.4,
      targetX: width * 0.5,
      targetY: height * 0.4,
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initBlobs();
      initParticles();
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);

    // ==========================================
    // 1. SOFT LIGHT-BLUE AMBIENT AURORA PATCHES
    // ==========================================
    interface AmbientBlob {
      x: number;
      y: number;
      baseX: number;
      baseY: number;
      radius: number;
      vx: number;
      vy: number;
      color: string;
      phase: number;
    }

    let blobs: AmbientBlob[] = [];

    const initBlobs = () => {
      blobs = [
        {
          x: width * 0.25,
          y: height * 0.3,
          baseX: width * 0.25,
          baseY: height * 0.3,
          radius: Math.min(width, height) * 0.55,
          vx: 0.25,
          vy: 0.18,
          color: "rgba(186, 230, 253, 0.55)", // Sky 200 light blue patch
          phase: 0,
        },
        {
          x: width * 0.75,
          y: height * 0.4,
          baseX: width * 0.75,
          baseY: height * 0.4,
          radius: Math.min(width, height) * 0.6,
          vx: -0.22,
          vy: 0.26,
          color: "rgba(191, 219, 254, 0.45)", // Blue 200 light blue patch
          phase: Math.PI * 0.5,
        },
        {
          x: width * 0.5,
          y: height * 0.75,
          baseX: width * 0.5,
          baseY: height * 0.75,
          radius: Math.min(width, height) * 0.65,
          vx: 0.18,
          vy: -0.2,
          color: "rgba(224, 242, 254, 0.65)", // Sky 100 soft aura
          phase: Math.PI,
        },
        {
          x: width * 0.85,
          y: height * 0.85,
          baseX: width * 0.85,
          baseY: height * 0.85,
          radius: Math.min(width, height) * 0.45,
          vx: -0.15,
          vy: -0.15,
          color: "rgba(199, 210, 254, 0.35)", // Indigo 200 gentle blush
          phase: Math.PI * 1.5,
        },
      ];
    };

    // ==========================================
    // 2. INTERACTIVE CONSTELLATION NODES
    // ==========================================
    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      baseAlpha: number;
    }

    let particles: Particle[] = [];

    const initParticles = () => {
      particles = [];
      const count = Math.floor((width * height) / 13000);
      for (let i = 0; i < Math.min(count, 80); i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.55,
          vy: (Math.random() - 0.5) * 0.55,
          size: Math.random() * 2 + 1.2,
          baseAlpha: Math.random() * 0.28 + 0.16,
        });
      }
    };

    initBlobs();
    initParticles();

    const maxDist = 140;
    let time = 0;

    const render = () => {
      time += 0.008;

      // Smooth mouse follow
      mouse.x += (mouse.targetX - mouse.x) * 0.04;
      mouse.y += (mouse.targetY - mouse.y) * 0.04;

      ctx.clearRect(0, 0, width, height);

      // 1. Crisp White / Airy Ice-White Base
      ctx.fillStyle = "#f8faff";
      ctx.fillRect(0, 0, width, height);

      // 2. Render Soft Floating Light-Blue Aurora Patches
      blobs.forEach((blob) => {
        blob.phase += 0.006;
        const floatX = Math.sin(blob.phase) * 60;
        const floatY = Math.cos(blob.phase * 0.8) * 50;
        const curX = blob.baseX + floatX;
        const curY = blob.baseY + floatY;

        const grad = ctx.createRadialGradient(curX, curY, 0, curX, curY, blob.radius);
        grad.addColorStop(0, blob.color);
        grad.addColorStop(0.5, blob.color.replace(/[\d\.]+\)$/, "0.15)"));
        grad.addColorStop(1, "rgba(255, 255, 255, 0)");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(curX, curY, blob.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // 3. Interactive Mouse Spotlight Glow (Soft sky blue following cursor)
      const mouseGlow = ctx.createRadialGradient(
        mouse.x,
        mouse.y,
        0,
        mouse.x,
        mouse.y,
        380
      );
      mouseGlow.addColorStop(0, "rgba(56, 189, 248, 0.22)"); // Sky 400 soft glow
      mouseGlow.addColorStop(0.5, "rgba(147, 197, 253, 0.08)");
      mouseGlow.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = mouseGlow;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 380, 0, Math.PI * 2);
      ctx.fill();

      // 4. Connect Constellation Lines Between Particles
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];

        // Move
        p1.x += p1.vx;
        p1.y += p1.vy;

        // Bounce screen edges
        if (p1.x < 0 || p1.x > width) p1.vx *= -1;
        if (p1.y < 0 || p1.y > height) p1.vy *= -1;

        // Interactive mouse magnetic influence
        const dxM = mouse.x - p1.x;
        const dyM = mouse.y - p1.y;
        const distM = Math.sqrt(dxM * dxM + dyM * dyM);
        if (distM < 180) {
          const force = (1 - distM / 180) * 1.8;
          p1.x -= (dxM / distM) * force;
          p1.y -= (dyM / distM) * force;
        }

        // Connect to peers
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.22;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(0, 85, 254, ${alpha})`; // Spellense royal blue lines
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }

        // Draw particle dot
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, p1.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 85, 254, ${p1.baseAlpha})`;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none -z-10 block w-full h-full"
    />
  );
}
