# 🛍️ DeliBuy - Modern Full-Stack E-Commerce Platform

DeliBuy is a complete, production-ready online shopping web application built with a responsive storefront, secure admin management dashboard, bKash transaction-based advance ordering workflow, and printable parcel invoices.

---

## 🌐 Live Demos

- 🛒 **Customer Storefront:** [https://delibuy.netlify.app](https://delibuy.netlify.app)
- 🔐 **Admin Operations Center:** [https://delibuy.netlify.app/admin.html](https://delibuy.netlify.app/admin.html)

---

## ✨ Key Features

### 🛍️ Customer Storefront
- **Dynamic Catalog:** Real-time category filtering, live product search, and responsive grid layout.
- **Product Inspection Modal:** Multi-image gallery preview with cursor hover zoom capability.
- **Persistent Cart Drawer:** Client-side local storage cart with dynamic quantity adjustment and price counter.
- **bKash Advance Workflow:** Automated split calculation charging courier shipping via bKash TrxID verification and booking product balance under Cash on Delivery (COD).
- **Real-Time Order Tracking:** Modal-based tracker allowing customers to trace parcel dispatch status using Order ID or phone number.

### ⚙️ Admin Operations Dashboard
- **Role-Based Workflows:** Pre-configured Super Admin and staff roles for segregated operations.
- **Dynamic Order Management:** Filter, inspect, and update parcel lifecycle status (`Order Placed` ➔ `Confirmed` ➔ `Shifted` ➔ `Delivered` ➔ `Cancelled`).
- **One-Click Invoice Generator:** Print-ready, structured A4 parcel cash memo/courier invoice for physical labeling or PDF export.
- **Catalog Management:** Add and edit existing products with direct multiple-image upload, discount recalculation, and stock tracking.
- **Store Logistics Settings:** Real-time configurator for inside/outside Dhaka courier fees and official receiver bKash number.

---

## 🛠️ Tech Stack

- **Front-End:** HTML5, Modern JavaScript (ES6+), Tailwind CSS CDN, Font Awesome Icons
- **Back-End:** Node.js, Express.js
- **Database:** MongoDB Atlas (Mongoose ODM)
- **Deployment & Hosting:** 
  - Netlify (Frontend Continuous Deployment)
  - Render (Backend REST API Web Service)

---

## 🚀 Local Development Setup

### 1. Clone Repository
```bash
git clone [https://github.com/kofs46/delibuy.git](https://github.com/kofs46/delibuy.git)
cd delibuy
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env` file in the root directory:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
```

### 4. Start Server
```bash
# Seed initial categories & default admin:
node reset-db.js

# Start backend service:
npm start
```

---

## 👤 Author

- **Khandaker Omar Fayes Shabbir**
- **GitHub:** [@kofs46](https://github.com/kofs46)
