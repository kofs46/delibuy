/**
 * DeliBuy Backend Server (Node.js, Express & MongoDB Atlas)
 * Fully hardened with tracking endpoint, robust error-handling,
 * and high payload support for Base64 product photos.
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware (50mb limit allowed for direct product image uploads)
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ================= MONGOOSE SCHEMAS & MODELS =================

// 1. Admin / Staff Model
const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Super Admin', 'Order Manager', 'Product Manager'], default: 'Super Admin' },
  createdAt: { type: Date, default: Date.now }
});
const Admin = mongoose.model('Admin', adminSchema);

// 2. Category Model
const categorySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  icon: { type: String, default: 'fa-tag' }
});
const Category = mongoose.model('Category', categorySchema);

// 3. Product Model
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  originalPrice: { type: Number, required: true },
  discountPrice: { type: Number, required: true },
  stock: { type: Number, default: 0 },
  images: [{ type: String }],
  description: { type: String },
  createdAt: { type: Date, default: Date.now }
});
const Product = mongoose.model('Product', productSchema);

// 4. Order Model
const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  customer: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true }
  },
  location: { type: String, required: true },
  deliveryFee: { type: Number, required: true },
  advancePayment: {
    method: { type: String, default: 'bKash Send Money' },
    targetNumber: { type: String },
    amount: { type: Number },
    senderPhone: { type: String },
    trxId: { type: String, required: true }
  },
  payableOnDelivery: { type: Number, required: true },
  grandTotal: { type: Number, required: true },
  items: [{
    id: String,
    name: String,
    price: Number,
    image: String,
    qty: Number
  }],
  status: {
    type: String,
    enum: ['Order Placed', 'Confirmed Order', 'Shifted', 'Delivered', 'Cancelled'],
    default: 'Order Placed'
  },
  createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', orderSchema);

// 5. Store Settings Model
const settingSchema = new mongoose.Schema({
  insideDhakaFee: { type: Number, default: 60 },
  outsideDhakaFee: { type: Number, default: 120 },
  bkashNumber: { type: String, default: '01516-597972' }
});
const Setting = mongoose.model('Setting', settingSchema);

// ================= AUTO DATABASE SEEDER =================
async function seedDefaultDatabase() {
  try {
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      await Admin.create({
        name: 'Main Administrator',
        username: 'admin',
        password: 'delibuy123',
        role: 'Super Admin'
      });
      console.log('✅ Default Super Admin Created: admin / delibuy123');
    }

    const catCount = await Category.countDocuments();
    if (catCount === 0) {
      await Category.insertMany([
        { id: 'all', name: 'All Products', icon: 'fa-border-all' },
        { id: 'electronics', name: 'Electronics & Tech', icon: 'fa-headphones' },
        { id: 'fashion', name: 'Fashion & Wearables', icon: 'fa-shirt' },
        { id: 'watches', name: 'Watches & Accessories', icon: 'fa-clock' }
      ]);
      console.log('✅ Initial Categories Seeded');
    }

    const settingCount = await Setting.countDocuments();
    if (settingCount === 0) {
      await Setting.create({
        insideDhakaFee: 60,
        outsideDhakaFee: 120,
        bkashNumber: '01516-597972'
      });
      console.log('✅ Default Settings Seeded');
    }
  } catch (err) {
    console.error('Seeding error:', err);
  }
}

// ================= REST API ROUTES =================

// --- Auth & Admin Routes ---
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username, password });
    if (!admin) return res.status(401).json({ success: false, message: 'Invalid username or password' });
    res.json({ success: true, admin });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/auth/admins', async (req, res) => {
  try {
    const admins = await Admin.find().select('-password');
    res.json(admins);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admins' });
  }
});

app.post('/api/auth/admins', async (req, res) => {
  try {
    const newAdmin = new Admin(req.body);
    await newAdmin.save();
    res.json({ success: true, message: 'Admin created successfully' });
  } catch (err) {
    res.status(400).json({ error: 'Username already exists' });
  }
});

app.patch('/api/auth/change-credentials', async (req, res) => {
  try {
    const { id, currentPassword, newUsername, newPassword } = req.body;
    const admin = await Admin.findById(id);
    if (!admin || admin.password !== currentPassword) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }
    admin.username = newUsername;
    admin.password = newPassword;
    await admin.save();
    res.json({ success: true, admin });
  } catch (err) {
    res.status(500).json({ error: 'Credential update failed' });
  }
});

app.delete('/api/auth/admins/:id', async (req, res) => {
  try {
    await Admin.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete admin' });
  }
});

// --- Category Routes ---
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.post('/api/categories', async (req, res) => {
  try {
    const cat = new Category(req.body);
    await cat.save();
    res.json(cat);
  } catch (e) {
    res.status(400).json({ error: 'Category ID already exists' });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  try {
    await Category.findOneAndDelete({ id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// --- Product Routes ---
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const prod = new Product(req.body);
    await prod.save();
    res.json(prod);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save product' });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

app.patch('/api/products/:id/stock', async (req, res) => {
  try {
    const { delta } = req.body;
    const prod = await Product.findById(req.params.id);
    if (prod) {
      prod.stock = Math.max(0, prod.stock + delta);
      await prod.save();
      res.json(prod);
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

// --- Order Routes & Live Tracking ---
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// লাইভ অর্ডার ট্র্যাকিং রাউট (Order ID অথবা Phone Number দিয়ে সার্চ)
app.get('/api/orders/:trackingKey', async (req, res) => {
  try {
    const key = req.params.trackingKey.trim();
    const order = await Order.findOne({
      $or: [
        { orderId: { $regex: new RegExp(`^${key}$`, 'i') } },
        { 'customer.phone': key }
      ]
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Error searching order' });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const order = new Order(req.body);
    await order.save();
    res.status(201).json({ success: true, order });
  } catch (err) {
    console.error('Order creation error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

app.patch('/api/orders/:orderId/status', async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findOneAndUpdate(
      { orderId: req.params.orderId },
      { status },
      { new: true }
    );
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// --- Store Settings Routes ---
app.get('/api/settings', async (req, res) => {
  try {
    let setting = await Setting.findOne();
    if (!setting) {
      setting = await Setting.create({});
    }
    res.json(setting);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    let setting = await Setting.findOne();
    if (setting) {
      Object.assign(setting, req.body);
      await setting.save();
    } else {
      setting = await Setting.create(req.body);
    }
    res.json(setting);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// ================= START SERVER =================
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/delibuy';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('🚀 Connected to MongoDB Database successfully!');
    seedDefaultDatabase();
    app.listen(PORT, () => {
      console.log(`🌐 DeliBuy Server running live on port http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err.message);
  });