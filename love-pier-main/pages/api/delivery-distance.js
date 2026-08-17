// Delivery distance check. Method (straight-line vs Google Routes driving
// distance), shop location, radius, and API key all come from the shop settings
// (editable at /admin/settings), with env vars as fallback.

import { getShopSettings } from '../../lib/settings'
import { haversineKm } from '../../lib/geo'
import { calcDeliveryFee } from '../../lib/deliveryFee'

async function googleDrivingKm(apiKey, from, to) {
  const resp = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'routes.distanceMeters',
    },
    body: JSON.stringify({
      origin: { location: { latLng: { latitude: from.lat, longitude: from.lng } } },
      destination: { location: { latLng: { latitude: to.lat, longitude: to.lng } } },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_UNAWARE',
    }),
  })
  if (!resp.ok) {
    console.error('Routes API failed:', resp.status, await resp.text())
    return null
  }
  const data = await resp.json()
  const meters = data?.routes?.[0]?.distanceMeters
  return meters == null ? null : meters / 1000
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const s = await getShopSettings()

  // Bypass mode: the `contact` step's "ใช้ที่อยู่เดิม" replays a distance
  // already on file (the customer's last order, see /api/customer.js)
  // instead of asking the browser for a fresh GPS position. Recomputes
  // radius/fee from current settings rather than trusting a cached fee, so a
  // settings change since their last order is still honored.
  const bypassKm = Number(req.body?.distanceKm)
  if (req.body?.lat === undefined && Number.isFinite(bypassKm)) {
    const deliveryFee = calcDeliveryFee(bypassKm, { tiers: s.deliveryFeeTiers })
    return res.status(200).json({
      distanceKm: bypassKm,
      radiusKm: s.radiusKm,
      withinRadius: bypassKm <= s.radiusKm,
      method: 'cached',
      configured: true,
      deliveryFee,
    })
  }

  const lat = Number(req.body?.lat)
  const lng = Number(req.body?.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: 'พิกัดไม่ถูกต้อง' })
  }

  // Shop location not set → can't measure. Degrade gracefully ("warn but allow").
  if (!Number.isFinite(s.shopLat) || !Number.isFinite(s.shopLng)) {
    return res.status(200).json({ distanceKm: null, radiusKm: s.radiusKm, withinRadius: true, configured: false, deliveryFee: 0 })
  }

  const from = { lat: s.shopLat, lng: s.shopLng }
  const to = { lat, lng }

  try {
    let km = null
    if (s.distanceMethod === 'google' && s.googleApiKey) {
      km = await googleDrivingKm(s.googleApiKey, from, to)
    }
    // Straight-line either by choice, or as a fallback when Google is unavailable.
    if (km == null) {
      km = haversineKm(from.lat, from.lng, to.lat, to.lng)
    }

    const distanceKm = Math.round(km * 10) / 10
    // This is a preview only — the cart is still empty at the distance-check
    // step, so the "free delivery at ฿X" incentive can't be applied yet. The
    // real fee (accounting for itemsSubtotal) is computed in OrderFlow once
    // the customer has items, and re-verified server-side in /api/orders.
    const deliveryFee = calcDeliveryFee(distanceKm, { tiers: s.deliveryFeeTiers })
    return res.status(200).json({
      distanceKm,
      radiusKm: s.radiusKm,
      withinRadius: distanceKm <= s.radiusKm,
      method: s.distanceMethod === 'google' && s.googleApiKey ? 'google' : 'straight',
      configured: true,
      deliveryFee,
      shopLat: s.shopLat,
      shopLng: s.shopLng,
    })
  } catch (err) {
    console.error('delivery-distance error:', err)
    return res.status(200).json({ distanceKm: null, radiusKm: s.radiusKm, withinRadius: true, configured: true, deliveryFee: 0 })
  }
}
