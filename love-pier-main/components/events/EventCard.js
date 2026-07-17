// Portrait poster card used by the Upcoming/Past grids on /events. Purely
// presentational — pages/events.js resolves the current-language strings
// and passes them in, so this component doesn't need to know about `lang`.
import Link from 'next/link'

function getSrcSet(url) {
  if (!url || !url.includes('-960w.webp')) return undefined
  const base = url.replace('-960w.webp', '')
  return `${base}-480w.webp 480w, ${base}-960w.webp 960w, ${base}-1440w.webp 1440w`
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
      <path d="M12 2C7.6 2 4 5.6 4 10c0 5.4 6.6 11.1 7.5 11.9.3.3.7.3 1 0C13.4 21.1 20 15.4 20 10c0-4.4-3.6-8-8-8zm0 10.75A2.75 2.75 0 1 1 12 7.25a2.75 2.75 0 0 1 0 5.5z" />
    </svg>
  )
}

export default function EventCard({ href, imageUrl, title, dateLabel, location, desaturate = false }) {
  return (
    <Link href={href} className="group block">
      <div
        className={`relative overflow-hidden rounded-2xl bg-[#f2ede6] ${desaturate ? 'grayscale' : ''}`}
        style={{ aspectRatio: '3 / 4' }}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            srcSet={getSrcSet(imageUrl)}
            sizes="(min-width: 1024px) 25vw, 50vw"
            alt={title}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-20">🎉</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
        {location && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 bg-black/55 backdrop-blur-sm text-white text-[10px] tracking-wide px-2.5 py-1 rounded-full">
            <PinIcon />
            {location}
          </span>
        )}
      </div>
      <div className="mt-3">
        {dateLabel && (
          <p className="text-[10px] tracking-[0.15em] uppercase text-muted">{dateLabel}</p>
        )}
        <h3 className="font-display font-light text-[18px] text-ink leading-snug mt-0.5 line-clamp-2 group-hover:text-gold transition-colors">
          {title}
        </h3>
      </div>
    </Link>
  )
}
