type P = { size?: number }
const s = (size = 18) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const })

export const IconTower = ({ size }: P) => (
  <svg {...s(size)}><path d="M12 6v0M8.5 3.5a5 5 0 0 0 0 5M15.5 3.5a5 5 0 0 1 0 5" /><path d="M12 7l-5 14M12 7l5 14M9 15h6M8 18.5h8" /></svg>
)
export const IconCheck = ({ size = 14 }: P) => (
  <svg {...s(size)} strokeWidth={2.4}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
)
export const IconX = ({ size = 14 }: P) => (
  <svg {...s(size)} strokeWidth={2.4}><path d="M6 6l12 12M18 6L6 18" /></svg>
)
export const IconArrow = ({ size = 14 }: P) => (
  <svg {...s(size)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
)
export const IconPin = ({ size = 22 }: P) => (
  <svg {...s(size)}><path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.3" /></svg>
)
export const IconAlert = ({ size = 22 }: P) => (
  <svg {...s(size)}><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.3v.2" /></svg>
)
export const IconDownload = ({ size = 16 }: P) => (
  <svg {...s(size)}><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>
)
export const IconUp = ({ size = 12 }: P) => (
  <svg {...s(size)} strokeWidth={2.2}><path d="M12 19V5M6 11l6-6 6 6" /></svg>
)
export const IconDown = ({ size = 12 }: P) => (
  <svg {...s(size)} strokeWidth={2.2}><path d="M12 5v14M6 13l6 6 6-6" /></svg>
)

export const EmbLogo = ({ lg }: { lg?: boolean }) => (
  <span className={`emb${lg ? ' lg' : ''}`}>
    <span>EMB<br />GLOBAL</span>
    <svg width={lg ? 16 : 9} height={lg ? 16 : 9} viewBox="0 0 20 20" aria-hidden>
      {[0, 45, 90, 135].map((r) => (
        <ellipse key={r} cx="10" cy="10" rx="2.3" ry="8" fill="#2E9E5B" transform={`rotate(${r} 10 10)`} />
      ))}
    </svg>
  </span>
)

export const Wordmark = ({ lg }: { lg?: boolean }) => <span className={`wordmark${lg ? ' lg' : ''}`}>Rakuten</span>
