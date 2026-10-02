import { siInstagram, siWhatsapp } from "simple-icons";

type BrandIconProps = { size?: number; className?: string };

function BrandGlyph({ path, size = 20, className }: BrandIconProps & { path: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d={path} />
    </svg>
  );
}

export function WhatsAppGlyph(props: BrandIconProps) {
  return <BrandGlyph path={siWhatsapp.path} {...props} />;
}

export function InstagramGlyph(props: BrandIconProps) {
  return <BrandGlyph path={siInstagram.path} {...props} />;
}
