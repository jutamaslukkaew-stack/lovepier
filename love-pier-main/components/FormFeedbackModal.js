import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export default function FormFeedbackModal({
  open,
  variant = 'success',
  title,
  message,
  closeLabel,
  onClose,
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open || !mounted) return null

  const isError = variant === 'error'

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-ink/55 backdrop-blur-[2px]"
        aria-label={closeLabel}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-feedback-title"
        className="relative w-full max-w-[420px] bg-bg border border-black/10 px-8 py-10 sm:px-10 sm:py-12 text-center shadow-[0_24px_48px_rgba(0,0,0,0.12)]"
      >
        <div
          className={`mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border text-lg ${
            isError
              ? 'border-[#c45c5c]/40 text-[#a44] bg-[#fff5f5]'
              : 'border-gold/40 text-gold bg-[#fffdf6]'
          }`}
          aria-hidden
        >
          {isError ? '!' : '✓'}
        </div>
        <h3
          id="form-feedback-title"
          className="font-display text-[clamp(28px,4vw,36px)] font-light leading-[1.1] text-ink mb-4"
        >
          {title}
        </h3>
        <p className="text-sm text-[#666] leading-[1.85] font-light mb-8">{message}</p>
        <button
          type="button"
          onClick={onClose}
          className="inline-block bg-ink text-bg text-[11px] tracking-[0.25em] uppercase px-7 py-3.5 hover:bg-gold hover:text-ink transition-colors duration-300 cursor-pointer"
        >
          {closeLabel}
        </button>
      </div>
    </div>,
    document.body
  )
}
