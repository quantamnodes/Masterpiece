import { ReactNode, useEffect } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export function Layout({ children }: { children: ReactNode }) {
  // Force dark mode globally for the brutalist luxury aesthetic
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <div className="min-h-screen flex flex-col relative bg-background text-foreground overflow-x-hidden selection:bg-primary selection:text-primary-foreground">
      {/* Subtle ambient grid background */}
      <div className="fixed inset-0 bg-grid-pattern pointer-events-none z-0 opacity-40"></div>
      
      {/* Global subtle radial gradient for depth */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(0,240,255,0.05),transparent_50%)] pointer-events-none z-0"></div>

      <Navbar />
      <main className="flex-1 relative z-10 pt-20">
        {children}
      </main>
      <Footer />
    </div>
  );
}
