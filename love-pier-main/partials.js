// LOVE PIER — Partials injector (Tailwind version)
// Each page declares its slug via <body data-page="slug">.
// This script renders nav, fullscreen menu, and footer into mount points.

(function() {
  const slug = document.body.getAttribute('data-page') || 'home';

  const NAV_ITEMS = [
    { slug: 'home',        label: 'Home',        href: 'index.html' },
    { slug: 'menu',        label: 'Menu',        href: 'menu.html' },
    { slug: 'gallery',     label: 'Gallery',     href: 'gallery.html' },
    { slug: 'reservation', label: 'Reservation', href: 'reservation.html' },
    { slug: 'location',    label: 'Location',    href: 'location.html' },
    { slug: 'events',      label: 'Events',      href: 'events.html' },
    { slug: 'promotion',   label: 'Promotion',   href: 'promotion.html' },
    { slug: 'about',       label: 'About Us',    href: 'about.html' },
    { slug: 'contact',     label: 'Contact',     href: 'contact.html' },
  ];

  const SOCIAL_SVGS = {
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4 block"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 block"><path d="M13.5 21v-7.5h2.5l.5-3h-3V8.5c0-.9.3-1.5 1.6-1.5H17V4.3c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1V10.5H8v3h2.5V21h3z"/></svg>',
    line: '<svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 block"><path d="M12 3C6.5 3 2 6.6 2 11c0 4 3.6 7.3 8.5 7.9.3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.6 1.1-.5 6-3.5 8.2-6 1.5-1.7 2.6-3.4 2.6-4.9 0-4.4-4.5-8-10-8z"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 block"><path d="M16.6 5.8a4.3 4.3 0 0 1-2.6-1.6 4.3 4.3 0 0 1-.8-2.2h-3v12c0 1-.8 1.9-1.9 1.9a1.9 1.9 0 0 1-1.9-1.9c0-1 .8-1.9 1.9-1.9.2 0 .4 0 .6.1V9.1a5 5 0 0 0-.6 0 5 5 0 1 0 5 5V8.4a7.4 7.4 0 0 0 4.3 1.4V6.7a4.4 4.4 0 0 1-1-.9z"/></svg>',
  };

  // ── Top nav ───────────────────────────────────────────────
  const navMount = document.querySelector('[data-mount="nav"]');
  if (navMount) {
    const linkBase = 'text-[10px] tracking-[0.25em] uppercase transition-colors duration-200';
    const linkActive = (s) => slug === s
      ? `${linkBase} text-ink`
      : `${linkBase} text-muted hover:text-ink`;

    navMount.outerHTML = `
      <nav class="w-full px-10 py-[14px] flex items-center justify-between border-b border-line bg-[rgba(245,243,239,0.92)] backdrop-blur-sm sticky top-0 z-[100]">
        <!-- Left: hamburger + nav links -->
        <div class="flex items-center gap-8">
          <button class="flex flex-col justify-center items-center gap-[5px] bg-transparent border border-black/[0.12] w-[38px] h-[38px] hover:border-ink transition-colors duration-200" data-menu-open aria-label="Open menu">
            <span class="block w-4 h-px bg-ink"></span>
            <span class="block w-4 h-px bg-ink"></span>
            <span class="block w-4 h-px bg-ink"></span>
          </button>
          <a href="index.html" class="hidden lg:block ${linkActive('home')}">Home</a>
          <a href="menu.html" class="hidden lg:block ${linkActive('menu')}">Menu</a>
          <a href="gallery.html" class="hidden lg:block ${linkActive('gallery')}">Gallery</a>
        </div>
        <!-- Center: logo -->
        <div>
          <a href="index.html"><img src="uploads/logo-8dc1f126.png" alt="Love Pier Beach Cafe" class="h-[52px] mix-blend-multiply block" /></a>
        </div>
        <!-- Right: links + CTA -->
        <div class="flex items-center gap-6">
          <a href="location.html" class="hidden lg:block ${linkActive('location')}">Location</a>
          <a href="contact.html" class="hidden lg:block ${linkActive('contact')}">Contact</a>
          <a href="reservation.html" class="text-[10px] tracking-[0.25em] uppercase text-bg bg-ink px-[18px] py-[9px] hover:bg-gold hover:text-ink transition-colors duration-200">Reserve</a>
        </div>
      </nav>`;
  }

  // ── Fullscreen menu overlay ──────────────────────────────
  const menuMount = document.querySelector('[data-mount="menu"]');
  if (menuMount) {
    const items = NAV_ITEMS.map((it, i) => {
      const active = it.slug === slug ? ' text-gold' : ' text-[rgba(245,243,239,0.45)]';
      const num = String(i + 1).padStart(2, '0');
      return `<a href="${it.href}" class="font-display font-light leading-[1.05] tracking-[-0.02em] flex items-baseline gap-5 transition-all duration-200 hover:text-bg hover:translate-x-2 text-[clamp(40px,5.5vw,70px)]${active}"><span class="font-sans text-[11px] tracking-[0.2em] font-light text-[rgba(245,243,239,0.3)] -translate-y-2">${num}</span>${it.label}</a>`;
    }).join('');
    menuMount.outerHTML = `
      <div class="menu-overlay fixed inset-0 bg-[#0e0e0e] z-[999] opacity-0 pointer-events-none transition-opacity duration-500 flex flex-col" style="transition-timing-function:cubic-bezier(0.77,0,0.175,1)" aria-hidden="true">
        <!-- top bar -->
        <div class="px-10 py-[14px] flex items-center justify-between border-b border-[rgba(255,255,255,0.08)]">
          <a href="index.html"><img src="uploads/logo-8dc1f126.png" alt="Love Pier" class="h-11 block" style="filter:invert(1) brightness(2) opacity(0.85)" /></a>
          <button class="bg-transparent border border-[rgba(255,255,255,0.15)] w-[38px] h-[38px] flex items-center justify-center text-[rgba(245,243,239,0.7)] text-lg hover:border-white hover:text-white transition-colors duration-200" data-menu-close aria-label="Close menu">✕</button>
        </div>
        <!-- body: nav + aside -->
        <div class="flex-1 grid grid-cols-1 lg:grid-cols-2 items-center p-8 lg:p-10 gap-10 lg:gap-20 overflow-y-auto">
          <nav class="flex flex-col gap-1">${items}</nav>
          <aside class="border-t border-[rgba(255,255,255,0.08)] pt-8 lg:border-t-0 lg:border-l lg:border-[rgba(255,255,255,0.08)] lg:pl-16 flex flex-col gap-8">
            <div>
              <h4 class="text-[10px] tracking-[0.35em] uppercase text-[rgba(245,243,239,0.4)] mb-2.5">Visit</h4>
              <p class="text-[13px] text-[rgba(245,243,239,0.7)] leading-[1.8] font-light">800 108 Saensuk<br/>Mueang Chonburi, Chonburi 20130</p>
            </div>
            <div>
              <h4 class="text-[10px] tracking-[0.35em] uppercase text-[rgba(245,243,239,0.4)] mb-2.5">Hours</h4>
              <p class="text-[13px] text-[rgba(245,243,239,0.7)] leading-[1.8] font-light">Mon–Fri · 08:00 – 21:00<br/>Sat–Sun · 07:00 – 22:00</p>
            </div>
            <div>
              <h4 class="text-[10px] tracking-[0.35em] uppercase text-[rgba(245,243,239,0.4)] mb-2.5">Contact</h4>
              <p class="text-[13px] text-[rgba(245,243,239,0.7)] leading-[1.8] font-light"><a href="tel:+6632123456" class="hover:text-gold transition-colors duration-200">+66 32 123 456</a><br/><a href="mailto:hello@lovepier.cafe" class="hover:text-gold transition-colors duration-200">hello@lovepier.cafe</a></p>
            </div>
          </aside>
        </div>
        <!-- bottom bar -->
        <div class="px-10 py-[18px] border-t border-[rgba(255,255,255,0.08)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 text-[10px] tracking-[0.2em] uppercase text-[rgba(245,243,239,0.3)]">
          <div>© 2026 Love Pier Beach Cafe</div>
          <div class="flex gap-3.5">
            <a href="#" aria-label="Instagram" class="text-[rgba(245,243,239,0.5)] hover:text-gold transition-colors duration-200">${SOCIAL_SVGS.instagram}</a>
            <a href="https://www.facebook.com/profile.php?id=61590549024692" target="_blank" rel="noopener noreferrer" aria-label="Facebook" class="text-[rgba(245,243,239,0.5)] hover:text-gold transition-colors duration-200">${SOCIAL_SVGS.facebook}</a>
            <a href="#" aria-label="LINE" class="text-[rgba(245,243,239,0.5)] hover:text-gold transition-colors duration-200">${SOCIAL_SVGS.line}</a>
          </div>
        </div>
      </div>`;
  }

  function footerTaglineSizeClass(text) {
    const len = text.replace(/<[^>]+>/g, '').trim().length;
    return len > 20 ? 'footer-tagline footer-tagline--long' : 'footer-tagline';
  }

  // ── Footer (big tagline) ─────────────────────────────────
  const footerMount = document.querySelector('[data-mount="footer"]');
  if (footerMount) {
    const tagline = footerMount.getAttribute('data-tagline') || 'THE SEA IS <em>ALWAYS OPEN</em>';
    const taglineClass = footerTaglineSizeClass(tagline);
    footerMount.outerHTML = `
      <footer class="bg-ink px-4 pt-12 pb-8 overflow-hidden reveal sm:px-6 sm:pt-14 sm:pb-10 lg:px-10 lg:pt-16">
        <div class="font-display font-light text-bg tracking-[-0.03em] leading-[0.9] whitespace-nowrap overflow-hidden max-w-full ${taglineClass}">${tagline}</div>
        <div class="mt-10 pt-5 border-t border-[rgba(255,255,255,0.08)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div class="text-[10px] tracking-[0.2em] text-[rgba(245,243,239,0.3)] uppercase">© 2026 Love Pier Beach Cafe · All Rights Reserved</div>
          <div class="font-display text-base font-light text-[rgba(245,243,239,0.5)] tracking-[0.2em]">Love Pier</div>
        </div>
      </footer>`;
  }

  // Add is-open class toggle support for menu overlay
  document.addEventListener('click', function(e) {
    const openBtn = e.target.closest('[data-menu-open]');
    const closeBtn = e.target.closest('[data-menu-close]');
    const overlay = document.querySelector('.menu-overlay');
    if (!overlay) return;
    if (openBtn) {
      overlay.classList.add('is-open');
      overlay.setAttribute('aria-hidden', 'false');
      document.body.classList.add('menu-open');
    }
    if (closeBtn) {
      overlay.classList.remove('is-open');
      overlay.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('menu-open');
    }
  });
})();
