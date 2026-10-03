import { siGooglepay, siInstagram, siMastercard, siPaytm, siPhonepe, siVisa, siWhatsapp } from "simple-icons";

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

/** Payment logos shown at checkout, in the brand's ink rather than their own colours. */
export const PAYMENT_LOGOS = [
  { name: "Google Pay", path: siGooglepay.path },
  { name: "PhonePe", path: siPhonepe.path },
  { name: "Paytm", path: siPaytm.path },
  { name: "Visa", path: siVisa.path },
  { name: "Mastercard", path: siMastercard.path },
] as const;

export function PaymentLogo({ path, ...props }: BrandIconProps & { path: string }) {
  return <BrandGlyph path={path} {...props} />;
}
