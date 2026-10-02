import type { LucideIcon, LucideProps } from "lucide-react";

type IconProps = LucideProps & { icon: LucideIcon };

/** Lucide icon with Erayah's fine 1.25 stroke. Decorative by default. */
export function Icon({ icon: Glyph, size = 20, strokeWidth = 1.25, ...props }: IconProps) {
  return <Glyph size={size} strokeWidth={strokeWidth} absoluteStrokeWidth aria-hidden="true" focusable="false" {...props} />;
}
