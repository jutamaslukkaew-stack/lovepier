// Lottie search animation (while scanning) + pin-drop (once found), shown
// while we look up the customer's GPS position and compute the delivery
// distance. The scanning animation is a hosted Lottie file rendered via the
// <dotlottie-wc> web component (script loaded once via next/script below);
// the pin-drop is a small CSS keyframe (see styles/globals.css: pinDrop).
//
// phase: 'locating' (waiting on navigator.geolocation) | 'calculating'
// (got coords, computing distance) | 'found' (done — pin drops in).
//
// tone colors the status text so the outcome reads at a glance: 'success'
// (within delivery radius), 'warning' (outside radius — needs the customer's
// attention, not just a flash), or 'neutral' (still scanning / unknown).
import Script from 'next/script'

export default function LocatingAnimation({ phase, statusText, tone = 'neutral' }) {
  const scanning = phase === 'locating' || phase === 'calculating'
  const toneClass =
    tone === 'success' ? 'text-emerald-700' :
    tone === 'warning' ? 'text-amber-700' :
    'text-[#4a3520]/80'

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-10">
      <Script
        id="dotlottie-wc"
        type="module"
        src="https://unpkg.com/@lottiefiles/dotlottie-wc@0.9.14/dist/dotlottie-wc.js"
        strategy="afterInteractive"
      />

      <div className="relative w-40 h-40 flex items-center justify-center">
        {scanning && (
          <dotlottie-wc
            src="https://lottie.host/0cea9896-4b5b-446e-a85e-e262f12b3955/jnqkx5A7at.lottie"
            autoplay
            loop
            style={{ width: '160px', height: '160px' }}
          />
        )}

        {/* pin drop once found */}
        {phase === 'found' && (
          <span
            className="relative text-[34px] leading-none"
            style={{ animation: 'pinDrop 0.6s cubic-bezier(.34,1.56,.64,1) forwards' }}
          >📍</span>
        )}
      </div>

      <p className={`text-[15px] ${toneClass} font-semibold text-center px-6 min-h-[1.5em] leading-snug`}>
        {statusText}
      </p>
    </div>
  )
}
