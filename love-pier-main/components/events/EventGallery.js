// Mosaic gallery grid for an event's album images (≤10). Click any image to
// open the shared Lightbox (thumbnails mode) at that index.
import { useState } from 'react'
import { Lightbox } from '../menu/MenuSections'

const TITLE_COPY = { th: 'ภาพบรรยากาศ', en: 'Gallery', zh: '活动相册' }

export default function EventGallery({ images = [], lang = 'th' }) {
  const [lbIndex, setLbIndex] = useState(-1)
  if (images.length === 0) return null

  const items = images.map((url) => ({ image: url }))

  return (
    <section className="px-4 py-10 sm:px-6 lg:px-10">
      <h3 className="font-display font-light text-ink mb-5 text-[clamp(22px,3vw,30px)]">
        {TITLE_COPY[lang] || TITLE_COPY.en}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 auto-rows-[110px] sm:auto-rows-[130px] gap-2 sm:gap-3">
        {images.map((url, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setLbIndex(i)}
            className={`relative overflow-hidden rounded-xl bg-[#f2ede6] group ${i === 0 ? 'col-span-2 row-span-2' : ''}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=""
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      {lbIndex >= 0 && (
        <Lightbox
          items={items}
          index={lbIndex}
          onIndexChange={setLbIndex}
          onClose={() => setLbIndex(-1)}
          thumbnails
        />
      )}
    </section>
  )
}
