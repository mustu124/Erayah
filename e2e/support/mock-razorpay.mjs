// A stand-in for Razorpay's Orders API, used by the checkout end-to-end tests
// (the app points at it through RAZORPAY_API_BASE). Run: node e2e/support/mock-razorpay.mjs
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_RAZORPAY_PORT ?? 3199);
const orders = [];

createServer((req, res) => {
  const send = (status, body) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };
  if (req.method === "GET" && req.url === "/health") return send(200, { ok: true });
  if (req.method === "GET" && req.url === "/__orders") return send(200, orders);
  if (req.method === "POST" && req.url === "/v1/orders") {
    if (!req.headers.authorization?.startsWith("Basic ")) return send(401, { error: { description: "auth" } });
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      const body = JSON.parse(raw);
      if (!Number.isInteger(body.amount) || body.amount < 100 || body.currency !== "INR") {
        return send(400, { error: { description: "bad amount" } });
      }
      const order = {
        id: `order_${randomBytes(7).toString("hex")}`,
        entity: "order",
        amount: body.amount,
        currency: body.currency,
        receipt: body.receipt,
        notes: body.notes,
        status: "created",
      };
      orders.push(order);
      send(200, order);
    });
    return;
  }
  send(404, { error: { description: "not found" } });
}).listen(PORT, () => console.log(`mock razorpay on ${PORT}`));
