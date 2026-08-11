type BrandMarkProps = {
  size?: number
  className?: string
  title?: string
}

/** Keystone mark — arch with amber crown keystone */
export function BrandMark({ size = 36, className, title = 'Keystone' }: BrandMarkProps) {
  const id = `ks-${size}`
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient id={id} x1="6" y1="2" x2="58" y2="62" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2A5F8A" />
          <stop offset="1" stopColor="#132033" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill={`url(#${id})`} />
      <rect x="15" y="34" width="6.5" height="14" rx="1.2" fill="#D7E3EF" />
      <rect x="42.5" y="34" width="6.5" height="14" rx="1.2" fill="#D7E3EF" />
      <path
        d="M18.2 34.2 C18.2 24.2 25.2 17.5 32 17.5 C38.8 17.5 45.8 24.2 45.8 34.2"
        stroke="#D7E3EF"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path d="M25.5 12.5 L38.5 12.5 L41.2 24.8 L22.8 24.8 Z" fill="#C47A11" />
      <path d="M24.2 24.8 H39.8 L37.6 32.2 H26.4 Z" fill="#E4AE4F" />
      <rect x="12" y="49" width="40" height="4" rx="2" fill="#C47A11" />
    </svg>
  )
}
