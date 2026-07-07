// Driving-distance check via the Google Routes API (computeRoutes).
// The API key stays server-side. Given the customer's coordinates, returns the
// driving distance from the shop and whether it's within the delivery radius.

const API_KEY = process.env.GOOGLE_MAPS_API_KEY || ''
const SHOP_LAT = parseFloat(process.env.SHOP_LAT || '')
const SHOP_LNG = parseFloat(process.env.SHOP_LNG || '')
const RADIUS_KM = parseFloat(process.env.DELIVERY_RADIUS_KM || '5')

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const lat = Number(req.body?.lat)
  const lng = Number(req.body?.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: 'พิกัดไม่ถูกต้อง' })
  }

  // If the shop location or API key isn't configured, degrade gracefully:
  // report distance as unknown so the checkout ("warn but allow") still works.
  if (!API_KEY || !Number.isFinite(SHOP_LAT) || !Number.isFinite(SHOP_LNG)) {
    return res.status(200).json({ distanceKm: null, radiusKm: RADIUS_KM, withinRadius: true, configured: false })
  }

  try {
    const resp = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration',
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: SHOP_LAT, longitude: SHOP_LNG } } },
        destination: { location: { latLng: { latitude: lat, longitude: lng } } },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_UNAWARE',
      }),
    })

    if (!resp.ok) {
      console.error('Routes API failed:', resp.status, await resp.text())
      return res.status(200).json({ distanceKm: null, radiusKm: RADIUS_KM, withinRadius: true, configured: true })
    }

    const data = await resp.json()
    const meters = data?.routes?.[0]?.distanceMeters
    if (meters == null) {
      return res.status(200).json({ distanceKm: null, radiusKm: RADIUS_KM, withinRadius: true, configured: true })
    }

    const distanceKm = Math.round((meters / 1000) * 10) / 10
    return res.status(200).json({
      distanceKm,
      radiusKm: RADIUS_KM,
      withinRadius: distanceKm <= RADIUS_KM,
      configured: true,
    })
  } catch (err) {
    console.error('delivery-distance error:', err)
    return res.status(200).json({ distanceKm: null, radiusKm: RADIUS_KM, withinRadius: true, configured: true })
  }
}
