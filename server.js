import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- Nodemailer Setup ---
const transporter = nodemailer.createTransport({
  jsonTransport: true 
});

// --- Database Schemas ---

const messageSchema = new mongoose.Schema({
  senderId: String,
  receiverId: String,
  content: String, 
  timestamp: String,
  isRead: { type: Boolean, default: false }
});

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: String,
  shop_name: String,
  shop_description: String,
  tax_id: String, 
  phone: String,
  email: String,
  password: { type: String, required: true },
  plain_password: { type: String }, 
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
  following: [String],
  is_suspended: { type: Boolean, default: false },
  google_map_url: String,
  line_url: String,
  facebook_url: String,
  instagram_url: String,
  threads_url: String,
  shop_reviews: [{ id: String, userId: String, userName: String, rating: Number, comment: String, createdAt: String }]
});

const productSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  shop_id: String,
  category_ids: [String],
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
  payment_methods: [String],
  bank_info: { bank_name: String, bank_code: String, account_name: String, account_number: String },
  end_time: String,
  target_amount: Number,
  current_amount: Number,
  total_stock: Number,
  is_pinned: Boolean,
  pin_rank: { type: Number, default: null },
  origin: String,
  shipping_origin: String, 
  questions: [{ title: String, required: Boolean }],
  reviews: [{ id: String, userId: String, userName: String, rating: Number, comment: String, createdAt: String }]
});

const orderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  items: Array,
  total_amount: Number,
  shipping_fee: Number,
  payment_method: String,
  status: String,
  cancellation_reason: String,
  seller_note: String,
  created_at: String,
  receiver_name: String,
  receiver_phone: String,
  ship_method: String,
  store_name: String,
  payment_note: String,
  remarks: String, 
  answers: [{ question: String, answer: String }], 
  shop_id: String
});

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

const settingSchema = new mongoose.Schema({
  key: { type: String, default: 'main' },
  termsOfService: String,
  privacyPolicy: String,
  disclaimer: String,
  helpCenter: String,
  announcement: String,
  announcementImage: String,
  announcementActive: Boolean,
  registrationEnabled: { type: Boolean, default: true }, 
  antiScamMessage: String
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

const reportSchema = new mongoose.Schema({
  id: String,
  type: String, 
  targetId: String,
  targetName: String,
  subject: String,
  reason: String,
  reporterId: String,
  reporterName: String,
  status: { type: String, default: 'PENDING' },
  created_at: String
});

const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);
const Order = mongoose.model('Order', orderSchema);
const Category = mongoose.model('Category', categorySchema);
const Settings = mongoose.model('Settings', settingSchema);
const Permission = mongoose.model('Permission', permissionSchema);
const Message = mongoose.model('Message', messageSchema);
const Report = mongoose.model('Report', reportSchema);

// --- Helper Functions ---

const generateNextUserId = async () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const datePrefix = `${yyyy}${mm}${dd}`; 

  const lastUser = await User.findOne({ id: { $regex: new RegExp(`^${datePrefix}`) } })
                             .sort({ id: -1 })
                             .exec();

  let sequence = 1;
  if (lastUser && lastUser.id) {
    const lastSeqStr = lastUser.id.substring(8); 
    const lastSeq = parseInt(lastSeqStr, 10);
    if (!isNaN(lastSeq)) {
      sequence = lastSeq + 1;
    }
  }

  return `${datePrefix}${String(sequence).padStart(4, '0')}`;
};

// --- Routes ---

app.get('/api/messages', async (req, res) => {
  try {
    const { user1, user2, userId } = req.query;
    if (userId && !user1 && !user2) {
       const messages = await Message.find({
         $or: [{ senderId: userId }, { receiverId: userId }]
       }).sort({ timestamp: 1 });
       return res.json(messages);
    }
    if (user1 && user2) {
      const messages = await Message.find({
        $or: [
          { senderId: user1, receiverId: user2 },
          { senderId: user2, receiverId: user1 }
        ]
      }).sort({ timestamp: 1 });
      return res.json(messages);
    }
    res.json([]);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching messages' });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    const { content, text, ...rest } = req.body;
    const newMessage = new Message({
      ...rest,
      content: content || text
    });
    await newMessage.save();
    res.json(newMessage);
  } catch (e) {
    res.status(500).json({ message: 'Message send failed' });
  }
});

app.put('/api/messages/read', async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;
    await Message.updateMany(
      { senderId, receiverId, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to mark as read' });
  }
});

// ★ 修改：純文字搜尋 (無 AI, 無限制, 快速)
app.get('/api/products', async (req, res) => {
  const { shop_id, q } = req.query;
  
  try {
    // 1. 取得停權黑名單
    const suspendedUsers = await User.find({ is_suspended: true });
    const suspendedIds = suspendedUsers.map(u => u.id);
    const suspendedShopIds = suspendedUsers.map(u => u.shop_id).filter(id => id); 
    const allSuspendedIds = [...suspendedIds, ...suspendedShopIds];
    
    // 2. 建立查詢條件
    let query = {
      shop_id: { $nin: allSuspendedIds } // 排除停權賣家
    };

    if (shop_id) {
      query.shop_id = shop_id;
    }

    // ★ 關鍵：如果有搜尋詞，使用 Regex 進行模糊搜尋
    if (q) {
      console.log(`正在搜尋: ${q}`);
      const regex = new RegExp(q, 'i'); // 'i' 代表不分大小寫
      query.$or = [
        { name: regex },
        { description: regex }
      ];
    }

    // 3. 執行查詢
    const productsQuery = Product.find(query);
    
    // 為了效能，如果不是在搜特定店家或關鍵字，限制回傳數量 (預設 100)
    if (!q && !shop_id) {
       productsQuery.limit(100); 
    }

    const products = await productsQuery.exec();
    
    // 4. 排序 (有 Pin 的排前面)
    const activeProducts = products.filter(p => !allSuspendedIds.includes(p.shop_id));
    activeProducts.sort((a, b) => {
      const rankA = a.pin_rank !== null && a.pin_rank !== undefined ? a.pin_rank : 9999;
      const rankB = b.pin_rank !== null && b.pin_rank !== undefined ? b.pin_rank : 9999;
      return rankA - rankB;
    });

    res.json(activeProducts);
  } catch (error) {
    console.error("Search Error:", error);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const productData = req.body;
    const product = new Product(productData);
    await product.save();
    res.json(product);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Create product failed' });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    res.json(product);
  } catch (e) {
    res.status(500).json({ message: 'Update failed' });
  }
});

app.patch('/api/products/:id/close', async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      { id: req.params.id }, 
      { status: 'CLOSED' }, 
      { new: true }
    );
    res.json(product);
  } catch (e) {
    res.status(500).json({ message: '操作失敗' });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  await Product.deleteOne({ id: req.params.id });
  res.json({ success: true });
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: '此信箱尚未註冊' });

    const pwdToSend = user.plain_password;
    if (!pwdToSend) {
      return res.status(400).json({ message: '此為舊帳號，無法還原原始密碼，請聯繫管理員重設。' });
    }

    const mailOptions = {
      from: '"InsBuy 客服中心" <service@insbuy.com>',
      to: email,
      subject: '【InsBuy】您的帳號密碼查詢結果',
      text: `親愛的用戶您好：\n\n您的密碼為：${pwdToSend}\n\n請登入後儘速修改密碼以保安全。`,
      html: `<p>親愛的用戶您好：</p><p>您的密碼為：<strong>${pwdToSend}</strong></p><p>請登入後儘速修改密碼以保安全。</p>`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent info (模擬):", info);

    res.json({ message: '密碼已發送至您的信箱', preview: info });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '寄信失敗', error });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { name, phone, email, password, role, level, id } = req.body; 
    const existingUser = await User.findOne({ $or: [{ phone }, { email }] });
    if (existingUser) return res.status(400).json({ message: '帳號(電話或信箱)已存在，請勿重複註冊。' });

    const newId = await generateNextUserId();
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      id: newId,
      name, phone, email,
      password: hashedPassword,
      plain_password: password,
      role: role || 'BUYER',
      level: level || 1,
      shop_id: role === 'SELLER' ? `S-${Date.now()}` : undefined,
      created_at: new Date().toISOString(),
      stats: { ratingCount: 0, productCount: 0, followerCount: 0, responseRate: 100, responseTime: '1小時內', joinTime: new Date().toISOString(), averageRating: 0 },
      is_suspended: false,
      google_map_url: ''
    });
    await newUser.save();
    res.json(newUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error', error });
  }
});

app.get('/api/users', async (req, res) => {
  const users = await User.find({});
  res.json(users);
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    await User.deleteOne({ id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Delete user failed' });
  }
});

app.post('/api/users/:id/reviews', async (req, res) => {
  try {
    const { userId, userName, rating, comment } = req.body;
    const user = await User.findOne({ id: req.params.id });
    
    if (!user) return res.status(404).json({ message: 'Seller not found' });

    const newReview = {
      id: `sr-${Date.now()}`,
      userId,
      userName,
      rating,
      comment,
      createdAt: new Date().toISOString()
    };

    if (!user.shop_reviews) user.shop_reviews = [];
    user.shop_reviews.unshift(newReview);

    const totalReviews = user.shop_reviews.length;
    const sumRating = user.shop_reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalReviews > 0 ? parseFloat((sumRating / totalReviews).toFixed(1)) : 0;

    user.stats.ratingCount = totalReviews;
    user.stats.averageRating = averageRating;

    await user.save();
    res.json(user);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to add shop review' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const settings = await Settings.findOne({ key: 'main' });
    if (settings && settings.registrationEnabled === false) {
       return res.status(403).json({ message: '目前系統已關閉註冊功能，請聯繫管理員。' });
    }

    const { password, role, level, name, phone, email, id, ...otherData } = req.body;
    
    const existing = await User.findOne({ $or: [{ phone }, { email }] });
    if (existing) return res.status(400).json({ message: '該手機或信箱已被註冊，請勿重複使用。' });

    const newId = await generateNextUserId();
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = new User({
      id: newId,
      name, phone, email,
      password: hashedPassword,
      plain_password: password,
      role: role || 'BUYER', 
      level: level || 1,
      shop_id: role === 'SELLER' ? `S-${Date.now()}` : undefined,
      created_at: new Date().toISOString(),
      is_suspended: false,
      google_map_url: '',
      ...otherData 
    });
    
    await user.save();
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Register failed', error });
  }
});

app.post('/api/users/:id/upgrade', async (req, res) => {
  try {
    const { shop_name, tax_id, shop_description } = req.body;
    const user = await User.findOne({ id: req.params.id });
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.role = 'SELLER';
    user.shop_id = user.shop_id || `S-${Date.now()}`;
    user.shop_name = shop_name;
    user.tax_id = tax_id;
    user.shop_description = shop_description;
    
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Upgrade failed', error });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { phoneOrEmail, password, role } = req.body;
  try {
    const query = { $or: [{ id: phoneOrEmail }, { phone: phoneOrEmail }, { email: phoneOrEmail }] };
    const user = await User.findOne(query);
    if (!user) return res.status(401).json({ message: 'User not found' });

    if (user.is_suspended) {
        return res.status(403).json({ message: '此帳號已被停用，請聯繫管理員。' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    if (role === 'SELLER') {
      const allowedRoles = ['SELLER', 'ADMIN', 'PERMISSION_EDITOR'];
      if (!allowedRoles.includes(user.role)) return res.status(403).json({ message: 'Access denied' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Login error' });
  }
});

app.put('/api/users/:id', async (req, res) => {
  const updateData = { ...req.body };
  if (updateData.password && updateData.password.length < 20) { 
    updateData.plain_password = updateData.password;
    updateData.password = await bcrypt.hash(updateData.password, 10);
  }
  const user = await User.findOneAndUpdate({ id: req.params.id }, updateData, { new: true });
  res.json(user);
});

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
  const { status, cancellation_reason, seller_note } = req.body;
  const updateData = {};
  
  if (status) updateData.status = status;
  if (cancellation_reason) updateData.cancellation_reason = cancellation_reason;
  if (seller_note !== undefined) updateData.seller_note = seller_note;

  const order = await Order.findOneAndUpdate({ id: req.params.id }, updateData, { new: true });
  res.json(order);
});

app.get('/api/categories', async (req, res) => {
  const { shop_id } = req.query;
  const filter = shop_id ? { shop_id } : {};
  const categories = await Category.find(filter);
  res.json(categories);
});

app.post('/api/categories/bulk', async (req, res) => {
  try {
    const { categories, shopId } = req.body;
    const targetShopId = shopId || (categories && categories.length > 0 ? categories[0].shop_id : null);
    if (!targetShopId) return res.status(400).json({ message: 'Missing shopId' });

    await Category.deleteMany({ shop_id: targetShopId });
    if (categories && categories.length > 0) {
      const validCategories = categories.map(c => {
        const { _id, ...rest } = c;
        return { ...rest, shop_id: targetShopId };
      });
      const cats = await Category.insertMany(validCategories);
      res.json(cats);
    } else {
      res.json([]);
    }
  } catch (error) {
    res.status(500).json({ message: 'Category save failed', error });
  }
});

app.get('/api/settings', async (req, res) => {
  let settings = await Settings.findOne({ key: 'main' });
  if (!settings) {
    settings = new Settings({
      key: 'main', 
      termsOfService: 'Default Terms', 
      privacyPolicy: 'Default Privacy Policy',
      disclaimer: 'Default Disclaimer', 
      helpCenter: 'Help', 
      announcement: '', 
      announcementImage: '',
      announcementActive: false,
      registrationEnabled: true
    });
    await settings.save();
  }
  res.json(settings);
});

app.put('/api/settings', async (req, res) => {
  const settings = await Settings.findOneAndUpdate({ key: 'main' }, req.body, { new: true, upsert: true });
  res.json(settings);
});

app.get('/api/permissions', async (req, res) => {
  const permissions = await Permission.find({});
  res.json(permissions);
});

app.post('/api/permissions/bulk', async (req, res) => {
  await Permission.deleteMany({});
  const permissions = await Permission.insertMany(req.body.permissions);
  res.json(permissions);
});

app.post('/api/reports', async (req, res) => {
  try {
    const report = new Report({
      ...req.body,
      id: `rpt-${Date.now()}`,
      created_at: new Date().toISOString()
    });
    await report.save();
    res.json(report);
  } catch (e) {
    res.status(500).json({ message: 'Report failed' });
  }
});

app.get('/api/reports', async (req, res) => {
  try {
    const reports = await Report.find({}).sort({ created_at: -1 });
    res.json(reports);
  } catch (e) {
    res.status(500).json({ message: 'Fetch reports failed' });
  }
});

app.put('/api/reports/:id', async (req, res) => {
  try {
    const report = await Report.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    res.json(report);
  } catch (e) {
    res.status(500).json({ message: 'Update report failed' });
  }
});

app.delete('/api/reports/:id', async (req, res) => {
  try {
    await Report.deleteOne({ id: req.params.id });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: 'Delete report failed' });
  }
});

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB 連線成功！');
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => console.error('❌ MongoDB Connection Error:', err));