// Recall's brand mark: a looping arrow forming a partial circle,
// representing the spaced-repetition review cycle the app is built
// around. Used anywhere the app previously showed a plain "R" badge.
export default function RecallMark({ size = 20, color = '#fff' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 4.5a7.5 7.5 0 1 1-6.78 4.3"
        stroke={color}
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <path
        d="M3.6 4.6l1 4.6 4.5-1.3"
        stroke={color}
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.1" fill={color} />
    </svg>
  )
}
