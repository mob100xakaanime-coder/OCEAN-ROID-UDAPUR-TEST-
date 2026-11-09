# Ocean Roid Online Store

A ready website (frontend) plus a small starter backend. Orders work in two ways:
1. **WhatsApp only** (default): the customer's order opens in WhatsApp with all details.
2. **WhatsApp + backend**: the same order is also saved on your server, so you can track it.

## Folder structure

```
ocean-roid-store/
  frontend/
    index.html          page layout
    css/style.css       colours and design
    js/config.js        YOUR SETTINGS: WhatsApp number, Instagram, backend on/off
    js/products.js      default product list (used when backend is off)
    js/app.js           cart, filters, checkout
  backend/
    server.js           starter server (Node.js, no packages to install)
    products.json       product list served by the backend (edit prices here)
    data/orders.json    saved orders (created automatically)
    package.json
  README.md
```

## Step 1: Before anything else, edit `frontend/js/config.js`

- `WA_NUMBER`: your WhatsApp number with country code, no + or spaces (example: `919876543210`)
- `IG_USER`: your Instagram username

## Step 2A: Run the website only (no backend)

Open `frontend/index.html` in a browser. That's it.

## Step 2B: Run with the backend

1. Install Node.js 18 or newer from nodejs.org.
2. In the `frontend/js/config.js` file set `USE_BACKEND = true` (keep `API_BASE = ""`).
3. Open a terminal in the `backend` folder and run:

```
ADMIN_KEY=choose-a-long-secret npm start        (Mac/Linux)
set ADMIN_KEY=choose-a-long-secret && npm start   (Windows)
```

4. Open http://localhost:3000. Every order placed now also lands in `backend/data/orders.json`.

## API

| Method | URL | What it does |
|---|---|---|
| GET | `/api/products` | Returns all products |
| POST | `/api/orders` | Saves an order. Body: `{"customer":{"name","phone","city","address","note"},"items":[{"id":5,"qty":2}]}`. The server calculates the total from `products.json`, it never trusts prices sent by the browser. |
| GET | `/api/orders` | Lists orders. Needs header `x-admin-key: <ADMIN_KEY>` |
| PATCH | `/api/orders/:id` | Updates status. Body: `{"status":"paid"}`. Allowed: new, confirmed, paid, printing, shipped, delivered, cancelled |

## What to build next (suggested order)

1. **Admin page**: a simple password-protected page that calls `GET /api/orders` and lets you change status.
2. **Database**: move from `orders.json` to SQLite or PostgreSQL once you get more than a few hundred orders.
3. **Photo upload**: let customers upload photos on the site (file storage such as Cloudinary or S3) instead of sending them on WhatsApp.
4. **Payments**: add Razorpay or UPI payment links. Orders can stay "new" until payment is confirmed.
5. **Shipping**: add courier rates by pincode (Shiprocket or similar) and fill the `shipping` field of each order.
6. **Notifications**: send yourself a WhatsApp/email message whenever a new order arrives.

## Notes

- Prices and product details come from the Ocean Roid catalogue. Edit `backend/products.json` (and `frontend/js/products.js` for the no-backend mode) when they change.
- The starter backend is for learning and small volume. Before going live, host it on a server with HTTPS and set a strong `ADMIN_KEY`.
- Delivery charge is not calculated on the site yet. It is confirmed on WhatsApp.
