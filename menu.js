document.addEventListener('DOMContentLoaded', () => {
  const root = document.documentElement;
  const burger = document.getElementById('megh-menu-toggle');
  const menu = document.getElementById('megh-overlay-menu');
  const blocks = [...document.querySelectorAll('#megh-overlay-wipe .megh-overlay-block')];
  const lines = [...menu.querySelectorAll('.megh-menu-title, .megh-menu-item')];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const animated = !!window.gsap && !reducedMotion.matches;
  let isOpen = false;

  // One reversible timeline: eight staggered downward wipes, then the links.
  const timeline = animated ? window.gsap.timeline({ paused: true }) : null;
  if (timeline) {
    timeline.to(blocks, {
      clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
      duration: 1,
      stagger: 0.075,
      ease: 'power3.inOut'
    });
    timeline.to(lines, { opacity: 1, duration: 0.3, stagger: 0.05 }, '-=0.5');
  } else {
    root.classList.add('megh-menu-fallback');
  }

  function toggle(force) {
    const opening = typeof force === 'boolean' ? force : !isOpen;
    if (opening === isOpen) return;
    isOpen = opening;
    burger.classList.toggle('is-active', isOpen);
    burger.setAttribute('aria-expanded', String(isOpen));
    burger.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
    menu.setAttribute('aria-hidden', String(!isOpen));
    menu.inert = !isOpen;
    if (timeline) {
      isOpen ? timeline.play() : timeline.reverse();
    } else if (reducedMotion.matches) {
      blocks.forEach(block => { block.style.clipPath = isOpen
        ? 'polygon(0% 0%,100% 0%,100% 100%,0% 100%)'
        : 'polygon(0% 0%,100% 0%,100% 0%,0% 0%)'; });
      lines.forEach(line => { line.style.opacity = isOpen ? '1' : '0'; });
    } else {
      root.classList.toggle('megh-menu-open', isOpen);
    }
    if (isOpen) {
      window.setTimeout(() => {
        if (isOpen) menu.querySelector('a')?.focus({ preventScroll: true });
      }, animated ? 1250 : reducedMotion.matches ? 0 : 1250);
    }
  }

  burger.addEventListener('click', () => toggle());
  menu.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', () => toggle(false));
  });
  document.querySelector('#megh-overlay-nav .megh-nav-mark')?.addEventListener('click', () => toggle(false));
  document.addEventListener('keydown', event => {
    if (!isOpen) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      toggle(false);
      burger.focus();
    } else if (event.key === 'Tab') {
      const focusable = [burger, ...menu.querySelectorAll('a')];
      const current = focusable.indexOf(document.activeElement);
      if (event.shiftKey && current <= 0) {
        event.preventDefault();
        focusable.at(-1).focus();
      } else if (!event.shiftKey && current === focusable.length - 1) {
        event.preventDefault();
        burger.focus();
      }
    }
  });
});
