
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import bcrypt from 'bcryptjs'; // ★ 我是新加的，一定要有我！

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/insbuy';

app.use(cors());
app.use(express.json({ limit: '50mb' })); // 支援 Base64圖片上傳

// --- Database Schemas ---
const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: String, // 帳號名稱
  shop_name: String, // ★ 新增：商店名稱
  shop_description: String, // ★ 新增：商店介紹
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
  category_ids: [String], // ★ 修改：支援多重分類
  category_id: String, // 保留舊欄位
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
  origin: String, // ★ 新增：產地
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
  cancellation_reason: String, // ★ 新增：取消原因
  created_at: String,
  receiver_name: String,
  receiver_phone: String,
  ship_method: String,
  store_name: String,
  payment_note: String,
  shop_id: String
});


// --- 1. 升級分類資料結構 (修正 default 關鍵字) ---
const categorySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  shop_id: String,
  name: String,
  parent_id: { type: String, "default": null }, 
  image: String,
  type: { type: String, "default": 'MANUAL' },
  product_ids: [String],
  auto_rules: {
    keyword: String,
    price_min: Number,
    price_max: Number,
    is_discount: Boolean
  },
  sort_order: { type: Number, "default": 0 },
  is_active: { type: Boolean, "default": true },
  layout_style: { type: String, "default": 'STANDARD' },
  banner: String
});

// --- 2. 修正分類儲存邏輯 ---
app.post('/api/categories/bulk', async (req, res) => {
  try {
    // 接收 shopId 以確保即使 categories 為空也能正確識別商家
    const { categories, shopId } = req.body;
    
    // 優先使用傳入的 shopId，若無則嘗試從分類列表中抓取
    const targetShopId = shopId || (categories && categories.length > 0 ? categories[0].shop_id : null);

    if (!targetShopId) {
      return res.status(400).json({ message: '缺少 shopId，無法儲存分類' });
    }

    // 關鍵：刪除該商家舊有分類
    await Category.deleteMany({ shop_id: targetShopId });

    if (categories && categories.length > 0) {
      // 雙重保險與資料淨化：
      // 1. 確保寫入的每個分類都有正確的 shop_id
      // 2. 移除 _id 欄位，避免 MongoDB 發生重複 Key 錯誤 (因為我們是刪除後重寫)
      const validCategories = categories.map(c => {
        const { _id, ...rest } = c; // 移除 _id
        return {
          ...rest,
          shop_id: targetShopId
        };
      });
      
      const cats = await Category.insertMany(validCategories);
      res.json(cats);
    } else {
      // 如果列表為空，代表使用者刪除了所有分類，已在上方 deleteMany 完成動作
      res.json([]);
    }
  } catch (error) {
    console.error('分類儲存失敗:', error);
    res.status(500).json({ message: '分類儲存失敗', error });
  }
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
  // ★ 修改：支援 shop_id 篩選
  const { shop_id } = req.query;
  const filter = shop_id ? { shop_id } : {};
  const products = await Product.find(filter);
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

// 管理員後台新增使用者的專用接口 (確保密碼有加密)
app.post('/api/users', async (req, res) => {
  try {
    const { id, name, phone, email, password, role, level } = req.body;

    // 檢查是否重複
    const existingUser = await User.findOne({ $or: [{ phone }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: '此帳號(電話/Email)已存在' });
    }

    // ★ 關鍵：這裡一定要加密，不然登入會失敗！
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      id: id || 'user_' + Date.now(),
      name,
      phone,
      email,
      password: hashedPassword, // 存入加密密碼
      role: role || 'BUYER',
      level: level || (role === 'ADMIN' ? 999 : 1),
      created_at: new Date().toISOString(),
      stats: { ratingCount: 0, productCount: 0, followerCount: 0, responseRate: 100, responseTime: '1小時內', joinTime: new Date().toISOString(), averageRating: 0 }
    });

    await newUser.save();
    res.json(newUser);

  } catch (error) {
    console.error('新增使用者失敗:', error);
    res.status(500).json({ message: '伺服器錯誤' });
  }
});

app.get('/api/users', async (req, res) => {
  const users = await User.find({});
  res.json(users);
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { password, ...otherData } = req.body;
    
    // ★ 密碼加密
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = new User({
      ...otherData,
      password: hashedPassword,
      level: 1, // 預設一般會員等級
      role: 'BUYER'
    });
    
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: '註冊失敗', error });
  }
});

// --- 修改後的登入 API (整合商家與會員邏輯) ---
// --- 偵探版登入 API ---
app.post('/api/auth/login', async (req, res) => {
  const { phoneOrEmail, password, role } = req.body;
  
  // ★★★ 新增這段：全體點名 ★★★
  const allUsers = await User.find({});
  // console.log ... (省略 log)

  try {
    const query = { $or: [{ phone: phoneOrEmail }, { email: phoneOrEmail }] };
    const user = await User.findOne(query);

    if (!user) {
      return res.status(401).json({ message: '找不到此帳號' });
    }

    // 檢查密碼
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: '密碼錯誤' });
    }

    // ... (原本的權限檢查邏輯保持不變) ...
    if (role === 'SELLER') {
      const allowedRoles = ['SELLER', 'ADMIN', 'PERMISSION_EDITOR'];
      if (!allowedRoles.includes(user.role)) {
         return res.status(403).json({ message: '權限不足' });
      }
    }

    console.log('✅ [偵錯] 登入成功！');
    res.json(user);

  } catch (error) {
    console.error('💥 [偵錯] 系統報錯:', error);
    res.status(500).json({ message: '登入過程發生錯誤' });
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

// 更新訂單狀態 (含取消原因)
app.patch('/api/orders/:id/status', async (req, res) => {
  const { status, cancellation_reason } = req.body;
  const updateData = { status };
  if (cancellation_reason) {
    updateData.cancellation_reason = cancellation_reason;
  }
  const order = await Order.findOneAndUpdate({ id: req.params.id }, updateData, { new: true });
  res.json(order);
});

// Categories
app.get('/api/categories', async (req, res) => {
  // ★ 修改：支援 shop_id 篩選
  const { shop_id } = req.query;
  const filter = shop_id ? { shop_id } : {};
  const categories = await Category.find(filter);
  res.json(categories);
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

// --- Initialization Logic ---
// ... (保留原本的 admin 初始化邏輯)

// --- Start Server ---
console.log('⏳ 正在嘗試連線到 MongoDB 資料庫... (如果卡住太久，代表連線失敗)'); 
// ↑ 加入這行，這樣您就知道程式有在動

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB 連線成功！');
    
    // 初始化管理員帳號 (假設您有保留上面的 initializeAdmin 函式)
    // await initializeAdmin(); 

    app.listen(PORT, () => {
      console.log(`🚀 後端伺服器已啟動: http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB 連線失敗！請檢查資料庫是否已啟動。錯誤訊息:', err);
  });
