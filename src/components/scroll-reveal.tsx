import { useEffect } from "react";
import "@/css/scroll-reveal.css";

// Target presentation content, leaving forms, dialogs and navigation stable.
const TARGETS = [
  ".journey-hero-content > *", ".journey-section-kicker",
  ".journey-connect-intro", ".journey-updates-title", ".journey-concierge",
  ".home-banner", ".home-category-link", ".tour-card", ".news-card",
  ".service-grid > a", ".app-route h1", ".app-route h2",
].join(",");

export default function ScrollReveal() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".app-content");
    if (!root || !("IntersectionObserver" in window)) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const seen = new WeakSet<Element>();
    const observed = new Set<HTMLElement>();
    const pending = new Set<HTMLElement>();
    const reveal = (element: HTMLElement, delay = 0) => {
      pending.delete(element);
      element.classList.remove("scroll-reveal-pending");
      if (!motion.matches && !element.matches(":focus-within")) {
        element.style.setProperty("--reveal-delay", `${delay}ms`);
        element.classList.add("scroll-reveal-enter");
      }
    };
    const observer = new IntersectionObserver(entries => {
      let index = 0;
      entries.forEach(entry => {
        if (entry.isIntersecting && pending.has(entry.target as HTMLElement)) reveal(entry.target as HTMLElement, Math.min(index++, 3) * 70);
      });
    }, { root, threshold: 0, rootMargin: "0px 0px -24px 0px" });
    // Rearm after scrolling back above a block. The extra margin keeps the
    // entrance's 28px translation from triggering a reset at the viewport edge.
    const resetObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const element = entry.target as HTMLElement;
        if (entry.isIntersecting || !entry.rootBounds || entry.boundingClientRect.top < entry.rootBounds.bottom || motion.matches || element.matches(":focus-within")) return;
        element.classList.remove("scroll-reveal-enter");
        element.style.removeProperty("--reveal-delay");
        element.classList.add("scroll-reveal-pending");
        pending.add(element);
      });
    }, { root, threshold: 0, rootMargin: "0px 0px 64px 0px" });

    const scan = () => {
      root.querySelectorAll<HTMLElement>(TARGETS).forEach(element => {
        if (seen.has(element)) return;
        // Avoid animating nested content twice and transforming fixed dialogs.
        if (element.parentElement?.closest(TARGETS) || element.closest("dialog, [role=dialog]")) return;
        seen.add(element);
        if (motion.matches || element.matches(":focus-within")) return;
        pending.add(element);
        element.classList.add("scroll-reveal-pending");
        observed.add(element);
        observer.observe(element);
        resetObserver.observe(element);
      });
      for (const element of observed) {
        if (!root.contains(element)) {
          observer.unobserve(element);
          resetObserver.unobserve(element);
          observed.delete(element);
          pending.delete(element);
          seen.delete(element);
        }
      }
    };
    const finish = (event: Event) => {
      if (event.target instanceof HTMLElement && (event as AnimationEvent).animationName === "scroll-reveal-up") {
        event.target.classList.remove("scroll-reveal-enter");
        event.target.style.removeProperty("--reveal-delay");
      }
    };
    const focus = (event: Event) => {
      if (!(event.target instanceof Element)) return;
      const element = event.target.closest<HTMLElement>(".scroll-reveal-pending, .scroll-reveal-enter");
      if (element) { reveal(element); element.classList.remove("scroll-reveal-enter"); }
    };
    const reduce = () => {
      if (!motion.matches) return;
      for (const element of pending) reveal(element);
      root.querySelectorAll(".scroll-reveal-enter").forEach(element => element.classList.remove("scroll-reveal-enter"));
    };
    // Also discover lazy route content and cards loaded asynchronously.
    const mutations = new MutationObserver(scan);
    mutations.observe(root, { childList: true, subtree: true });
    root.addEventListener("animationend", finish);
    root.addEventListener("focusin", focus);
    motion.addEventListener("change", reduce);
    scan();
    return () => {
      observer.disconnect();
      resetObserver.disconnect();
      mutations.disconnect();
      root.removeEventListener("animationend", finish);
      root.removeEventListener("focusin", focus);
      motion.removeEventListener("change", reduce);
      root.querySelectorAll<HTMLElement>(".scroll-reveal-pending, .scroll-reveal-enter").forEach(element => {
        element.classList.remove("scroll-reveal-pending", "scroll-reveal-enter");
        element.style.removeProperty("--reveal-delay");
      });
    };
  }, []);
  return null;
}
