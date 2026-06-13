// LOVE PIER — Partials injector
// Each page declares its slug via <body data-page="slug">.
// This script renders nav, fullscreen menu, and footer into mount points.

(function() {
  const LOGO_URL = (window.__resources && window.__resources.logo) || '${LOGO_URL}';
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
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21v-7.5h2.5l.5-3h-3V8.5c0-.9.3-1.5 1.6-1.5H17V4.3c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1V10.5H8v3h2.5V21h3z"/></svg>',
    line: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.5 3 2 6.6 2 11c0 4 3.6 7.3 8.5 7.9.3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.6 1.1-.5 6-3.5 8.2-6 1.5-1.7 2.6-3.4 2.6-4.9 0-4.4-4.5-8-10-8z"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 5.8a4.3 4.3 0 0 1-2.6-1.6 4.3 4.3 0 0 1-.8-2.2h-3v12c0 1-.8 1.9-1.9 1.9a1.9 1.9 0 0 1-1.9-1.9c0-1 .8-1.9 1.9-1.9.2 0 .4 0 .6.1V9.1a5 5 0 0 0-.6 0 5 5 0 1 0 5 5V8.4a7.4 7.4 0 0 0 4.3 1.4V6.7a4.4 4.4 0 0 1-1-.9z"/></svg>',
  };

  // ── Top nav ───────────────────────────────────────────────
  const navMount = document.querySelector('[data-mount="nav"]');
  if (navMount) {
    const isActive = (s) => slug === s ? ' is-active' : '';
    navMount.outerHTML = `
      <nav class="topnav">
        <div class="topnav-links">
          <button class="topnav-ham" data-menu-open aria-label="Open menu">
            <span></span><span></span><span></span>
          </button>
          <a href="index.html" class="topnav-link${isActive('home')}">Home</a>
          <a href="menu.html" class="topnav-link${isActive('menu')}">Menu</a>
          <a href="gallery.html" class="topnav-link${isActive('gallery')}">Gallery</a>
        </div>
        <div class="topnav-logo">
          <a href="index.html"><img src="${LOGO_URL}" alt="Love Pier Beach Cafe" /></a>
        </div>
        <div class="topnav-right">
          <a href="location.html" class="topnav-link${isActive('location')}">Location</a>
          <a href="contact.html" class="topnav-link${isActive('contact')}">Contact</a>
          <a href="reservation.html" class="topnav-cta">Reserve</a>
        </div>
      </nav>`;
  }

  // ── Fullscreen menu overlay ──────────────────────────────
  const menuMount = document.querySelector('[data-mount="menu"]');
  if (menuMount) {
    const items = NAV_ITEMS.map((it, i) => {
      const active = it.slug === slug ? ' is-active' : '';
      const num = String(i + 1).padStart(2, '0');
      return `<a href="${it.href}" class="menu-overlay-item${active}"><span class="num">${num}</span>${it.label}</a>`;
    }).join('');
    menuMount.outerHTML = `
      <div class="menu-overlay" aria-hidden="true">
        <div class="menu-overlay-top">
          <a href="index.html" class="menu-overlay-logo"><img src="${LOGO_URL}" alt="Love Pier" /></a>
          <button class="menu-overlay-close" data-menu-close aria-label="Close menu">✕</button>
        </div>
        <div class="menu-overlay-body">
          <div class="menu-overlay-nav">${items}</div>
          <aside class="menu-overlay-aside">
            <div>
              <h4>Visit</h4>
              <p>800 108 Saensuk<br/>Mueang Chonburi, Chonburi 20130</p>
            </div>
            <div>
              <h4>Hours</h4>
              <p>Mon–Fri · 08:00 – 21:00<br/>Sat–Sun · 07:00 – 22:00</p>
            </div>
            <div>
              <h4>Contact</h4>
              <p><a href="tel:+6632123456">+66 32 123 456</a><br/><a href="mailto:hello@lovepier.cafe">hello@lovepier.cafe</a></p>
            </div>
          </aside>
        </div>
        <div class="menu-overlay-bottom">
          <div>© 2026 Love Pier Beach Cafe</div>
          <div class="menu-overlay-socials">
            <a href="#" aria-label="Instagram">${SOCIAL_SVGS.instagram}</a>
            <a href="https://www.facebook.com/profile.php?id=61590549024692" target="_blank" rel="noopener noreferrer" aria-label="Facebook">${SOCIAL_SVGS.facebook}</a>
            <a href="#" aria-label="LINE">${SOCIAL_SVGS.line}</a>
          </div>
        </div>
      </div>`;
  }

  // ── Footer (big tagline) ─────────────────────────────────
  const footerMount = document.querySelector('[data-mount="footer"]');
  if (footerMount) {
    const tagline = footerMount.getAttribute('data-tagline') || 'THE SEA IS <em>ALWAYS OPEN</em>';
    footerMount.outerHTML = `
      <footer class="big-tagline reveal">
        <div class="big-tagline-text">${tagline}</div>
        <div class="big-tagline-bottom">
          <div class="big-tagline-copy">© 2026 Love Pier Beach Cafe · All Rights Reserved</div>
          <div class="big-tagline-brand">Love Pier</div>
        </div>
      </footer>`;
  }
})();
