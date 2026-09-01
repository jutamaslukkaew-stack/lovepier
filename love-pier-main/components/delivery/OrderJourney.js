// Animated 3-step tracker: paid -> shop preparing -> heading out to them
// (delivery) or ready to collect (pickup). Driven by the real order status
// from /api/order-status via components/delivery/OrderStatus.js, which polls
// while the page is open — so `justChanged` marks the step the shop moved the
// order to WHILE the customer was watching, and that step alone gets the
// arrival animation. Keyframes live in styles/globals.css.
import { CheckCircle2, ChefHat, Bike, ShoppingBag, MessageCircle } from 'lucide-react'

// Which step each status lights up — so `justChanged` can be matched against
// the step being rendered rather than every step popping on any change.
const STEP_OF = { paid: 0, preparing: 1, done: 2 }

export default function OrderJourney({ method, status = 'paid', t, justChanged = null }) {
  const isPickup = method === 'pickup'
  const ThirdIcon = isPickup ? ShoppingBag : Bike
  const thirdLabel = isPickup ? t.journeyPickup : t.journeyDeliver
  const paidState = status === 'paid' ? 'active' : 'done'
  const prepState = status === 'preparing' ? 'active' : status === 'done' ? 'done' : 'upcoming'
  const finalState = status === 'done' ? 'active' : 'upcoming'
  const changedStep = justChanged != null ? STEP_OF[justChanged] : null

  return (
    <div className="w-full">
      {t.journeyTitle && (
        <p className="mb-3 px-0.5 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8c682c]">
          {t.journeyTitle}
        </p>
      )}
      <div className="flex items-start justify-center gap-0">
        <JourneyStep icon={CheckCircle2} label={t.journeyPaid} state={paidState} changed={changedStep === 0} />
        <Connector active={status === 'preparing' || status === 'done'} />
        <JourneyStep icon={ChefHat} label={t.journeyPrep} state={prepState} changed={changedStep === 1} />
        <Connector active={status === 'done'} />
        <JourneyStep icon={ThirdIcon} label={thirdLabel} state={finalState} changed={changedStep === 2} />
      </div>
      {t.journeyHint && (
        <p className="mt-3.5 flex items-start justify-center gap-1.5 px-1 text-center text-[11.5px] leading-[1.6] text-[#4a3520]/75">
          <MessageCircle size={13} strokeWidth={2.5} className="mt-[2px] shrink-0 text-[#06C755]" />
          <span>{t.journeyHint}</span>
        </p>
      )}
    </div>
  )
}

function JourneyStep({ icon: Icon, label, state, changed = false }) {
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
        <div
          // A CSS keyframe does not replay on re-render, so the arrival pop
          // would never be seen without remounting this node — hence the key.
          key={`${state}-${changed}`}
          className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-300 ${circleClass}`}
          // orderBadgePop's own keyframe already overshoots (0.4 → 1.12 →
          // 0.94 → 1), so the easing only has to decelerate — a springy
          // timing function on top of it would bounce the step twice.
          style={changed ? { animation: 'orderBadgePop 520ms cubic-bezier(0.22, 1, 0.36, 1) both' } : undefined}
        >
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
