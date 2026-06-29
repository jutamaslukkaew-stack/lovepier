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

export default function PageHero({ title, titleHtml, subtitle, cta }) {
  const [idx, setIdx] = useState(0)
  const [prev, setPrev] = useState(null)

  useEffect(() => {
    const t = setInterval(() => {
      setIdx((i) => {
        setPrev(i)
        return (i + 1) % HERO_IMAGES.length
      })
    }, 4000)
    return () => clearInterval(t)
  }, [])

  return (
    <section className="relative overflow-hidden" style={{ height: 'clamp(260px, 55vw, 420px)' }}>
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
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/10" />
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-8 px-6 text-center">
        <p className="text-white/70 text-[10px] tracking-[0.3em] uppercase font-light mb-2">Love Pier Beach Cafe</p>
        <h1 className="font-display font-light text-white leading-[0.95] tracking-[-0.02em] text-[clamp(36px,7vw,64px)]">
          {titleHtml ? <span dangerouslySetInnerHTML={{ __html: titleHtml }} /> : title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-white/70 text-sm font-light">{subtitle}</p>
        )}
        {cta && <div className="mt-5">{cta}</div>}
      </div>
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
    </section>
  )
}
