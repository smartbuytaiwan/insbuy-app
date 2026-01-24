
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/insbuy';

app.use(cors());
app.use(express.json({ limit: '50mb' })); // 支援 Base64圖片上傳

// --- Database Schemas ---
const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: String,
  phone: String,
  email: String,
  password: { type: String, required: true }, // 實際專案應加密
  role: String,
  level: Number,
  shop_id: String,
  created_at: String,
  logo: String,
  banner: String,
  stats: {
    ratingCount: Number,
    productCount: Number,
    followerCount: Number,
    responseRate: Number,
    responseTime: String,
    joinTime: String,
    averageRating: Number
  },
  following: [String]
});

const productSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  shop_id: String,
  category_id: String,
  name: String,
  description: String,
  images: [String],
  price: Number,
  original_price: Number,
  status: String,
  product_type: String,
  digital_files: [String],
  variants: [{ name: String, price: Number, stock: Number }],
  shipping_rules: [{ name: String, fee: Number, free_threshold: Number, limit_qty: Number, pickup_address: String }],
  bank_info: { bank_name: String, bank_code: String, account_name: String, account_number: String },
  end_time: String,
  target_amount: Number,
  current_amount: Number,
  total_stock: Number,
  is_pinned: Boolean,
  questions: [{ title: String, required: Boolean }],
  reviews: [{ id: String, userId: String, userName: String, rating: Number, comment: String, createdAt: String }]
});

const orderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  items: Array, // 簡化處理，存完整的 CartItem 物件
  total_amount: Number,
  shipping_fee: Number,
  payment_method: String,
  status: String,
  created_at: String,
  receiver_name: String,
  receiver_phone: String,
  ship_method: String,
  store_name: String,
  payment_note: String,
  shop_id: String
});

const categorySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  shop_id: String,
  name: String
});

const settingSchema = new mongoose.Schema({
  key: { type: String, default: 'main' }, // 單例模式
  termsOfService: String,
  disclaimer: String,
  helpCenter: String,
  announcement: String,
  announcementActive: Boolean
});

const permissionSchema = new mongoose.Schema({
  target_role: String,
  level: Number,
  role_name: String,
  max_products: Number,
  max_images_per_product: Number,
  max_variants_per_product: Number,
  can_edit_active_product: Boolean,
  point_feedback_rate: Number,
  discount_rate: Number
});

const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);
const Order = mongoose.model('Order', orderSchema);
const Category = mongoose.model('Category', categorySchema);
const Settings = mongoose.model('Settings', settingSchema);
const Permission = mongoose.model('Permission', permissionSchema);

// --- Routes ---

// Products
app.get('/api/products', async (req, res) => {
  const products = await Product.find({});
  res.json(products);
});

app.post('/api/products', async (req, res) => {
  const product = new Product(req.body);
  await product.save();
  res.json(product);
});

app.put('/api/products/:id', async (req, res) => {
  const product = await Product.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
  res.json(product);
});

app.delete('/api/products/:id', async (req, res) => {
  await Product.deleteOne({ id: req.params.id });
  res.json({ success: true });
});

// Users & Auth
app.get('/api/users', async (req, res) => {
  const users = await User.find({});
  res.json(users);
});

app.post('/api/auth/register', async (req, res) => {
  const user = new User(req.body);
  await user.save();
  res.json(user);
});

app.post('/api/auth/login', async (req, res) => {
  const { phoneOrEmail, password, role } = req.body;
  const user = await User.findOne({ 
    $or: [{ phone: phoneOrEmail }, { email: phoneOrEmail }],
    password: password,
    role: role
  });
  if (user) {
    res.json(user);
  } else {
    res.status(401).json({ message: '登入失敗' });
  }
});

app.put('/api/users/:id', async (req, res) => {
  const user = await User.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
  res.json(user);
});

// Orders
app.get('/api/orders', async (req, res) => {
  const orders = await Order.find({});
  res.json(orders);
});

app.post('/api/orders', async (req, res) => {
  const order = new Order(req.body);
  await order.save();
  res.json(order);
});

app.patch('/api/orders/:id/status', async (req, res) => {
  const { status } = req.body;
  const order = await Order.findOneAndUpdate({ id: req.params.id }, { status }, { new: true });
  res.json(order);
});

// Categories
app.get('/api/categories', async (req, res) => {
  const categories = await Category.find({});
  res.json(categories);
});

app.post('/api/categories/bulk', async (req, res) => {
  await Category.deleteMany({}); // 簡單替換邏輯
  const cats = await Category.insertMany(req.body.categories);
  res.json(cats);
});

// Settings
app.get('/api/settings', async (req, res) => {
  let settings = await Settings.findOne({ key: 'main' });
  if (!settings) {
    // Default settings
    settings = new Settings({
      key: 'main',
      termsOfService: '預設條款...',
      disclaimer: '預設聲明...',
      helpCenter: '預設幫助...',
      announcement: '',
      announcementActive: false
    });
    await settings.save();
  }
  res.json(settings);
});

app.put('/api/settings', async (req, res) => {
  const settings = await Settings.findOneAndUpdate({ key: 'main' }, req.body, { new: true, upsert: true });
  res.json(settings);
});

// Permissions
app.get('/api/permissions', async (req, res) => {
  const permissions = await Permission.find({});
  res.json(permissions);
});

app.post('/api/permissions/bulk', async (req, res) => {
  await Permission.deleteMany({});
  const permissions = await Permission.insertMany(req.body.permissions);
  res.json(permissions);
});

// --- Start Server ---
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
    console.log('請確保已安裝並啟動 MongoDB，或者在 .env 中設定正確的 MONGODB_URI');
  });
