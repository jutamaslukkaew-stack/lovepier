// Module-scoped (per-tab) cache of what DeliveryGate already learned — LINE
// profile and delivery distance/fee — so CartDrawer doesn't ask the customer
// to log in or share their location a second time at checkout.
let _profile = null
let _distance = null // { distanceKm, deliveryFee, withinRadius, radiusKm }

export function setDeliverySessionProfile(profile) {
  if (profile) _profile = profile
}

export function setDeliverySessionDistance(distance) {
  if (distance) _distance = distance
}

export function getDeliverySession() {
  return { profile: _profile, distance: _distance }
}
