import { splashCursor } from "./fluid-cursor.js";

const preloader = document.querySelector(".portfolio-segment--preloader");
const hero = document.querySelector(".portfolio-segment--hero .ms-hero");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const coarsePointer = matchMedia("(pointer: coarse)");
const dismissPreloader = () => {
  if (!preloader || preloader.classList.contains("is-complete")) return;
  preloader.classList.add("is-complete");
  preloader.setAttribute("aria-hidden", "true");
};

if (reducedMotion.matches) {
  dismissPreloader();
} else {
  preloader?.querySelector("#mjp-hero-section")?.addEventListener("mjp:complete", dismissPreloader, { once: true });
  // The event marks the end of the bar-to-M animation. Only use this as a safety net.
  window.setTimeout(dismissPreloader, 10000);
}

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const href = link.getAttribute("href");
    const target = href === "#" ? document.getElementById("home") : document.querySelector(href);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", href === "#" ? "#home" : href);
  });
});

const startFluid = () => {
  if (reducedMotion.matches) return;
  if (document.documentElement.dataset.fluidStarted === "true") return;
  document.documentElement.dataset.fluidStarted = "true";

  const fluid = splashCursor({
    simResolution: coarsePointer.matches ? 64 : 96,
    dyeResolution: coarsePointer.matches ? 384 : 512,
    curl: 12,
    densityDissipation: 3,
    velocityDissipation: 2.4,
    splatForce: 6000,
    splatRadius: coarsePointer.matches ? 0.3 : 0.2,
    intensity: coarsePointer.matches ? 0.1 : 0.13,
    rainbow: true,
    colorUpdateSpeed: 10,
    idleStopMs: 4000,
    maxDpr: coarsePointer.matches ? 1.15 : 1.5,
    zIndex: 15000,
  });

  if (!fluid.canvas || !hero) return;

  /* Video scrubbing and the WebGL fluid both react to every mouse movement.
     Suspend only the fluid renderer while Contact is visible so the supplied
     character interaction keeps the same smooth response it has standalone. */
  const contact = document.querySelector("#ms-contact-root .ms-contact");
  let contactObserver = null;
  if (contact && "IntersectionObserver" in window) {
    let pausedBackgroundVideos = [];
    const suspendBackgroundMedia = () => {
      pausedBackgroundVideos = [...document.querySelectorAll("video")]
        .filter((video) => !contact.contains(video) && !video.paused && !video.ended);
      pausedBackgroundVideos.forEach((video) => video.pause());
    };
    const resumeBackgroundMedia = () => {
      pausedBackgroundVideos.forEach((video) => video.play().catch(() => {}));
      pausedBackgroundVideos = [];
    };
    contactObserver = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        fluid.pause();
        suspendBackgroundMedia();
      } else {
        fluid.resume();
        resumeBackgroundMedia();
      }
    }, { threshold: 0, rootMargin: "18% 0px 18% 0px" });
    contactObserver.observe(contact);
  }

  let driftFrame = 0;
  let driftExpiry = 0;
  let previous = null;
  const startedAt = performance.now();

  const stopAttract = () => {
    if (driftFrame) cancelAnimationFrame(driftFrame);
    driftFrame = 0;
    if (driftExpiry) clearTimeout(driftExpiry);
    driftExpiry = 0;
    window.removeEventListener("pointermove", takeOver, true);
    window.removeEventListener("pointerdown", takeOver, true);
  };

  const takeOver = () => stopAttract();

  const trace = (now) => {
    if (now - startedAt >= 12000) {
      stopAttract();
      return;
    }

    const box = hero.getBoundingClientRect();
    if (box.bottom <= 0 || box.top >= innerHeight) {
      driftFrame = requestAnimationFrame(trace);
      return;
    }

    const t = (now - startedAt) / 1000;
    const x = box.left + box.width * (0.44 + 0.40 * Math.sin(t * 5.6));
    const y = box.top + box.height * (0.34 + 0.22 * Math.sin(t * 7.3 + 0.6));

    if (previous) {
      let dx = ((x - previous.x) / innerWidth) * 1900;
      let dy = (-(y - previous.y) / innerHeight) * 1900;
      const aspect = innerWidth / innerHeight;
      if (aspect < 1) dx *= aspect;
      if (aspect > 1) dy /= aspect;
      fluid.splat(x, y, dx, dy);
    }
    previous = { x, y };
    driftFrame = requestAnimationFrame(trace);
  };

  window.addEventListener("pointermove", takeOver, { once: true, capture: true });
  window.addEventListener("pointerdown", takeOver, { once: true, capture: true });
  driftExpiry = window.setTimeout(stopAttract, 12000);
  driftFrame = requestAnimationFrame(trace);

  window.addEventListener("pagehide", () => {
    stopAttract();
    contactObserver?.disconnect();
    fluid.destroy();
  }, { once: true });
};

if (preloader && !reducedMotion.matches) {
  preloader.querySelector("#mjp-hero-section")?.addEventListener("mjp:complete", startFluid, { once: true });
  window.setTimeout(startFluid, 10100);
} else {
  startFluid();
}
