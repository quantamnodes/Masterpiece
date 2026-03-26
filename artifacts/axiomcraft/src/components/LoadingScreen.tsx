import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const BOOT_LINES = [
  "AXIOMCRAFT OS v3.7.1",
  "Initializing hardware abstraction layer...",
  "Loading product catalog...",
  "Establishing secure channel...",
  "Calibrating precision systems...",
  "ACCESS GRANTED",
];

function useTypewriter(text: string, speed = 30, start = false) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    if (!start) return;
    setDisplayed("");
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed, start]);
  return displayed;
}

function BootLine({ text, delay, onDone }: { text: string; delay: number; onDone?: () => void }) {
  const [active, setActive] = useState(false);
  const [done, setDone] = useState(false);
  const speed = 18;

  useEffect(() => {
    const t = setTimeout(() => setActive(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const displayed = useTypewriter(text, speed, active);

  useEffect(() => {
    if (active && displayed === text) {
      setDone(true);
      onDone?.();
    }
  }, [displayed, text, active, onDone]);

  if (!active) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`font-mono text-xs leading-relaxed ${
        text.startsWith("AXIOMCRAFT") || text === "ACCESS GRANTED"
          ? "text-primary font-bold"
          : done
          ? "text-muted-foreground"
          : "text-foreground/70"
      }`}
    >
      <span className="text-primary/40 mr-2 select-none">{">"}</span>
      {displayed}
      {active && !done && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ repeat: Infinity, duration: 0.5 }}
          className="inline-block w-1.5 h-3 bg-primary ml-0.5 align-middle"
        />
      )}
    </motion.div>
  );
}

export function LoadingScreen({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [logoPhase, setLogoPhase] = useState<"idle" | "typing" | "done">("idle");
  const [scanY, setScanY] = useState(0);
  const [gridVisible, setGridVisible] = useState(false);
  const progressRef = useRef(0);

  const LOGO_TEXT = "AXIOMCRAFT";
  const [logoDisplayed, setLogoDisplayed] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      setGridVisible(true);
      setLogoPhase("typing");
    }, 200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (logoPhase !== "typing") return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setLogoDisplayed(LOGO_TEXT.slice(0, i));
      if (i >= LOGO_TEXT.length) {
        clearInterval(id);
        setLogoPhase("done");
      }
    }, 60);
    return () => clearInterval(id);
  }, [logoPhase]);

  useEffect(() => {
    const id = setInterval(() => {
      setScanY((y) => (y >= 105 ? -5 : y + 0.8));
    }, 16);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const start = Date.now();
    const duration = 2800;
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, Math.floor((elapsed / duration) * 100));
      progressRef.current = pct;
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(id);
        setTimeout(() => {
          setExiting(true);
          setTimeout(onComplete, 900);
        }, 350);
      }
    }, 16);
    return () => clearInterval(id);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {!exiting ? (
        <motion.div
          key="loader"
          className="fixed inset-0 z-[9999] bg-[#050505] flex flex-col items-center justify-center overflow-hidden"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Scanning line */}
          <div
            className="absolute inset-x-0 pointer-events-none z-10"
            style={{ top: `${scanY}%`, height: "2px" }}
          >
            <div className="w-full h-full bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          </div>

          {/* Grid overlay */}
          <AnimatePresence>
            {gridVisible && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(0,240,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.025) 1px, transparent 1px)",
                  backgroundSize: "60px 60px",
                }}
              />
            )}
          </AnimatePresence>

          {/* Corner accents */}
          {[
            "top-6 left-6 border-t border-l",
            "top-6 right-6 border-t border-r",
            "bottom-6 left-6 border-b border-l",
            "bottom-6 right-6 border-b border-r",
          ].map((cls, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + i * 0.05, duration: 0.4 }}
              className={`absolute w-8 h-8 border-primary/40 ${cls}`}
            />
          ))}

          {/* Main content */}
          <div className="relative z-20 flex flex-col items-center gap-10 w-full max-w-lg px-8">
            {/* Logo */}
            <div className="text-center">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="font-mono text-xs text-primary/60 tracking-[0.4em] mb-3 uppercase"
              >
                System Online
              </motion.div>

              <div className="relative">
                <h1
                  className="font-heading font-black uppercase tracking-tight text-6xl md:text-7xl text-white select-none"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  {logoDisplayed.slice(0, 5)}
                  <span className="text-primary">{logoDisplayed.slice(5)}</span>
                  {logoPhase === "typing" && (
                    <motion.span
                      animate={{ opacity: [1, 0] }}
                      transition={{ repeat: Infinity, duration: 0.4 }}
                      className="inline-block w-1 h-14 md:h-16 bg-primary ml-1 align-middle"
                    />
                  )}
                </h1>

                {/* Glitch layer */}
                {logoPhase === "done" && (
                  <>
                    <motion.div
                      className="absolute inset-0 font-heading font-black uppercase text-6xl md:text-7xl text-primary/20 select-none pointer-events-none"
                      style={{ letterSpacing: "-0.02em" }}
                      animate={{
                        x: [0, -3, 3, 0, 0],
                        opacity: [0, 0.8, 0.8, 0, 0],
                        clipPath: [
                          "inset(0 0 85% 0)",
                          "inset(10% 0 70% 0)",
                          "inset(40% 0 30% 0)",
                          "inset(0 0 85% 0)",
                          "inset(0 0 85% 0)",
                        ],
                      }}
                      transition={{
                        duration: 0.2,
                        repeat: Infinity,
                        repeatDelay: 2.8,
                        ease: "linear",
                      }}
                    >
                      AXIOM<span className="text-primary">CRAFT</span>
                    </motion.div>
                    <motion.div
                      className="absolute inset-0 font-heading font-black uppercase text-6xl md:text-7xl text-red-500/20 select-none pointer-events-none"
                      style={{ letterSpacing: "-0.02em" }}
                      animate={{
                        x: [0, 3, -3, 0, 0],
                        opacity: [0, 0.6, 0.6, 0, 0],
                        clipPath: [
                          "inset(75% 0 0 0)",
                          "inset(60% 0 20% 0)",
                          "inset(80% 0 0 0)",
                          "inset(75% 0 0 0)",
                          "inset(75% 0 0 0)",
                        ],
                      }}
                      transition={{
                        duration: 0.2,
                        repeat: Infinity,
                        repeatDelay: 2.8,
                        delay: 0.05,
                        ease: "linear",
                      }}
                    >
                      AXIOM<span>CRAFT</span>
                    </motion.div>
                  </>
                )}
              </div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: logoPhase === "done" ? 1 : 0 }}
                transition={{ duration: 0.5 }}
                className="font-mono text-xs text-muted-foreground tracking-[0.3em] mt-3 uppercase"
              >
                Premium Hardware · Est. 2024
              </motion.p>
            </div>

            {/* Boot log terminal */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="w-full border border-border/40 bg-black/60 rounded-sm p-4 min-h-[112px] space-y-1"
            >
              {BOOT_LINES.map((line, i) => (
                <BootLine
                  key={line}
                  text={line}
                  delay={400 + i * 350}
                />
              ))}
            </motion.div>

            {/* Progress bar */}
            <div className="w-full space-y-2">
              <div className="flex justify-between items-center font-mono text-xs text-muted-foreground">
                <span className="uppercase tracking-widest">Initializing</span>
                <motion.span
                  key={progress}
                  className="text-primary tabular-nums"
                >
                  {progress.toString().padStart(3, "0")}%
                </motion.span>
              </div>
              <div className="h-[2px] bg-border/40 w-full overflow-hidden rounded-full">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary/60 via-primary to-primary/60 rounded-full"
                  style={{ width: `${progress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              {/* Progress tick marks */}
              <div className="flex gap-[3px] mt-1">
                {Array(20).fill(0).map((_, i) => (
                  <motion.div
                    key={i}
                    className="flex-1 h-[3px] rounded-full"
                    animate={{
                      backgroundColor: progress >= (i + 1) * 5 ? "rgb(0,240,255)" : "rgba(255,255,255,0.08)",
                    }}
                    transition={{ duration: 0.1 }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Bottom status bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="absolute bottom-6 left-0 right-0 px-8 flex justify-between items-center font-mono text-xs text-muted-foreground/50"
          >
            <span>SEC-CHANNEL: ENCRYPTED</span>
            <span className="hidden sm:block">BUILD: 3.7.1-STABLE</span>
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              ● LIVE
            </motion.span>
          </motion.div>
        </motion.div>
      ) : (
        /* Exit: top and bottom panels slide apart */
        <motion.div
          key="exit"
          className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden"
        >
          <motion.div
            className="absolute inset-x-0 top-0 bg-[#050505]"
            initial={{ height: "50%" }}
            animate={{ height: 0, top: 0 }}
            transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
          />
          <motion.div
            className="absolute inset-x-0 bottom-0 bg-[#050505]"
            initial={{ height: "50%" }}
            animate={{ height: 0, bottom: 0 }}
            transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
          />
          {/* Cyan slice flash */}
          <motion.div
            className="absolute inset-x-0 bg-primary/20"
            style={{ top: "50%", height: "1px", translateY: "-50%" }}
            initial={{ scaleX: 1, opacity: 1 }}
            animate={{ scaleX: 0, opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
