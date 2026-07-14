// Radar-sweep + pulse-ring + pin-drop animation shown while we look up the
// customer's GPS position and compute the delivery distance. Pure CSS
// keyframes (see styles/globals.css: radarSpin / pulseRing / pinDrop) — no
// animation library needed.
//
// phase: 'locating' (waiting on navigator.geolocation) | 'calculating'
// (got coords, computing distance) | 'found' (done — pin drops in).
export default function LocatingAnimation({ phase, statusText }) {
  const scanning = phase === 'locating' || phase === 'calculating'

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-10">
      <div className="relative w-40 h-40 flex items-center justify-center">
        {/* pulse rings */}
        {scanning && (
          <>
            <span
              className="absolute inset-0 rounded-full border-2 border-[#4a3520]/40"
              style={{ animation: 'pulseRing 2.2s ease-out infinite' }}
            />
            <span
              className="absolute inset-0 rounded-full border-2 border-[#4a3520]/40"
              style={{ animation: 'pulseRing 2.2s ease-out infinite', animationDelay: '0.7s' }}
            />
            <span
              className="absolute inset-0 rounded-full border-2 border-[#4a3520]/40"
              style={{ animation: 'pulseRing 2.2s ease-out infinite', animationDelay: '1.4s' }}
            />
          </>
        )}

        {/* radar sweep */}
        {scanning && (
          <div className="absolute inset-2 rounded-full overflow-hidden">
            <div
              className="absolute inset-0"
              style={{
                animation: 'radarSpin 1.6s linear infinite',
                background: 'conic-gradient(from 0deg, rgba(74,53,32,0.35), transparent 35%)',
              }}
            />
          </div>
        )}

        {/* base ring */}
        <div className="absolute inset-2 rounded-full border border-[#4a3520]/15 bg-[#faf8f5]" />

        {/* center marker: dot while scanning, pin once found */}
        {phase === 'found' ? (
          <span
            className="relative text-[34px] leading-none"
            style={{ animation: 'pinDrop 0.6s cubic-bezier(.34,1.56,.64,1) forwards' }}
          >📍</span>
        ) : (
          <span className="relative w-3 h-3 rounded-full bg-[#4a3520]" />
        )}
      </div>

      <p className="text-[13px] text-[#4a3520]/80 font-medium text-center px-6 min-h-[1.5em]">
        {statusText}
      </p>
    </div>
  )
}
