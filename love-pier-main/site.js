// LOVE PIER — shared site JS (Lenis + menu + reveal)

(function() {
  // ── Lenis Smooth Scroll ────────────────────────────────────
  let lenis = null;
  if (typeof Lenis !== 'undefined') {
    lenis = new Lenis({
      duration: 1.4,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.2,
    });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
  }

  // ── Reveal on scroll ──────────────────────────────────────
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal, .reveal-img').forEach(el => io.observe(el));

  // ── Anchor scrolling via Lenis ────────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (href && href.length > 1 && document.querySelector(href)) {
        e.preventDefault();
        if (lenis) lenis.scrollTo(href, { offset: -60, duration: 1.6 });
        else document.querySelector(href).scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // ── Fullscreen menu toggle ────────────────────────────────
  const overlay = document.querySelector('.menu-overlay');
  const openBtns = document.querySelectorAll('[data-menu-open]');
  const closeBtns = document.querySelectorAll('[data-menu-close]');

  function openMenu() {
    if (!overlay) return;
    overlay.classList.add('is-open');
    document.body.classList.add('menu-open');
    if (lenis) lenis.stop();
  }
  function closeMenu() {
    if (!overlay) return;
    overlay.classList.remove('is-open');
    document.body.classList.remove('menu-open');
    if (lenis) lenis.start();
  }

  openBtns.forEach(b => b.addEventListener('click', openMenu));
  closeBtns.forEach(b => b.addEventListener('click', closeMenu));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay && overlay.classList.contains('is-open')) closeMenu();
  });
})();
