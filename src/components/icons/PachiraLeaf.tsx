type PachiraLeafProps = {
  className?: string
  color?: string
  variant?: 'full' | 'compact'
}

/**
 * Pachira aquatica (money tree) palmate leaf icon.
 * - "full": five leaflets with stem and root flare
 * - "compact": tight canopy only, scaled up to fill the frame
 */
export function PachiraLeaf({ className = 'w-6 h-6', color = 'currentColor', variant = 'compact' }: PachiraLeafProps) {
  if (variant === 'full') {
    return (
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        {/* Center leaflet (tallest) */}
        <path
          d="M16 3C16 3 13.5 8 13.5 12.5C13.5 15.5 14.8 17 16 17C17.2 17 18.5 15.5 18.5 12.5C18.5 8 16 3 16 3Z"
          fill={color}
        />
        {/* Left-center leaflet */}
        <path
          d="M10 5.5C10 5.5 8.5 11 9.5 14.5C10.2 17 11.8 17.5 12.8 17C13.8 16.5 14 14.8 13 11.5C11.5 6.5 10 5.5 10 5.5Z"
          fill={color}
        />
        {/* Right-center leaflet */}
        <path
          d="M22 5.5C22 5.5 23.5 11 22.5 14.5C21.8 17 20.2 17.5 19.2 17C18.2 16.5 18 14.8 19 11.5C20.5 6.5 22 5.5 22 5.5Z"
          fill={color}
        />
        {/* Far-left leaflet */}
        <path
          d="M5.5 9C5.5 9 6 14.5 8 17C9.5 19 11 18.8 11.5 17.8C12 16.8 11.2 15.2 9.5 13C7 9.5 5.5 9 5.5 9Z"
          fill={color}
        />
        {/* Far-right leaflet */}
        <path
          d="M26.5 9C26.5 9 26 14.5 24 17C22.5 19 21 18.8 20.5 17.8C20 16.8 20.8 15.2 22.5 13C25 9.5 26.5 9 26.5 9Z"
          fill={color}
        />
        {/* Stem */}
        <path
          d="M16 17L16 28"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        {/* Small root flare */}
        <path
          d="M14 26.5Q16 29 18 26.5"
          stroke={color}
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    )
  }

  // Compact: tight canopy only, leaflets pulled closer and scaled to fill frame
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Center leaflet */}
      <path
        d="M16 2C16 2 12.5 9 12.5 15C12.5 19.5 14.2 22 16 22C17.8 22 19.5 19.5 19.5 15C19.5 9 16 2 16 2Z"
        fill={color}
      />
      {/* Left-center leaflet */}
      <path
        d="M9 5C9 5 6.5 13 8 18C9 21.5 11.2 22.5 12.8 21.5C14.4 20.5 14.5 18 13 13.5C10.8 7 9 5 9 5Z"
        fill={color}
      />
      {/* Right-center leaflet */}
      <path
        d="M23 5C23 5 25.5 13 24 18C23 21.5 20.8 22.5 19.2 21.5C17.6 20.5 17.5 18 19 13.5C21.2 7 23 5 23 5Z"
        fill={color}
      />
      {/* Far-left leaflet */}
      <path
        d="M4 10C4 10 4.5 18 7.5 22C9.8 25 12 24.5 12.8 23C13.6 21.5 12.5 19 10 16C6.5 11.5 4 10 4 10Z"
        fill={color}
      />
      {/* Far-right leaflet */}
      <path
        d="M28 10C28 10 27.5 18 24.5 22C22.2 25 20 24.5 19.2 23C18.4 21.5 19.5 19 22 16C25.5 11.5 28 10 28 10Z"
        fill={color}
      />
    </svg>
  )
}
