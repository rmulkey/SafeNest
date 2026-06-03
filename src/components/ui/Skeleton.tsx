import { cn } from "@/lib/utils";

/**
 * Brand-styled skeleton placeholder.
 *
 * A muted, pulsing block used to build route-level loading states. The pulse
 * animation is automatically disabled for users who prefer reduced motion
 * (handled globally in globals.css via `prefers-reduced-motion`).
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-xl bg-muted", className)}
      {...props}
    />
  );
}
