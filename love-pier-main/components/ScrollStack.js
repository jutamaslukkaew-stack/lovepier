export function ScrollStack({ children, className = '' }) {
  return <div className={`scroll-stack ${className}`.trim()}>{children}</div>
}

export function ScrollStackPanel({ children, className = '', tone = 'bg' }) {
  const bg = tone === 'white' ? 'bg-white' : 'bg-bg'
  return (
    <div className={`scroll-stack__panel ${bg} ${className}`.trim()}>
      {children}
    </div>
  )
}
