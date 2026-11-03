export default function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="1.5"
        y="1.5"
        width="29"
        height="29"
        rx="7"
        stroke="url(#lg1)"
        strokeWidth="1.6"
        fill="rgba(34,211,238,0.06)"
      />
      <path
        d="M7 22 L7 13 L13 13 L13 19 L20 19 L20 10 L25 10"
        stroke="#a3e635"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="7" cy="22" r="2.6" fill="#22d3ee" />
      <circle cx="25" cy="10" r="2.6" fill="#e879f9" />
      <defs>
        <linearGradient id="lg1" x1="0" y1="0" x2="32" y2="32">
          <stop stopColor="#22d3ee" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
    </svg>
  );
}