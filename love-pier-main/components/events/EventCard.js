// Portrait poster card used by the Upcoming/Past grids on /events and by the
// home page. Purely presentational — the pages resolve the current-language
// strings and pass them in, so this component doesn't need to know about
// `lang`.
import Link from 'next/link'

function getSrcSet(url) {
  if (!url || !url.includes('-960w.webp')) return undefined
  const base = url.replace('-960w.webp', '')
  return `${base}-480w.webp 480w, ${base}-960w.webp 960w, ${base}-1440w.webp 1440w`
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 shrink-0">
      <path d="M12 2C7.6 2 4 5.6 4 10c0 5.4 6.6 11.1 7.5 11.9.3.3.7.3 1 0C13.4 21.1 20 15.4 20 10c0-4.4-3.6-8-8-8zm0 10.75A2.75 2.75 0 1 1 12 7.25a2.75 2.75 0 0 1 0 5.5z" />
    </svg>
  )
}

/**
 * Everything the card knows sits INSIDE the photo now — a date chip in the
 * corner, then category / title / place stacked over a gradient at the foot.
 * It used to put the date and title in a block below the image with the place
 * as a pill on top of it, which spread three short facts across three
 * different alignments.
 *
 * The date leads because it is what people look for first in a list of
 * events, and 'ก.ค. / 2' as a chip is read at a glance where a run-on
 * 'ศ. 2 ก.ค. 2026' has to be parsed. dateLabel is still accepted and still
 * carries the full, unambiguous date to assistive tech and to the tooltip —
 * the chip is a summary of it, not a replacement.
 */
export default function EventCard({
  href,
  imageUrl,
  title,
  dateLabel,
  dateMonth,
  dateDay,
  category,
  location,
  pastLabel = '',
  desaturate = false,
}) {
  return (
    <Link href={href} className="group block">
      <div
        className="relative overflow-hidden rounded-2xl bg-[#f2ede6]"
        style={{ aspectRatio: '3 / 4' }}
      >
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            srcSet={getSrcSet(imageUrl)}
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
            alt={title}
            loading="lazy"
            className={`absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${desaturate ? 'grayscale' : ''}`}
          />
        )}
        {/* Two stops rather than one long fade: the text needs near-solid
            black under it (some event photos are a bright sky, some a lit
            room) while the middle of the picture has to stay unclouded. */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

        {dateMonth && dateDay && (
          <div className="absolute top-3 left-3 rounded-xl bg-white/95 px-2.5 py-1.5 text-center shadow-sm" title={dateLabel || undefined}>
            <span className="block text-[10px] leading-none text-muted-strong">{dateMonth}</span>
            <span className="block font-display text-[20px] leading-none text-ink mt-1">{dateDay}</span>
          </div>
        )}

        {/* On the card, not above the row. The home page mixes finished
            events in among upcoming ones to fill the row out, so "this one is
            over" has to travel with the card — a heading over the group would
            be read once and then forgotten two cards later. The grey image is
            the same statement said quietly; this is it said out loud. */}
        {pastLabel && (
          <span className="absolute top-3 right-3 rounded-full bg-black/60 backdrop-blur-sm px-2.5 py-1 text-[10px] tracking-[0.1em] uppercase text-white/90">
            {pastLabel}
          </span>
        )}

        <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4">
          {/* Category, else the plain date — never both. The chip above has
              the date covered whenever it is present, and a card that repeats
              it here reads as two labels for one fact. */}
          {(category || (!dateMonth && dateLabel)) && (
            <p className="text-[10px] tracking-[0.15em] uppercase text-white/70 mb-1">
              {category || dateLabel}
            </p>
          )}
          <h3 className="font-display font-light text-[16px] sm:text-[18px] text-white leading-snug line-clamp-2">
            {title}
          </h3>
          {location && (
            <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-white/75">
              <PinIcon />
              <span className="line-clamp-1">{location}</span>
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
