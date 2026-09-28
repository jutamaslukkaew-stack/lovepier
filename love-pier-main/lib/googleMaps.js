// Loads the Google Maps JavaScript API script once and shares it across
// every map on the page (DeliveryRadiusMap, location.js). Client-only —
// touches `window`, so callers must only invoke this from useEffect/browser code.
let loaderPromise = null

export function loadGoogleMaps() {
  if (typeof window === 'undefined') return Promise.reject(new Error('loadGoogleMaps called on the server'))
  if (window.google?.maps) return Promise.resolve(window.google.maps)
  if (loaderPromise) return loaderPromise

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) return Promise.reject(new Error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set'))

  loaderPromise = new Promise((resolve, reject) => {
    const callbackName = '__loveierGoogleMapsLoaded'
    window[callbackName] = () => resolve(window.google.maps)

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=${callbackName}&loading=async`
    script.async = true
    script.onerror = () => reject(new Error('Failed to load the Google Maps script'))
    document.head.appendChild(script)
  })

  return loaderPromise
}

// A marker icon built from an emoji, as a data-URI SVG (google.maps.Marker's
// own `label` only renders plain glyphs reliably — an <img>-backed icon
// renders the emoji consistently across platforms). Call only after
// loadGoogleMaps() has resolved, so `maps` is the loaded google.maps namespace.
export function emojiMarkerIcon(maps, emoji, size = 32) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><text x="50%" y="52%" font-size="${size * 0.72}" text-anchor="middle" dominant-baseline="central">${emoji}</text></svg>`
  return {
    url: `data:image/svg+xml,${encodeURIComponent(svg)}`,
    scaledSize: new maps.Size(size, size),
    anchor: new maps.Point(size / 2, size * 0.9),
  }
}
