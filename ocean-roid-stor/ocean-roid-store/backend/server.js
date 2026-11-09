/* Ocean Roid: starter backend (no dependencies, just Node.js 18+)
   Run:  node server.js     then open http://localhost:3000
   - Serves the website from ../frontend
   - GET  /api/products   -> product list (products.json)
   - POST /api/orders     -> saves an order to data/orders.json (price is calculated here, not trusted from the browser)
   - GET  /api/orders     -> list orders, needs header  x-admin-key: <ADMIN_KEY>
   - PATCH /api/orders/:id -> change status {"status":"paid"}, needs the same header
   Set ADMIN_KEY as an environment variable before using the admin routes. */
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || "";
const FRONT = path.join(__dirname, "..", "frontend");
const PRODUCTS_FILE = path.join(__dirname, "products.json");
const ORDERS_FILE = path.join(__dirname, "data", "orders.json");
const STATUSES = ["new", "confirmed", "paid", "printing", "shipped", "delivered", "cancelled"];
const MIME = {".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",
  ".json":"application/json; charset=utf-8",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".svg":"image/svg+xml",".ico":"image/x-icon",".webp":"image/webp"};

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { return fallback; }
}
function writeJSON(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}
function send(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify(obj));
}
function body(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => { raw += c; if (raw.length > 100000) { reject(new Error("too large")); req.destroy(); } });
    req.on("end", () => { try { resolve(JSON.parse(raw || "{}")); } catch (e) { reject(e); } });
    req.on("error", reject);
  });
}
const isAdmin = (req) => ADMIN_KEY && req.headers["x-admin-key"] === ADMIN_KEY;
const clean = (s, max) => String(s == null ? "" : s).trim().slice(0, max);

async function api(req, res, url) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, x-admin-key", "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS" });
    return res.end();
  }
  if (url.pathname === "/api/products" && req.method === "GET") return send(res, 200, readJSON(PRODUCTS_FILE, []));

  if (url.pathname === "/api/orders" && req.method === "POST") {
    let data;
    try { data = await body(req); } catch (e) { return send(res, 400, { error: "Invalid request" }); }
    const c = data.customer || {};
    const customer = { name: clean(c.name, 80), phone: clean(c.phone, 20), city: clean(c.city, 60), address: clean(c.address, 300), note: clean(c.note, 500) };
    if (!customer.name || customer.phone.length < 8 || !customer.city || !customer.address) return send(res, 400, { error: "Name, phone, city and address are required" });
    if (!Array.isArray(data.items) || !data.items.length || data.items.length > 30) return send(res, 400, { error: "Cart is empty" });
    const products = readJSON(PRODUCTS_FILE, []);
    const lines = [];
    for (const it of data.items) {
      const p = products.find((x) => x.id === Number(it.id));
      const qty = Math.floor(Number(it.qty));
      if (!p || !(qty >= 1 && qty <= 100)) return send(res, 400, { error: "Invalid item" });
      lines.push({ id: p.id, name: p.n, finish: p.f, pack: p.q, price: p.p, qty, lineTotal: p.p * qty });
    }
    const total = lines.reduce((s, l) => s + l.lineTotal, 0);
    const orders = readJSON(ORDERS_FILE, []);
    const order = { id: "OR-" + Date.now().toString(36).toUpperCase(), createdAt: new Date().toISOString(), status: "new", customer, items: lines, itemsTotal: total, shipping: null };
    orders.push(order);
    writeJSON(ORDERS_FILE, orders);
    return send(res, 201, { ok: true, orderId: order.id, itemsTotal: total });
  }

  if (url.pathname === "/api/orders" && req.method === "GET") {
    if (!isAdmin(req)) return send(res, 401, { error: "Unauthorized" });
    return send(res, 200, readJSON(ORDERS_FILE, []));
  }

  const m = url.pathname.match(/^\/api\/orders\/([A-Za-z0-9-]+)$/);
  if (m && req.method === "PATCH") {
    if (!isAdmin(req)) return send(res, 401, { error: "Unauthorized" });
    let data;
    try { data = await body(req); } catch (e) { return send(res, 400, { error: "Invalid request" }); }
    if (!STATUSES.includes(data.status)) return send(res, 400, { error: "Status must be one of: " + STATUSES.join(", ") });
    const orders = readJSON(ORDERS_FILE, []);
    const o = orders.find((x) => x.id === m[1]);
    if (!o) return send(res, 404, { error: "Order not found" });
    o.status = data.status;
    writeJSON(ORDERS_FILE, orders);
    return send(res, 200, o);
  }
  return send(res, 404, { error: "Not found" });
}

function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel === "/") rel = "/index.html";
  const file = path.normalize(path.join(FRONT, rel));
  if (!file.startsWith(FRONT)) { res.writeHead(403); return res.end("Forbidden"); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain" }); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream" });
    res.end(buf);
  });
}

http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname.startsWith("/api/")) return api(req, res, url).catch(() => send(res, 500, { error: "Server error" }));
  serveStatic(req, res, url);
}).listen(PORT, () => console.log("Ocean Roid running on http://localhost:" + PORT));
