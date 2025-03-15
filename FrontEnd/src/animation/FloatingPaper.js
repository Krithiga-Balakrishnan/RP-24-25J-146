"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileText } from "lucide-react";

export function FloatingPaper({ count = 10 }) {
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });

  useEffect(() => {
    // Update dimensions on client side
    setDimensions({
      width: window.innerWidth,
      height: window.innerHeight,
    });

    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="relative w-full h-full">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          initial={{
            x: Math.random() * dimensions.width,
            y: Math.random() * dimensions.height,
          }}
          animate={{
            x: [
              Math.random() * dimensions.width,
              Math.random() * dimensions.width,
              Math.random() * dimensions.width,
            ],
            y: [
              Math.random() * dimensions.height,
              Math.random() * dimensions.height,
              Math.random() * dimensions.height,
            ],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20 + Math.random() * 10,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
        >
          <div className="relative w-28 h-32 flex items-center justify-center transform hover:scale-110 transition-transform">
            <FileText
              className="w-28 h-28"
              strokeWidth={0}
              fill="var(--secondary-color)"
              // Alternatively, if you want to override the fill via inline style:
              // style={{ color: "var(--secondary-color)" }}
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
