// Leaflet map showing the shop, its delivery radius, and the customer's
// pinned location. Client-only (Leaflet touches `window` at import time), so
// this must be loaded via next/dynamic with { ssr: false } — see DeliveryGate.js.
import { useEffect, useRef } from 'react'
import L from 'leaflet'

export default function DeliveryRadiusMap({ shopLat, shopLng, userLat, userLng, radiusKm, withinRadius }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    if (![shopLat, shopLng].every(Number.isFinite)) return

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: false,
    })
    mapRef.current = map

    // Leaflet needs a view (center/zoom) set before any bounds/projection
    // math — e.g. circle.getBounds() — works; setView before adding layers.
    map.setView([shopLat, shopLng], 14)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)

    const shopIcon = L.divIcon({
      className: '',
      html: '<div style="font-size:22px;line-height:1;transform:translate(-50%,-100%)">🏠</div>',
      iconSize: [0, 0],
    })
    L.marker([shopLat, shopLng], { icon: shopIcon }).addTo(map)

    const circle = L.circle([shopLat, shopLng], {
      radius: (radiusKm || 5) * 1000,
      color: '#4a3520',
      weight: 1.5,
      fillColor: '#4a3520',
      fillOpacity: 0.08,
    }).addTo(map)

    const bounds = circle.getBounds()

    if (Number.isFinite(userLat) && Number.isFinite(userLng)) {
      const userIcon = L.divIcon({
        className: '',
        html: `<div style="font-size:24px;line-height:1;transform:translate(-50%,-100%)">${withinRadius === false ? '⚠️' : '📍'}</div>`,
        iconSize: [0, 0],
      })
      L.marker([userLat, userLng], { icon: userIcon }).addTo(map)
      bounds.extend([userLat, userLng])
    }

    map.fitBounds(bounds, { padding: [24, 24] })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [shopLat, shopLng, userLat, userLng, radiusKm, withinRadius])

  return <div ref={containerRef} className="w-full h-full rounded-2xl overflow-hidden" />
}
