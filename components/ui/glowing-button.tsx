import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

interface GlowingButtonBaseProps {
  children: ReactNode;
  /** Classes for the clickable element: sizing, padding, text color/weight, shadow. */
  className?: string;
  /**
   * Classes for the inner mask that recreates the button's real face
   * (background + hover state). Use `group-hover:` for hover styles since
   * the clickable element carries the `group`.
   */
  maskClassName?: string;
  /**
   * Set when the clickable element itself uses `w-full`: the outer wrapper
   * needs an explicit width too, otherwise `w-full` has nothing definite to
   * resolve against (an `inline-block` wrapper shrink-wraps by default).
   */
  fullWidth?: boolean;
}

type LinkVariantProps = GlowingButtonBaseProps & {
  href: string;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children">;

type ButtonVariantProps = GlowingButtonBaseProps & {
  href?: undefined;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

type GlowingButtonProps = LinkVariantProps | ButtonVariantProps;

// Bright cyan -> intense blue neon sweep, wide arc so it reads as "on" at a
// glance instead of a faint blip that only shows for an instant per lap.
const GLOW_GRADIENT =
  "bg-[conic-gradient(from_0deg,transparent_0%,#22d3ee_10%,#2563eb_30%,#22d3ee_50%,transparent_65%)]";

/**
 * Wraps a pill-shaped CTA with a rotating neon conic-gradient ring: a crisp
 * ~3-4px ring right at the edge (clipped to the pill by the clickable
 * element's own `overflow-hidden`), plus a second, larger, blurred copy of
 * the same rotating gradient sitting *outside* that clipped element so the
 * light visibly bleeds/radiates beyond the button instead of staying
 * trapped inside the border.
 */
export function GlowingButton({
  children,
  className = "",
  maskClassName = "bg-white",
  fullWidth = false,
  href,
  ...props
}: GlowingButtonProps) {
  const ExternalGlow = (
    <span
      aria-hidden
      className={`absolute -inset-3 -z-10 rounded-full opacity-80 blur-xl animate-spin-glow motion-reduce:animate-none ${GLOW_GRADIENT}`}
    />
  );

  const innerLayers = (
    <>
      <span
        aria-hidden
        className={`absolute -inset-[35%] animate-spin-glow motion-reduce:animate-none ${GLOW_GRADIENT}`}
      />
      <span aria-hidden className={`absolute inset-[4px] rounded-full transition-colors ${maskClassName}`} />
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </>
  );

  const innerClassName = `group relative isolate inline-flex items-center justify-center overflow-hidden rounded-full ${className}`;

  return (
    <span className={`relative inline-block rounded-full ${fullWidth ? "w-full" : ""}`}>
      {ExternalGlow}
      {href ? (
        <Link href={href} className={innerClassName} {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}>
          {innerLayers}
        </Link>
      ) : (
        <button className={innerClassName} {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}>
          {innerLayers}
        </button>
      )}
    </span>
  );
}
