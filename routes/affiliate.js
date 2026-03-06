// routes/affiliate.js
import express from 'express';
import bcrypt from 'bcryptjs';
// ★ 引入需要的資料庫模型
import { Influencer, AffiliateLink, AffiliateClick } from '../models/index.js';

const router = express.Router();

// 網紅註冊 (強化版：精準判斷重複與真實報錯)
router.post('/influencers/register', async (req, res) => {
  try {
    const { account, password, name, email, phone } = req.body;

    if (!account || !password || !name || !email || !phone) {
         return res.status(400).json({ message: '請填寫所有註冊欄位！' });
    }

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
router.post('/influencers/login', async (req, res) => {
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
router.get('/influencers/account/:account', async (req, res) => {
  try {
    const influencer = await Influencer.findOne({ account: req.params.account }).select('-password').lean();
    if (!influencer) return res.status(404).json({ message: '找不到此網紅帳號' });
    res.json(influencer);
  } catch (error) { res.status(500).json({ message: 'Error fetching influencer' }); }
});

// 取得分潤專案 (賣家看自己的)
router.get('/affiliate-links', async (req, res) => {
  try {
    const { shop_id } = req.query;
    const links = await AffiliateLink.find({ shop_id }).sort({ created_at: -1 }).lean();
    res.json(links);
  } catch (error) { res.status(500).json({ message: 'Error fetching links' }); }
});

// 網紅看全站再到前端過濾
router.get('/affiliate-links/all', async (req, res) => {
  try {
    const links = await AffiliateLink.find({}).sort({ created_at: -1 }).lean();
    res.json(links);
  } catch (error) { res.status(500).json({ message: 'Error fetching links' }); }
});

// 賣家建立分潤專案
router.post('/affiliate-links', async (req, res) => {
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
router.put('/affiliate-links/:id', async (req, res) => {
  try {
    const link = await AffiliateLink.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    res.json(link);
  } catch (error) { res.status(500).json({ message: 'Update link failed' }); }
});

// 紀錄點擊
router.post('/affiliate-clicks', async (req, res) => {
  try {
    const click = new AffiliateClick({ ...req.body, id: `clk-${Date.now()}`, clicked_at: new Date().toISOString() });
    await click.save();
    res.json(click);
  } catch (error) { res.status(500).json({ message: 'Record click failed' }); }
});

export default router;