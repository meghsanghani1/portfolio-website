import { splashCursor } from "./fluid-cursor.js";

const preloader = document.querySelector(".portfolio-segment--preloader");
const hero = document.querySelector(".portfolio-segment--hero .ms-hero");

const dismissPreloader = () => {
  if (!preloader || preloader.classList.contains("is-complete")) return;
  preloader.classList.add("is-complete");
  preloader.setAttribute("aria-hidden", "true");
};

preloader?.querySelector("#mjp-hero-section")?.addEventListener("mjp:complete", dismissPreloader, { once: true });
window.setTimeout(dismissPreloader, 6500);

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const href = link.getAttribute("href");
    const target = href === "#" ? document.getElementById("home") : document.querySelector(href);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    history.replaceState(null, "", href === "#" ? "#home" : href);
  });
});

const startFluid = () => {
  if (document.documentElement.dataset.fluidStarted === "true") return;
  document.documentElement.dataset.fluidStarted = "true";

  const fluid = splashCursor({
    curl: 12,
    densityDissipation: 3,
    velocityDissipation: 2.4,
    splatForce: 6000,
    splatRadius: 0.2,
    intensity: 0.13,
    rainbow: true,
    colorUpdateSpeed: 10,
    idleStopMs: 4000,
    maxDpr: 2,
    zIndex: 15000,
  });

  if (!fluid.canvas || !hero) return;

  const hint = document.createElement("p");
  hint.className = "fluid-cursor-hint";
  hint.textContent = "Move your cursor to make waves";
  hero.append(hint);

  let driftFrame = 0;
  let driftExpiry = 0;
  let previous = null;
  const startedAt = performance.now();

  const stopAttract = (hideHint = false) => {
    if (driftFrame) cancelAnimationFrame(driftFrame);
    driftFrame = 0;
    if (driftExpiry) clearTimeout(driftExpiry);
    driftExpiry = 0;
    window.removeEventListener("pointermove", takeOver, true);
    window.removeEventListener("pointerdown", takeOver, true);
    if (hideHint) hint.classList.add("is-hidden");
  };

  const takeOver = () => stopAttract(true);

  const trace = (now) => {
    if (now - startedAt >= 12000) {
      stopAttract(false);
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
  driftExpiry = window.setTimeout(() => stopAttract(false), 12000);
  driftFrame = requestAnimationFrame(trace);

  window.addEventListener("pagehide", () => {
    stopAttract(false);
    fluid.destroy();
  }, { once: true });
};

if (preloader) {
  preloader.querySelector("#mjp-hero-section")?.addEventListener("mjp:complete", startFluid, { once: true });
  window.setTimeout(startFluid, 6600);
} else {
  startFluid();
}
