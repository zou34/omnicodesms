import { useId } from "react";

// Logo FlashCodeSMS : un éclair dans une bulle de message. Mêmes tracés que
// app/icon.svg (favicon, icônes PWA) — à modifier ensemble.
export function LogoMark({ className, withBackground = false }: { className?: string; withBackground?: boolean }) {
  // Identifiants de dégradé uniques : plusieurs logos sur une même page ne
  // doivent pas se voler leurs <linearGradient>.
  const id = useId().replace(/:/g, "");

  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-bubble`} x1="96" y1="112" x2="416" y2="426" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id={`${id}-bolt`} x1="192" y1="136" x2="320" y2="346" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fde047" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      {withBackground && <rect width="512" height="512" rx="112" fill="#0f172a" />}
      <path
        d="M150 112H362A54 54 0 0 1 416 166V314A54 54 0 0 1 362 368H222L150 426V368A54 54 0 0 1 96 314V166A54 54 0 0 1 150 112Z"
        fill={`url(#${id}-bubble)`}
      />
      <path
        className="logo-bolt"
        d="M286 136L192 264H248L226 346L320 212H264Z"
        fill={`url(#${id}-bolt)`}
        stroke="#0f172a"
        strokeWidth="10"
        strokeLinejoin="round"
        paintOrder="stroke"
      />
    </svg>
  );
}
