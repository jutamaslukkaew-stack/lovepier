// Flat "delivery confirmed" truck badge — cargo box with a checkmark, gold
// cab, dark wheels. Used on the delivery-method step (OrderFlow.js) next to
// "ให้ร้านจัดส่ง" (shop delivers) so the option reads at a glance instead of
// text-only. Plain inline SVG, no external asset — matches this file's
// sibling components (LocatingAnimation, OrderJourney) in staying
// self-contained.
export default function DeliveryTruckIcon({ size = 40, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* cargo box */}
      <rect x="4" y="10" width="24" height="22" rx="2.5" fill="#2FA86B" />
      <rect x="4" y="24" width="24" height="8" rx="2.5" fill="#1F9259" />
      <path d="M4 26.5H28V29.5H6.5C5.11929 29.5 4 28.3807 4 27V26.5Z" fill="#1F9259" />
      {/* checkmark */}
      <path
        d="M10.5 20.5L14.8 24.8L21.5 17"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* cab */}
      <path d="M28 17H37.5C38.6 17 39.5 17.7 39.9 18.7L42 24V30C42 31.1 41.1 32 40 32H28V17Z" fill="#F7BB1E" />
      <path d="M31.5 20H37L38.7 24H31.5V20Z" fill="#6B4A2B" />
      {/* wheels */}
      <circle cx="14" cy="34" r="4" fill="#3B3B3B" />
      <circle cx="14" cy="34" r="1.6" fill="#B9B9B9" />
      <circle cx="35" cy="34" r="4" fill="#3B3B3B" />
      <circle cx="35" cy="34" r="1.6" fill="#B9B9B9" />
      {/* axle strip so the wheels read as attached to the body */}
      <rect x="17" y="32.5" width="15" height="3" fill="#3B3B3B" />
    </svg>
  )
}
