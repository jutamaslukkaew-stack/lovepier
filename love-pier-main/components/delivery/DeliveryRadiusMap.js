// Google Maps map showing the shop, its delivery radius, and the customer's
// pinned location. Client-only (touches `window` to load the Maps script), so
// this must be loaded via next/dynamic with { ssr: false } — see OrderFlow.js.
import { useEffect, useRef } from 'react'
import { loadGoogleMaps, emojiMarkerIcon } from '../../lib/googleMaps'

export default function DeliveryRadiusMap({ shopLat, shopLng, userLat, userLng, radiusKm, withinRadius }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    if (![shopLat, shopLng].every(Number.isFinite)) return

    let cancelled = false

    loadGoogleMaps().then((maps) => {
      if (cancelled || !containerRef.current || mapRef.current) return

      const map = new maps.Map(containerRef.current, {
        center: { lat: shopLat, lng: shopLng },
        zoom: 14,
        disableDefaultUI: true,
        gestureHandling: 'greedy',
        scrollwheel: false,
        clickableIcons: false,
      })
      mapRef.current = map

      new maps.Marker({
        position: { lat: shopLat, lng: shopLng },
        map,
        icon: emojiMarkerIcon(maps, '🏠', 22),
      })

      const circle = new maps.Circle({
        map,
        center: { lat: shopLat, lng: shopLng },
        radius: (radiusKm || 5) * 1000,
        strokeColor: '#4a3520',
        strokeWeight: 1.5,
        fillColor: '#4a3520',
        fillOpacity: 0.08,
      })

      const bounds = circle.getBounds()

      if (Number.isFinite(userLat) && Number.isFinite(userLng)) {
        new maps.Marker({
          position: { lat: userLat, lng: userLng },
          map,
          icon: emojiMarkerIcon(maps, withinRadius === false ? '⚠️' : '📍', 24),
        })
        bounds.extend({ lat: userLat, lng: userLng })
      }

      map.fitBounds(bounds, 24)
    }).catch((err) => {
      console.error('Google Maps failed to load:', err)
    })

    return () => {
      cancelled = true
      mapRef.current = null
    }
  }, [shopLat, shopLng, userLat, userLng, radiusKm, withinRadius])

  return <div ref={containerRef} className="w-full h-full rounded-2xl overflow-hidden" />
}
