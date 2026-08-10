import { useEffect, useState } from 'react'

const HERO_IMAGES = [
  '/uploads/gallery-beach-terrace.webp',
  '/uploads/home-beach-panorama.webp',
  '/uploads/home-cafe-exterior.webp',
  '/uploads/gallery-sunset-sea.webp',
  '/uploads/gallery-beach-lawn.webp',
  '/uploads/home-love-pier-exterior.webp',
  '/uploads/gallery-interior-dining.webp',
  '/uploads/gallery-sunset-boat.webp',
]

// `compact` turns the hero from the page's subject into a band above it. The
// delivery welcome carries a heading, three steps and the start button UNDERNEATH
// it, so the hero must not out-rank them: it gives up the eyebrow and the slide
// dots, takes a smaller title, and sizes itself to its container instead of the
// viewport. The marketing pages keep the full height, where the image IS the page.
export default function PageHero({ title, titleHtml, subtitle, cta, compact = false }) {
  const [idx, setIdx] = useState(0)
  const [prev, setPrev] = useState(null)

  useEffect(() => {
    // A slideshow that cross-fades on its own behind a decision is exactly the
    // motion someone with a vestibular disorder asked the OS to stop.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => {
      setIdx((i) => {
        setPrev(i)
        return (i + 1) % HERO_IMAGES.length
      })
    }, 4000)
    return () => clearInterval(t)
  }, [])

  return (
    // Compact scales with viewport HEIGHT, not width: what squeezes this band
    // is a short screen (and LINE's chrome eating ~45px of it), not a narrow
    // one. A tall phone gets a photo worth looking at; a short one gives the
    // copy underneath the room it needs.
    <section
      className="relative overflow-hidden"
      style={{ height: compact ? 'clamp(190px, 34vh, 300px)' : 'clamp(260px, 55vw, 420px)' }}
    >
      {prev !== null && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`prev-${prev}`}
          src={HERO_IMAGES[prev]}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover object-center animate-[fadeOut_0.8s_ease-in-out_forwards]"
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={`cur-${idx}`}
        src={HERO_IMAGES[idx]}
        alt="Love Pier Beach Cafe"
        className="absolute inset-0 w-full h-full object-cover object-center animate-[fadeIn_0.8s_ease-in-out_forwards]"
      />
      {/* Compact runs a heavier scrim: the band is short, so the title sits in
          the middle of the frame rather than down in the dark end, and these
          photos include bright sand and sky. */}
      <div
        className={`absolute inset-0 bg-gradient-to-t ${
          compact ? 'from-black/70 via-black/35 to-black/15' : 'from-black/60 via-black/20 to-black/10'
        }`}
      />
      <div className={`absolute inset-0 flex flex-col items-center justify-end px-6 text-center ${compact ? 'pb-6' : 'pb-8'}`}>
        {!compact && (
          <p className="text-white/70 text-[10px] tracking-[0.3em] uppercase font-light mb-2">Love Pier Beach Cafe</p>
        )}
        <h1
          className={`font-display font-light text-white leading-[0.95] tracking-[-0.02em] ${
            compact ? 'text-[clamp(30px,6vw,44px)]' : 'text-[clamp(36px,7vw,64px)]'
          }`}
        >
          {titleHtml ? <span dangerouslySetInnerHTML={{ __html: titleHtml }} /> : title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-white/70 text-sm font-light">{subtitle}</p>
        )}
        {cta && <div className="mt-5">{cta}</div>}
      </div>
      {/* No dots in compact: choosing a slide is not a task on a screen whose
          only job is to start an order, and eight of them under a short band
          read as clutter. The images stay ambience. */}
      {!compact && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {HERO_IMAGES.map((_, i) => (
            <button
              key={i}
              onClick={() => { setPrev(idx); setIdx(i) }}
              className={`w-1.5 h-1.5 rounded-full transition-all ${i === idx ? 'bg-white w-4' : 'bg-white/40'}`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  )
}
