import path from "node:path";

import { Document, Font, Page, Path, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";

import { ELEPHANT, WORDMARK } from "@/components/ui/logo-paths";
import type { CustomerOrder, InvoiceSettings } from "@/lib/data/order";
import { formatPrice } from "@/lib/format/price";

// The customer's bill, on brand. Rendered once when payment is confirmed and
// stored in the private "invoices" bucket. Fonts are bundled TTFs (the
// built-in PDF fonts have no ₹ sign); see next.config.ts outputFileTracingIncludes.

const FONT_DIR = path.join(process.cwd(), "src/fonts/pdf");
Font.register({
  family: "Montserrat",
  fonts: [
    { src: path.join(FONT_DIR, "Montserrat-Regular.ttf"), fontWeight: 400 },
    { src: path.join(FONT_DIR, "Montserrat-Medium.ttf"), fontWeight: 500 },
    { src: path.join(FONT_DIR, "Montserrat-SemiBold.ttf"), fontWeight: 600 },
  ],
});
Font.register({
  family: "STIX",
  fonts: [
    { src: path.join(FONT_DIR, "STIXTwoText-Regular.ttf"), fontWeight: 400 },
    { src: path.join(FONT_DIR, "STIXTwoText-Medium.ttf"), fontWeight: 500 },
    { src: path.join(process.cwd(), "src/fonts/STIXTwoText-Italic.ttf"), fontWeight: 400, fontStyle: "italic" },
  ],
});
Font.registerHyphenationCallback((word) => [word]);

const INK = "#311829";
const GOLD = "#b4a07c";
const MIST = "#e5e5e5";
const IVORY = "#f9eee1";

const s = StyleSheet.create({
  page: { fontFamily: "Montserrat", fontSize: 9, color: INK, paddingTop: 40, paddingBottom: 56, paddingHorizontal: 44, lineHeight: 1.45 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  tagline: { fontFamily: "STIX", fontStyle: "italic", fontSize: 10, color: GOLD, marginTop: 4 },
  title: { fontFamily: "STIX", fontSize: 20, fontWeight: 500, textAlign: "right" },
  meta: { textAlign: "right", marginTop: 6, fontSize: 8.5 },
  rule: { borderBottomWidth: 0.75, borderBottomColor: GOLD, marginVertical: 18 },
  cols: { flexDirection: "row", gap: 24 },
  col: { flex: 1 },
  label: { fontSize: 7, fontWeight: 600, letterSpacing: 1.4, textTransform: "uppercase", color: GOLD, marginBottom: 4 },
  strong: { fontWeight: 600 },
  table: { marginTop: 22 },
  th: { flexDirection: "row", backgroundColor: IVORY, paddingVertical: 6, paddingHorizontal: 8, fontSize: 7, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase" },
  tr: { flexDirection: "row", paddingVertical: 8, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: MIST },
  cItem: { flex: 1 },
  cQty: { width: 40, textAlign: "center" },
  cPrice: { width: 80, textAlign: "right" },
  totals: { marginTop: 12, marginLeft: "auto", width: 240 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  grand: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.75, borderTopColor: INK, marginTop: 6, paddingTop: 8, fontSize: 11, fontWeight: 600 },
  muted: { color: "#6e5d68" },
  payment: { marginTop: 22, padding: 10, backgroundColor: IVORY },
  footer: { position: "absolute", left: 44, right: 44, bottom: 28, fontSize: 7.5, color: "#6e5d68", textAlign: "center", borderTopWidth: 0.5, borderTopColor: MIST, paddingTop: 8 },
});

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

function Logo() {
  // Paths traced from the brand PNGs (src/components/ui/logo-paths.ts).
  const [, , ew, eh] = ELEPHANT.viewBox.split(" ").map(Number);
  const [, , ww, wh] = WORDMARK.viewBox.split(" ").map(Number);
  return (
    <View style={s.brand}>
      <Svg viewBox={ELEPHANT.viewBox} style={{ width: (34 * ew) / eh, height: 34 }}>
        <Path d={ELEPHANT.d} fill={INK} fillRule="evenodd" />
      </Svg>
      <View>
        <Svg viewBox={WORDMARK.viewBox} style={{ width: 110, height: (110 * wh) / ww }}>
          <Path d={WORDMARK.d} fill={INK} fillRule="evenodd" />
        </Svg>
        <Text style={s.tagline}>Heirlooms, Reimagined</Text>
      </View>
    </View>
  );
}

const Row = ({ label, value, muted }: { label: string; value: string; muted?: boolean }) => (
  <View style={s.totalRow}>
    <Text style={muted ? s.muted : undefined}>{label}</Text>
    <Text style={muted ? s.muted : undefined}>{value}</Text>
  </View>
);

export function InvoiceDocument({ order, settings }: { order: CustomerOrder; settings: InvoiceSettings }) {
  const hasGst = Boolean(settings.gstin);
  const gross = order.total + order.gift_card_amount;
  const online = order.total;
  const date = dateFmt.format(new Date(order.paid_at ?? order.created_at));
  const addressLines = [
    order.address_line1,
    order.address_line2,
    order.landmark ? `Landmark: ${order.landmark}` : null,
    `${order.city}, ${order.state} ${order.pincode}`,
    order.country,
  ].filter(Boolean);

  return (
    <Document title={`Invoice ${order.invoice_number ?? order.order_number}`} author={settings.business_name} creator="Erayah">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Logo />
          <View>
            <Text style={s.title}>{hasGst ? "Tax Invoice" : "Invoice"}</Text>
            <View style={s.meta}>
              {order.invoice_number ? <Text>Invoice no. {order.invoice_number}</Text> : null}
              <Text>Order no. {order.order_number}</Text>
              <Text>Date {date}</Text>
            </View>
          </View>
        </View>

        <View style={s.rule} />

        <View style={s.cols}>
          <View style={s.col}>
            <Text style={s.label}>Sold by</Text>
            <Text style={s.strong}>{settings.business_name}</Text>
            {settings.business_address ? <Text>{settings.business_address}</Text> : null}
            {hasGst ? <Text>GSTIN {settings.gstin}</Text> : null}
          </View>
          <View style={s.col}>
            <Text style={s.label}>Bill to</Text>
            <Text style={s.strong}>{order.customer_name}</Text>
            {order.email ? <Text>{order.email}</Text> : null}
            <Text>+91 {order.phone}</Text>
          </View>
          <View style={s.col}>
            <Text style={s.label}>Ship to</Text>
            <Text style={s.strong}>{order.customer_name}</Text>
            {addressLines.map((line) => (
              <Text key={line}>{line}</Text>
            ))}
          </View>
        </View>

        <View style={s.table}>
          <View style={s.th}>
            <Text style={s.cItem}>Item</Text>
            <Text style={s.cQty}>Qty</Text>
            <Text style={s.cPrice}>Unit price</Text>
            <Text style={s.cPrice}>Amount</Text>
          </View>
          {order.items.map((item) => (
            <View key={item.id} style={s.tr} wrap={false}>
              <Text style={s.cItem}>
                {item.name_snapshot}
                {item.variant_label ? ` · ${item.variant_label}` : ""}
              </Text>
              <Text style={s.cQty}>{item.quantity}</Text>
              <Text style={s.cPrice}>{formatPrice(item.unit_price)}</Text>
              <Text style={s.cPrice}>{formatPrice(item.line_total)}</Text>
            </View>
          ))}
        </View>

        <View style={s.totals} wrap={false}>
          <Row label="Subtotal" value={formatPrice(order.subtotal)} />
          <Row label="Shipping" value={order.shipping_fee ? formatPrice(order.shipping_fee) : "Free"} />
          {hasGst && !settings.prices_include_gst ? (
            <Row label={`GST @ ${Number(settings.gst_rate)}%`} value={formatPrice(order.gst_amount)} />
          ) : null}
          <View style={s.grand}>
            <Text>Total</Text>
            <Text>{formatPrice(gross)}</Text>
          </View>
          {hasGst && settings.prices_include_gst ? (
            <Row muted label={`Includes GST @ ${Number(settings.gst_rate)}%`} value={formatPrice(order.gst_amount)} />
          ) : null}
        </View>

        <View style={s.payment} wrap={false}>
          <Text style={s.label}>Payment</Text>
          {order.gift_card_amount > 0 ? (
            <Text>
              Gift card {order.gift_card_code}: {formatPrice(order.gift_card_amount)}
            </Text>
          ) : null}
          {online > 0 ? (
            <Text>
              Paid online via Razorpay: {formatPrice(online)}
              {order.razorpay_payment_id ? ` · Payment ID ${order.razorpay_payment_id}` : ""}
            </Text>
          ) : null}
        </View>

        <Text style={s.footer} fixed>
          Returns only for pieces damaged in transit or incorrect pieces received, unworn and in original packaging; credit is issued as a gift card valid for 12 months. Thank you for choosing Erayah.
        </Text>
      </Page>
    </Document>
  );
}
