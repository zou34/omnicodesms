import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

interface GlowingButtonBaseProps {
  children: ReactNode;
  /** Classes for the outer element: sizing, padding, text color/weight, shadow. */
  className?: string;
  /**
   * Classes for the inner mask that recreates the button's real face
   * (background + hover state). Use `group-hover:` for hover styles since
   * the outer element carries the `group`.
   */
  maskClassName?: string;
}

type LinkVariantProps = GlowingButtonBaseProps & {
  href: string;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children">;

type ButtonVariantProps = GlowingButtonBaseProps & {
  href?: undefined;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

type GlowingButtonProps = LinkVariantProps | ButtonVariantProps;

/**
 * Wraps a pill-shaped CTA with a slowly rotating conic-gradient ring —
 * only the ~2px border is visible, the rest is masked by a layer that
 * recreates the button's real background (`maskClassName`), so the glow
 * reads as a subtle rotating highlight rather than a filled spinner.
 */
export function GlowingButton({ children, className = "", maskClassName = "bg-white", href, ...props }: GlowingButtonProps) {
  const layers = (
    <>
      <span
        aria-hidden
        className="absolute -inset-[35%] animate-spin-glow bg-[conic-gradient(from_0deg,transparent_0%,#38bdf8_18%,transparent_40%)] motion-reduce:animate-none"
      />
      <span aria-hidden className={`absolute inset-[2px] rounded-full transition-colors ${maskClassName}`} />
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </>
  );

  const outerClassName = `group relative isolate inline-flex items-center justify-center overflow-hidden rounded-full ${className}`;

  if (href) {
    return (
      <Link href={href} className={outerClassName} {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {layers}
      </Link>
    );
  }

  return (
    <button className={outerClassName} {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {layers}
    </button>
  );
}
