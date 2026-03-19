export default function LogoMark({ className = "", title = "Commutr logo" }) {
  const classes = ["logo-mark", className].filter(Boolean).join(" ");

  return (
    <svg
      className={classes}
      viewBox="0 0 256 256"
      preserveAspectRatio="xMidYMid meet"
      aria-label={title}
      role="img"
    >
      <circle
        cx="128"
        cy="128"
        r="86"
        fill="none"
        stroke="currentColor"
        strokeWidth="16"
        strokeLinecap="round"
        strokeDasharray="430 140"
        transform="rotate(36 128 128)"
      />
      <circle
        cx="128"
        cy="128"
        r="52"
        fill="none"
        stroke="currentColor"
        strokeWidth="16"
        strokeLinecap="round"
        strokeDasharray="260 110"
        transform="rotate(42 128 128)"
      />
      <circle
        cx="128"
        cy="128"
        r="68"
        fill="none"
        stroke="#78b8ff"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray="118 308"
        transform="rotate(-18 128 128)"
      />
      <circle cx="196" cy="128" r="18" fill="#9ed5ff" />
      <circle cx="196" cy="128" r="8" fill="currentColor" />
      <circle
        cx="196"
        cy="128"
        r="26"
        fill="none"
        stroke="#d2ecff"
        strokeWidth="4"
      />
    </svg>
  );
}
