import { ReactNode, useEffect } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export function Layout({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.07, rootMargin: "0px 0px -48px 0px" }
    );

    const refresh = () => {
      document.querySelectorAll(".page-container > *").forEach((el, i) => {
        if (el.hasAttribute("data-reveal")) return;
        el.setAttribute("data-reveal", "");
        if (i > 0) {
          (el as HTMLElement).style.transitionDelay = `${Math.min(i * 0.08, 0.24)}s`;
        }
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom >= 0) {
          el.classList.add("in-view");
        } else {
          observer.observe(el);
        }
      });
    };

    refresh();
    const mutObs = new MutationObserver(refresh);
    mutObs.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutObs.disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col relative bg-background text-foreground overflow-x-hidden selection:bg-primary selection:text-primary-foreground">
      <div className="fixed inset-0 bg-grid-pattern pointer-events-none z-0 opacity-40"></div>
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(0,240,255,0.05),transparent_50%)] pointer-events-none z-0"></div>
      <Navbar />
      <main className="flex-1 relative z-10 pt-20">
        {children}
      </main>
      <Footer />
    </div>
  );
}
