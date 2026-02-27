import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import rateLimit from 'express-rate-limit'; // ★ 新增：API 限流
import * as xlsx from 'xlsx'; // ★ 新增：Excel 解析

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ==========================================
// ★ 安全防護 5 & 9：全域 API 請求限流 (防暴力攻擊)
// ==========================================
const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 分鐘內
  max: 800, // ★ 修正：將原本 120 提高到 800，避免愛聊系統的背景輪詢被防火牆阻擋
  message: { message: "請求過於頻繁，系統已啟動防護限制，請稍後再試。" }
});
app.use('/api/', globalLimiter);

// ★ 安全防護 3：商品上架專屬限流 (最快1分鐘1個)
const productCreationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 1,
  message: { message: "上架速率限制：為維護系統穩定，每分鐘只能上架一個商品。" }
});

// ★ 安全防護 6：隱形蜜罐陷阱 (Honeypot) 攔截器
const honeypotCheck = (req, res, next) => {
  if (req.body.bot_trap_field) {
    console.warn("🤖 觸發蜜罐陷阱！已封鎖機器人攻擊。");
    return res.status(403).json({ message: "系統偵測到異常行為，請求被拒絕。" });
  }
  next();
};

// ★ 安全防護 1：違規關鍵字與外部連結過濾器
const BAD_WORDS = ['加LINE', '私下交易', '免運請點網址', '原味', '高仿'];
const keywordFilter = (req, res, next) => {
  const content = JSON.stringify(req.body);
  for (const word of BAD_WORDS) {
    if (content.includes(word)) {
      return res.status(400).json({ message: `您的商品或內容包含違規字眼「${word}」，禁止發送＆輸入。` });
    }
  }
  next();
};

// ★ 安全防護 9：API 分頁與數量限制攔截器 (防止一次撈取十萬筆)
const paginationCheck = (req, res, next) => {
   if (req.method === 'GET' && !req.query.limit) {
       req.query.limit = 100; // 強制預設最高只回傳 100 筆
   }
   next();
};
app.use('/api/products', paginationCheck);

const transporter = nodemailer.createTransport({
  jsonTransport: true 
});

const isUrl = (str) => {
  return typeof str === 'string' && (str.startsWith('http://') || str.startsWith('https://'));
};

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
  blacklisted_by: [String], // ★ 新增：被哪些賣家加入黑名單
  name: String,
  failed_login_attempts: { type: Number, default: 0 }, // ★ 防護 11：登入失敗次數
  lockout_until: { type: Date, default: null }, // ★ 防護 11：帳號鎖定時間
  shop_name: String,
  shop_description: String,
  tax_id: String, 
  phone: String,
  email: String,
  password: { type: String, required: true },
  plain_password: { type: String }, 
  role: String,
  level: Number,
  level_expire_at: String, // ★ 功能4新增：會員等級到期日
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
  bookmarks: { type: Array, default: [] }, // ★ 新增：我的最愛網頁
  folders: { type: Array, default: [] },   // ★ 新增：我的最愛資料夾
  is_suspended: { type: Boolean, default: false },
  bookmarks: Array, // ★ 新增：我的最愛網頁
  folders: Array,   // ★ 新增：我的最愛資料夾
  google_map_url: String,
  line_url: String,
  facebook_url: String,
  instagram_url: String,
  threads_url: String,
  welcome_message: String, // ★ 新增：賣家歡迎訊息
  shop_reviews: [{ id: String, userId: String, userName: String, rating: Number, comment: String, createdAt: String }]
});

const productSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  views: { type: Object, default: {} }, // ★ 新增：商品每日瀏覽量紀錄
  shop_id: String,
  category_ids: [String],
  category_id: String,
  name: String,
  description: String,
  images: [String],
  price: Number,
  original_price: Number,
  is_preorder: { type: Boolean, default: false },
  preorder_end_date: String,
  preorder_arrival_date: String,
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
  keywords: [String], 
  is_hidden: { type: Boolean, default: false }, // ★ 新增：隱藏銷售
  view_password: { type: String, default: '' }, // ★ 新增：專屬密碼
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
  // ★ 新增：分潤資訊欄位
  affiliate_info: {
    code: String,          
    influencer_id: String, 
    influencer_name: String,
    total_commission: Number, 
    status: { type: String, default: 'ESTIMATED' },
    details: Array // ★ 關鍵修復：允許 MongoDB 儲存陣列格式的詳細算式
  },
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
  discount_rate: Number,
  // 👇 確保下面這五行有確實加進去
  can_use_preorder: Boolean,
  max_drafts: Number,
  can_view_stats: Boolean,
  can_edit_banner: Boolean,
  can_edit_logo: Boolean
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
// ★ 新增：網站設定 Schema (用來儲存平台總瀏覽量)
const siteSettingsSchema = new mongoose.Schema({
  platform_views: { type: Object, default: {} } 
});
const SiteSettings = mongoose.model('SiteSettings', siteSettingsSchema);
const Order = mongoose.model('Order', orderSchema);
const Category = mongoose.model('Category', categorySchema);
const Settings = mongoose.model('Settings', settingSchema);
const Permission = mongoose.model('Permission', permissionSchema);
const Message = mongoose.model('Message', messageSchema);
const Report = mongoose.model('Report', reportSchema);

// ==========================================
// --- Affiliate (專業版分潤系統) Schemas & Models ---
// ==========================================

// 1. 獨立的網紅帳號資料表
const influencerSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // 系統ID (例: INF-12345)
  account: { type: String, required: true, unique: true }, // 登入帳號
  name: String,
  email: String,
  phone: String,
  password: { type: String, required: true },
  created_at: String
});

// 2. 分潤專案資料表 (加入開始與結束日期)
const affiliateLinkSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  shop_id: String,
  influencer_id: String, // 綁定 Influencer.id
  influencer_name: String,
  product_id: String,
  primary_rate: Number,
  secondary_rate: Number,
  code: { type: String, required: true, unique: true },
  start_date: String,
  end_date: String,
  created_at: String
});

const affiliateClickSchema = new mongoose.Schema({
  id: String,
  link_id: String,
  shop_id: String,
  influencer_id: String,
  code: String,
  clicked_at: String
});

const Influencer = mongoose.model('Influencer', influencerSchema);
const AffiliateLink = mongoose.model('AffiliateLink', affiliateLinkSchema);
const AffiliateClick = mongoose.model('AffiliateClick', affiliateClickSchema);

const generateNextUserId = async () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const datePrefix = `${yyyy}${mm}${dd}`; 
  const lastUser = await User.findOne({ id: { $regex: new RegExp(`^${datePrefix}`) } }).sort({ id: -1 }).exec();
  let sequence = 1;
  if (lastUser && lastUser.id) {
    const lastSeqStr = lastUser.id.substring(8); 
    const lastSeq = parseInt(lastSeqStr, 10);
    if (!isNaN(lastSeq)) sequence = lastSeq + 1;
  }
  return `${datePrefix}${String(sequence).padStart(4, '0')}`;
};

// ★ 新增：管理員一鍵備份全站資料 (政府調閱用)
app.get('/api/admin/dump', async (req, res) => {
  try {
    // 這裡不做身分驗證 middleware，由前端 ADMIN 權限控制呼叫，或可自行加上驗證
    const users = await User.find({});
    const products = await Product.find({});
    const orders = await Order.find({});
    const messages = await Message.find({});
    const reports = await Report.find({});
    const affiliateLinks = await AffiliateLink.find({});
    
    const dumpData = {
      timestamp: new Date().toISOString(),
      system: "InsBuy_Full_Backup",
      data: { users, products, orders, messages, reports, affiliateLinks }
    };
    
    res.json(dumpData);
  } catch (e) {
    res.status(500).json({ message: '備份失敗', error: e.message });
  }
});

// ==========================================
// --- Affiliate (專業版分潤系統) API Routes ---
// ==========================================

// 網紅註冊 (強化版：精準判斷重複與真實報錯)
app.post('/api/influencers/register', async (req, res) => {
  try {
    const { account, password, name, email, phone } = req.body;

    if (!account || !password || !name || !email || !phone) {
         return res.status(400).json({ message: '請填寫所有註冊欄位！' });
    }

    // 嚴格檢查「網紅資料庫」內是否已有重複的 (名稱 / 帳號 / 信箱 / 電話)
    const existing = await Influencer.findOne({
         $or: [{ account }, { email }, { phone }, { name }]
    });

    if (existing) {
        let conflictField = '資料';
        if (existing.account === account) conflictField = '登入帳號';
        else if (existing.name === name) conflictField = '顯示名稱 (頻道名)';
        else if (existing.email === email) conflictField = '聯絡信箱';
        else if (existing.phone === phone) conflictField = '手機號碼';

        return res.status(400).json({ message: `此「${conflictField}」已被其他網紅註冊過，請更換！` });
    }

    // 建立獨立的網紅帳號
    const newId = `INF-${Math.floor(100000 + Math.random() * 900000)}`;
    const hashedPw = await bcrypt.hash(password, 10);

    const influencer = new Influencer({
        id: newId, account, password: hashedPw, name, email, phone, created_at: new Date().toISOString()
    });

    await influencer.save();
    res.json(influencer);

  } catch (error) {
    console.error("網紅註冊發生錯誤:", error);
    res.status(500).json({ message: '伺服器錯誤，無法註冊: ' + (error.message || '未知錯誤') });
  }
});

// 網紅登入
app.post('/api/influencers/login', async (req, res) => {
  try {
    const { account, password } = req.body;
    const influencer = await Influencer.findOne({ account }).lean();
    if (!influencer) return res.status(401).json({ message: '帳號或密碼錯誤' });
    
    const isValid = await bcrypt.compare(password, influencer.password);
    if (!isValid) return res.status(401).json({ message: '帳號或密碼錯誤' });
    
    delete influencer.password; 
    res.json(influencer);
  } catch (error) { res.status(500).json({ message: 'Login failed' }); }
});

// 賣家建立專案時，透過帳號驗證並取得網紅資料
app.get('/api/influencers/account/:account', async (req, res) => {
  try {
    const influencer = await Influencer.findOne({ account: req.params.account }).select('-password').lean();
    if (!influencer) return res.status(404).json({ message: '找不到此網紅帳號' });
    res.json(influencer);
  } catch (error) { res.status(500).json({ message: 'Error fetching influencer' }); }
});

// 取得分潤專案 (賣家看自己的)
app.get('/api/affiliate-links', async (req, res) => {
  try {
    const { shop_id } = req.query;
    const links = await AffiliateLink.find({ shop_id }).sort({ created_at: -1 }).lean();
    res.json(links);
  } catch (error) { res.status(500).json({ message: 'Error fetching links' }); }
});

// 網紅看全站再到前端過濾
app.get('/api/affiliate-links/all', async (req, res) => {
  try {
    const links = await AffiliateLink.find({}).sort({ created_at: -1 }).lean();
    res.json(links);
  } catch (error) { res.status(500).json({ message: 'Error fetching links' }); }
});

// 賣家建立分潤專案
app.post('/api/affiliate-links', async (req, res) => {
  try {
    const existingCode = await AffiliateLink.findOne({ code: req.body.code });
    if (existingCode) return res.status(400).json({ message: '此專屬代碼已存在，請換一個' });
    
    const { influencer_id, start_date, end_date } = req.body;
    const overlapping = await AffiliateLink.findOne({
      influencer_id,
      $or: [
        { start_date: { $lte: end_date }, end_date: { $gte: start_date } }
      ]
    });
    if (overlapping) return res.status(400).json({ message: '此網紅在該日期區間內已有其他進行中的專案，無法重複建立。' });

    const link = new AffiliateLink({ ...req.body, id: `aff-${Date.now()}`, created_at: new Date().toISOString() });
    await link.save();
    res.json(link);
  } catch (error) { res.status(500).json({ message: 'Create link failed' }); }
});

// 提前結束分潤活動
app.put('/api/affiliate-links/:id', async (req, res) => {
  try {
    const link = await AffiliateLink.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    res.json(link);
  } catch (error) { res.status(500).json({ message: 'Update link failed' }); }
});

app.post('/api/affiliate-clicks', async (req, res) => {
  try {
    const click = new AffiliateClick({ ...req.body, id: `clk-${Date.now()}`, clicked_at: new Date().toISOString() });
    await click.save();
    res.json(click);
  } catch (error) { res.status(500).json({ message: 'Record click failed' }); }
});

app.get('/api/debug/cleanup', async (req, res) => {
  try {
    console.log('--- 開始執行深度清理 ---');
    const users = await User.find({});
    let uCount = 0;
    for (const u of users) {
       let changed = false;
       if (u.logo && u.logo.length > 500 && !u.logo.startsWith('http')) { u.logo = ''; changed = true; }
       if (u.banner && u.banner.length > 500 && !u.banner.startsWith('http')) { u.banner = ''; changed = true; }
       if (changed) { await User.updateOne({ _id: u._id }, { $set: { logo: u.logo, banner: u.banner } }); uCount++; }
    }
    const products = await Product.find({});
    let pCount = 0;
    for (const p of products) {
      if (p.images && Array.isArray(p.images)) {
        const cleanImgs = p.images.filter(img => img && img.startsWith('http') && img.length < 2000);
        if (cleanImgs.length !== p.images.length) { p.images = cleanImgs; await p.save(); pCount++; }
      }
    }
    const orders = await Order.find({});
    let oCount = 0;
    for (const o of orders) {
      let changed = false;
      if (o.items && Array.isArray(o.items)) {
        const newItems = o.items.map(item => {
          if (item.images && Array.isArray(item.images)) {
             const cleanImgs = item.images.filter(img => img && img.startsWith('http') && img.length < 2000);
             if (cleanImgs.length !== item.images.length) { item.images = cleanImgs; changed = true; }
          }
          return item;
        });
        if (changed) { await Order.updateOne({ _id: o._id }, { $set: { items: newItems } }); oCount++; }
      }
    }
    res.json({ success: true, message: `清理完成: ${uCount} Users, ${pCount} Products, ${oCount} Orders.` });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/messages', async (req, res) => {
  try {
    const { user1, user2, userId } = req.query;
    if (userId && !user1 && !user2) {
       const messages = await Message.find({ $or: [{ senderId: userId }, { receiverId: userId }] }).sort({ timestamp: 1 }).lean(); 
       return res.json(messages);
    }
    if (user1 && user2) {
      const messages = await Message.find({ $or: [{ senderId: user1, receiverId: user2 }, { senderId: user2, receiverId: user1 }] }).sort({ timestamp: 1 }).lean();
      return res.json(messages);
    }
    res.json([]);
  } catch (error) { res.status(500).json({ message: 'Error fetching messages' }); }
});

app.post('/api/messages', async (req, res) => {
  try {
    const { content, text, ...rest } = req.body;
    const newMessage = new Message({ ...rest, content: content || text });
    await newMessage.save();
    res.json(newMessage);
  } catch (e) { res.status(500).json({ message: 'Message send failed' }); }
});

app.put('/api/messages/read', async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;
    await Message.updateMany({ senderId, receiverId, isRead: false }, { $set: { isRead: true } });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ message: 'Failed to mark as read' }); }
});

app.get('/api/products', async (req, res) => {
  const { shop_id, q } = req.query;
  try {
    const suspendedUsers = await User.find({ is_suspended: true }).lean();
    const allSuspendedIds = [...suspendedUsers.map(u => u.id), ...suspendedUsers.map(u => u.shop_id).filter(id => id)];
    let query = { shop_id: { $nin: allSuspendedIds } };
    if (shop_id) query.shop_id = shop_id;
    if (q) {
      const regex = new RegExp(q, 'i');
      query.$or = [{ name: regex }, { description: regex }, { keywords: regex }];
    }
    const productsQuery = Product.find(query);
    if (!q && !shop_id) productsQuery.limit(100);
    const products = await productsQuery.lean().exec();
    const cleanProducts = products.map(p => ({
        ...p,
        images: p.images ? p.images.filter(img => isUrl(img)) : []
    }));
    const activeProducts = cleanProducts.filter(p => !allSuspendedIds.includes(p.shop_id));
    activeProducts.sort((a, b) => (a.pin_rank || 9999) - (b.pin_rank || 9999));
    res.json(activeProducts);
  } catch (error) { res.status(500).json({ message: 'Failed to fetch products' }); }
});

// ==========================================
// ★ 新增功能 4：Excel 快速上架 (專屬通道，不受 1 分鐘 1 個的限制)
// ==========================================
app.post('/api/products/bulk', keywordFilter, async (req, res) => {
  try {
    const { products } = req.body;
    if (!Array.isArray(products)) return res.status(400).json({ message: '無效的資料格式' });
    
    // 將陣列資料直接整批寫入資料庫
    await Product.insertMany(products);
    res.json({ success: true, count: products.length });
  } catch (e) {
    console.error("批次上架錯誤:", e);
    res.status(500).json({ message: '大量上架失敗' });
  }
});

// ==========================================
// 單一商品上架 (加入上架限流、蜜罐防護、關鍵字審查)
// ==========================================
app.post('/api/products', productCreationLimiter, honeypotCheck, keywordFilter, async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.json(product);
  } catch (e) { res.status(500).json({ message: 'Create product failed' }); }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    res.json(product);
  } catch (e) { res.status(500).json({ message: 'Update failed' }); }
});

app.patch('/api/products/:id/close', async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate({ id: req.params.id }, { status: 'CLOSED' }, { new: true });
    res.json(product);
  } catch (e) { res.status(500).json({ message: 'Failed' }); }
});

app.delete('/api/products/:id', async (req, res) => {
  await Product.deleteOne({ id: req.params.id });
  res.json({ success: true });
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Not found' });
    if (!user.plain_password) return res.status(400).json({ message: 'Old account' });
    await transporter.sendMail({
      from: '"InsBuy" <service@insbuy.com>',
      to: email,
      subject: 'Password Recovery',
      text: `Your password: ${user.plain_password}`
    });
    res.json({ message: 'Sent' });
  } catch (error) { res.status(500).json({ message: 'Failed', error }); }
});

app.post('/api/users', async (req, res) => {
  try {
    const { name, phone, email, password, role, level } = req.body; 
    if (await User.findOne({ $or: [{ phone }, { email }] })) return res.status(400).json({ message: 'Exists' });
    const newId = await generateNextUserId();
    const newUser = new User({
      id: newId, name, phone, email, password: await bcrypt.hash(password, 10), plain_password: password,
      role: role || 'BUYER', level: level || 1, shop_id: role === 'SELLER' ? `S-${Date.now()}` : undefined,
      created_at: new Date().toISOString(), is_suspended: false, google_map_url: '',
      following: [], // ★ 補上這行
      stats: { ratingCount: 0, productCount: 0, followerCount: 0, responseRate: 100, responseTime: '1h', joinTime: new Date().toISOString(), averageRating: 0 }
    });
    await newUser.save();
    res.json(newUser);
  } catch (error) { res.status(500).json({ message: 'Error', error }); }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}).lean();
    
    // ★ 功能4新增：全域檢查並更新過期的會員等級
    const today = new Date().toISOString().split('T')[0];
    for (let u of users) {
      if (u.level_expire_at && u.level_expire_at < today) {
          await User.updateOne({ _id: u._id }, { $set: { level: 1 }, $unset: { level_expire_at: "" } });
          u.level = 1;
          u.level_expire_at = null;
      }
    }

    const cleanUsers = users.map(u => ({
      ...u,
      logo: isUrl(u.logo) ? u.logo : '',
      banner: isUrl(u.banner) ? u.banner : '' 
    }));
    res.json(cleanUsers);
  } catch (e) {
    console.error("Users Error:", e);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  await User.deleteOne({ id: req.params.id });
  res.json({ success: true });
});

app.post('/api/users/:id/reviews', async (req, res) => {
  try {
    const { userId, userName, rating, comment } = req.body;
    const user = await User.findOne({ id: req.params.id });
    if (!user) return res.status(404).json({ message: 'Not found' });
    user.shop_reviews.unshift({ id: `sr-${Date.now()}`, userId, userName, rating, comment, createdAt: new Date().toISOString() });
    user.stats.ratingCount = user.shop_reviews.length;
    user.stats.averageRating = user.stats.ratingCount > 0 ? parseFloat((user.shop_reviews.reduce((a,b)=>a+b.rating,0)/user.stats.ratingCount).toFixed(1)) : 0;
    await user.save();
    res.json(user);
  } catch (e) { res.status(500).json({ message: 'Failed' }); }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const settings = await Settings.findOne({ key: 'main' });
    if (settings && settings.registrationEnabled === false) return res.status(403).json({ message: 'Closed' });
    const { password, role, level, name, phone, email, ...other } = req.body;
    if (await User.findOne({ $or: [{ phone }, { email }] })) return res.status(400).json({ message: 'Exists' });
    const newId = await generateNextUserId();
    const user = new User({
      ...other, // ★ 把其餘欄位(shop_name等)放在最前面
      id: newId, name, phone, email, password: await bcrypt.hash(password, 10), plain_password: password,
      role: role || 'BUYER', level: level || 1, shop_id: role === 'SELLER' ? `S-${Date.now()}` : undefined,
      created_at: new Date().toISOString(), is_suspended: false, google_map_url: '', 
      following: [], // ★ 補上這行
      stats: { ratingCount: 0, productCount: 0, followerCount: 0, responseRate: 100, responseTime: '即時', joinTime: '剛剛', averageRating: 0 }
    });
    await user.save();
    res.json(user);
  } catch (error) { res.status(500).json({ message: 'Failed', error }); }
});

app.post('/api/users/:id/upgrade', async (req, res) => {
  try {
    const user = await User.findOne({ id: req.params.id });
    if (!user) return res.status(404).json({ message: 'Not found' });
    Object.assign(user, { role: 'SELLER', shop_id: user.shop_id || `S-${Date.now()}`, ...req.body });
    await user.save();
    res.json(user);
  } catch (e) { res.status(500).json({ message: 'Failed' }); }
});

app.post('/api/auth/login', async (req, res) => {
  const { phoneOrEmail, password, role } = req.body;
  try {
    const user = await User.findOne({ $or: [{ id: phoneOrEmail }, { phone: phoneOrEmail }, { email: phoneOrEmail }] });
    if (!user) return res.status(401).json({ message: 'Not found' });
    if (user.is_suspended) return res.status(403).json({ message: 'Suspended' });
    if (!await bcrypt.compare(password, user.password)) return res.status(401).json({ message: 'Invalid' });

    // ★ 功能4新增：檢查會員等級是否過期，若過期則自動降為 1 級
    const today = new Date().toISOString().split('T')[0];
    if (user.level_expire_at && user.level_expire_at < today) {
        user.level = 1;
        user.level_expire_at = null; 
        await User.updateOne({ _id: user._id }, { $set: { level: 1 }, $unset: { level_expire_at: "" } });
    }
    if (role === 'SELLER' && !['SELLER', 'ADMIN', 'PERMISSION_EDITOR'].includes(user.role)) return res.status(403).json({ message: 'Denied' });
    res.json(user);
  } catch (e) { res.status(500).json({ message: 'Error' }); }
});

app.put('/api/users/:id', async (req, res) => {
  const data = { ...req.body };
  if (data.password && data.password.length < 20) { 
    data.plain_password = data.password;
    data.password = await bcrypt.hash(data.password, 10);
  }
  
  // ★ 防呆機制：明確處理 level_expire_at，如果前端傳來空字串 (清除日期)，則明確存為 null 讓系統判定為「無期限」
  if (data.level_expire_at === '' || data.level_expire_at === null) {
     data.level_expire_at = null;
  }

  const user = await User.findOneAndUpdate({ id: req.params.id }, data, { new: true });
  res.json(user);
});

app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find({}).lean();
    const optimizedOrders = orders.map(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items = order.items.map(item => {
          if (item.images && Array.isArray(item.images)) {
              const cleanImgs = item.images.filter(img => img && img.startsWith('http') && img.length < 2000);
              item.images = cleanImgs.length > 0 ? [cleanImgs[0]] : [];
          }
          return item;
        });
      }
      return order;
    });
    res.json(optimizedOrders);
  } catch (e) {
    res.status(500).json({ message: "Orders Error" });
  }
});

app.post('/api/orders', async (req, res) => {
  const order = new Order(req.body);
  await order.save();
  res.json(order);
});

app.patch('/api/orders/:id/status', async (req, res) => {
  const order = await Order.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
  res.json(order);
});

app.get('/api/categories', async (req, res) => {
  try {
    const filter = req.query.shop_id ? { shop_id: req.query.shop_id } : {};
    const categories = await Category.find(filter).lean();
    res.json(categories);
  } catch (e) {
    console.error("Category Error:", e);
    res.status(500).json({ message: "Category Error" });
  }
});

app.post('/api/categories/bulk', async (req, res) => {
  try {
    const { categories, shopId } = req.body;
    
    if (!shopId) {
      return res.status(400).json({ message: 'shopId is required' });
    }

    // 如果傳來的是空陣列，代表商家刪除了所有分類
    if (!categories || categories.length === 0) {
       await Category.deleteMany({ shop_id: shopId });
       return res.status(200).json({ message: '分類已全數清空' });
    }

    // 1. 取得資料庫中「其他商家」用掉的 ID，避免跨店重複
    const otherShopCats = await Category.find({ shop_id: { $ne: shopId } }).select('id').lean();
    const globalUsedIds = new Set(otherShopCats.map(c => c.id));

    const currentPayloadIds = new Set();
    const idMapping = {};
    
    // 2. 清理與檢查 ID，確保 ID 絕對唯一
    const sanitizedCategories = categories.map((cat, index) => {
        const { _id, __v, ...cleanCat } = cat;
        let finalId = cleanCat.id;
        
        if (!finalId || currentPayloadIds.has(finalId) || globalUsedIds.has(finalId)) {
            const newId = `cat_${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${index}`;
            idMapping[cleanCat.id] = newId; 
            finalId = newId;
        }
        
        currentPayloadIds.add(finalId);
        cleanCat.id = finalId;
        cleanCat.shop_id = shopId;
        return cleanCat;
    });

    // 3. 修復子分類的 parent_id 連結
    const finalCategories = sanitizedCategories.map(cat => {
        if (cat.parent_id && idMapping[cat.parent_id]) {
            cat.parent_id = idMapping[cat.parent_id];
        }
        return cat;
    });

    // 4. 找出這次保留下來的 ID 列表
    const keepIds = finalCategories.map(c => c.id);

    // 5. 先把「不在此次更新名單內」的舊分類刪除 (解決不要的分類)
    await Category.deleteMany({ shop_id: shopId, id: { $nin: keepIds } });

    // 6. ★ 終極修復：使用 bulkWrite(updateOne) 來更新或新增，徹底避免併發造成的 Duplicate Key 錯誤！
    const bulkOps = finalCategories.map(cat => ({
        updateOne: {
            filter: { id: cat.id },
            update: { $set: cat },
            upsert: true // 如果不存在就新增，存在就只做更新
        }
    }));

    if (bulkOps.length > 0) {
        await Category.bulkWrite(bulkOps);
    }

    res.status(200).json({ message: '分類同步成功' });
  } catch (error) {
    console.error('分類批量更新失敗:', error);
    res.status(500).json({ message: '分類更新失敗', error: error.message });
  }
});

app.get('/api/settings', async (req, res) => {
  try {
    let settings = await Settings.findOne({ key: 'main' }).lean();
    if (!settings) {
      settings = new Settings({ key: 'main', registrationEnabled: true });
      await new Settings(settings).save();
    }
    res.json(settings);
  } catch (e) {
    console.error("Settings Error:", e);
    res.status(500).json({ message: "Failed to fetch settings" });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    const settings = await Settings.findOneAndUpdate({ key: 'main' }, req.body, { new: true, upsert: true });
    res.json(settings);
  } catch (e) { res.status(500).json({ message: "Settings Update Error" }); }
});

app.get('/api/permissions', async (req, res) => {
  try {
    const permissions = await Permission.find({}).lean();
    res.json(permissions);
  } catch (e) {
    console.error("Permissions Error:", e);
    res.status(500).json({ message: "Permissions Error" });
  }
});

app.post('/api/permissions/bulk', async (req, res) => {
  await Permission.deleteMany({});
  await Permission.insertMany(req.body.permissions);
  res.json(req.body.permissions);
});

// ==========================================
// ★ 新增：買家黑名單與停用邏輯
// ==========================================
app.post('/api/users/:id/blacklist', async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const { sellerId } = req.body;
    const user = await User.findOne({ id: targetUserId });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.blacklisted_by) user.blacklisted_by = [];
    
    // ★ 修改：改為切換 (Toggle) 邏輯
    if (user.blacklisted_by.includes(sellerId)) {
        // 如果已經在黑名單中，則解除封鎖
        user.blacklisted_by = user.blacklisted_by.filter(id => id !== sellerId);
    } else {
        // 如果不在黑名單中，則加入
        user.blacklisted_by.push(sellerId);
        // ★ 核心邏輯：滿 3 個不同賣家檢舉/黑名單，自動停用帳號
        if (user.blacklisted_by.length >= 3) {
            user.is_suspended = true;
        }
    }
    
    // 儲存並回傳更新後的狀態
    await User.findOneAndUpdate(
        { id: targetUserId }, 
        { blacklisted_by: user.blacklisted_by, is_suspended: user.is_suspended },
        { new: true } 
    );
    res.json(user);
  } catch (e) {
    res.status(500).json({ message: "Error" });
  }
});

// ==========================================
// ★ 新增：紀錄商品瀏覽量
// ==========================================
// ==========================================
// ★ 新增：紀錄商品瀏覽量 (含平台瀏覽量連動)
// ==========================================
app.post('/api/products/:id/view', async (req, res) => {
  try {
    // ★ 修正：統一轉成絕對的 YYYY-MM-DD 格式，避免各系統時間格式不同導致對不起來
    const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    // 使用 $inc 強制 MongoDB 增加數值，保證絕對寫入成功
    await Product.findOneAndUpdate(
        { id: req.params.id },
        { $inc: { [`views.${today}`]: 1 } },
        { new: true }
    );
    // ★ 連動增加平台總瀏覽量
    await SiteSettings.findOneAndUpdate(
        {},
        { $inc: { [`platform_views.${today}`]: 1 } },
        { upsert: true, new: true }
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: "Error" });
  }
});

// ==========================================
// ★ 新增：紀錄平台總瀏覽量 (首頁等其他地方觸發)
// ==========================================
app.post('/api/settings/view', async (req, res) => {
  try {
    // ★ 修正：統一轉成絕對的 YYYY-MM-DD 格式
    const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    await SiteSettings.findOneAndUpdate(
        {},
        { $inc: { [`platform_views.${today}`]: 1 } },
        { upsert: true, new: true }
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: "Error" });
  }
});

// ★ 新增：取得平台總瀏覽量資料 (供管理員後台使用)
app.get('/api/platform-views', async (req, res) => {
  try {
    const settings = await SiteSettings.findOne({});
    res.json(settings ? settings.platform_views : {});
  } catch (e) {
    res.status(500).json({ message: "Error" });
  }
});

// ==========================================
// ★ 新增：抓取外部網頁標題 API (跨網購比價書籤專用)
// ==========================================
app.get('/api/fetch-metadata', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    // 偽裝成正常瀏覽器，避免被其他電商網站阻擋
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });
    
    const html = await response.text();
    // 使用正規表達式快速提取 <title> 標籤內容
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    let title = titleMatch ? titleMatch[1].trim() : '';
    
    // ★ 修復：判斷是否遇到 Cloudflare 等防機器人驗證頁面
    const blockedTitles = ['Just a moment...', 'Attention Required!', 'Cloudflare', '403 Forbidden', 'Access Denied', 'Not Acceptable', 'Security Check'];
    const isBlocked = blockedTitles.some(b => title.includes(b)) || !title;

    if (isBlocked) {
        // 如果遇到阻擋，智慧擷取網域名稱首字母大寫作為標題 (例如 grok.com -> Grok)
        try {
            const hostname = new URL(url).hostname.replace('www.', '');
            const siteName = hostname.split('.')[0];
            title = siteName.charAt(0).toUpperCase() + siteName.slice(1);
        } catch(e) {
            title = '未命名網頁';
        }
    }
    
    res.json({ title });
  } catch (error) {
    console.error('Metadata fetch error:', error.message);
    // 如果連線完全失敗，也嘗試用網址名稱作為備用標題
    try {
        const hostname = new URL(req.query.url).hostname.replace('www.', '');
        const siteName = hostname.split('.')[0];
        res.json({ title: siteName.charAt(0).toUpperCase() + siteName.slice(1) });
    } catch(e) {
        res.json({ title: '無法自動抓取標題 (請手動輸入)' });
    }
  }
});

app.post('/api/reports', async (req, res) => {
  const report = new Report({ ...req.body, id: `rpt-${Date.now()}`, created_at: new Date().toISOString() });
  await report.save();
  res.json(report);
});

app.get('/api/reports', async (req, res) => {
  const reports = await Report.find({}).sort({ created_at: -1 }).lean();
  res.json(reports);
});

app.put('/api/reports/:id', async (req, res) => {
  const report = await Report.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
  res.json(report);
});

app.delete('/api/reports/:id', async (req, res) => {
  await Report.deleteOne({ id: req.params.id });
  res.json({ success: true });
});

// 增加連線設定，避免 timeout
mongoose.connect(MONGODB_URI, { 
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(() => {
    console.log('✅ MongoDB 連線成功！');
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => console.error('❌ MongoDB Connection Error:', err));