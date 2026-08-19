// Animated 3-step tracker shown on the order success screen once payment is
// verified (slipStatus === 'ok') — reassures the customer their order is
// actually moving: paid -> shop preparing -> heading out to them (delivery)
// or ready to collect (pickup). Purely presentational / client-derived, no
// real-time backend status; keyframes live in styles/globals.css.
import { CheckCircle2, ChefHat, Bike, ShoppingBag } from 'lucide-react'

export default function OrderJourney({ method, status = 'paid', t }) {
  const isPickup = method === 'pickup'
  const ThirdIcon = isPickup ? ShoppingBag : Bike
  const thirdLabel = isPickup ? t.journeyPickup : t.journeyDeliver
  const paidState = status === 'paid' ? 'active' : 'done'
  const prepState = status === 'preparing' ? 'active' : status === 'done' ? 'done' : 'upcoming'
  const finalState = status === 'done' ? 'active' : 'upcoming'

  return (
    <div className="w-full flex items-start justify-center gap-0">
      <JourneyStep icon={CheckCircle2} label={t.journeyPaid} state={paidState} />
      <Connector active={status === 'preparing' || status === 'done'} />
      <JourneyStep icon={ChefHat} label={t.journeyPrep} state={prepState} />
      <Connector active={status === 'done'} />
      <JourneyStep icon={ThirdIcon} label={thirdLabel} state={finalState} />
    </div>
  )
}

function JourneyStep({ icon: Icon, label, state }) {
  const circleClass =
    state === 'done'
      ? 'bg-[#3a2818] text-white'
      : state === 'active'
      ? 'bg-white text-[#8c682c] border-2 border-[#8c682c]'
      : 'bg-black/[0.05] text-black/30'

  // flex-1 rather than a fixed 76px: the Thai labels ("ร้านกำลังเตรียม") and the
  // English ones ("Out for delivery") are both wider than 76px, so a fixed
  // width pushed them outside the card and clipped them.
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
      <div className="relative flex items-center justify-center">
        {state === 'active' && (
          <span
            className="absolute inset-0 rounded-full border-2 border-[#c9a96e]"
            style={{ animation: 'orderStepRing 1.8s ease-out infinite' }}
          />
        )}
        <div className={`relative w-9 h-9 rounded-full flex items-center justify-center ${circleClass}`}>
          <Icon
            size={17}
            strokeWidth={2.25}
            style={state === 'active' ? { animation: 'orderStepBob 1.4s ease-in-out infinite' } : undefined}
          />
        </div>
      </div>
      {/* leading-[1.5], not leading-tight: Thai tone marks and descenders sit
          outside the tight line box and were being cut off. */}
      <span className={`px-0.5 text-center text-[11px] leading-[1.5] ${state === 'upcoming' ? 'text-black/35' : 'text-[#4a3520]'}`}>
        {label}
      </span>
    </div>
  )
}

function Connector({ active = false }) {
  return (
    <div className="relative flex h-9 w-6 shrink-0 items-center">
      <div className={`w-full h-[2px] rounded-full ${active ? 'bg-[#c9a96e]/60' : 'bg-black/[0.08]'}`} />
      {active && (
        <span
          className="absolute top-1/2 w-1.5 h-1.5 rounded-full bg-[#c9a96e] shadow-[0_0_4px_rgba(201,169,110,0.8)]"
          style={{ animation: 'orderTravelDot 1.8s ease-in-out infinite', marginTop: '-3px' }}
        />
      )}
    </div>
  )
}
