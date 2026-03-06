import express from 'express';
import { Staff, Service, Resource, Booking, CustomerProfile, Voucher, StoreBookingSetting } from '../models/index.js';

const router = express.Router();

// ==========================================
// 1. 服務項目管理 (Services)
// ==========================================
router.get('/services/:shop_id', async (req, res) => {
  try { res.json(await Service.find({ shop_id: req.params.shop_id, is_active: true }).lean()); }
  catch (e) { res.status(500).json({ message: 'Error' }); }
});
router.post('/services', async (req, res) => {
  try { const s = new Service(req.body); await s.save(); res.json(s); }
  catch (e) { res.status(500).json({ message: 'Error' }); }
});
router.put('/services/:id', async (req, res) => {
  try { res.json(await Service.findOneAndUpdate({ id: req.params.id }, req.body, { new: true })); }
  catch (e) { res.status(500).json({ message: 'Error' }); }
});
router.delete('/services/:id', async (req, res) => {
  try { await Service.deleteOne({ id: req.params.id }); res.json({ success: true }); }
  catch (e) { res.status(500).json({ message: 'Error' }); }
});

// ==========================================
// 2. 員工與排班管理 (Staff)
// ==========================================
router.get('/staff/:shop_id', async (req, res) => {
  try { res.json(await Staff.find({ shop_id: req.params.shop_id }).lean()); }
  catch (e) { res.status(500).json({ message: 'Error' }); }
});
router.post('/staff', async (req, res) => {
  try { const s = new Staff(req.body); await s.save(); res.json(s); }
  catch (e) { res.status(500).json({ message: 'Error' }); }
});
router.put('/staff/:id', async (req, res) => {
  try { res.json(await Staff.findOneAndUpdate({ id: req.params.id }, req.body, { new: true })); }
  catch (e) { res.status(500).json({ message: 'Error' }); }
});
router.delete('/staff/:id', async (req, res) => {
  try { await Staff.deleteOne({ id: req.params.id }); res.json({ success: true }); }
  catch (e) { res.status(500).json({ message: 'Error' }); }
});

// ==========================================
// 3. 【核心模組】取得可用預約時段 (防撞期演算法)
// ==========================================
router.post('/available-slots', async (req, res) => {
  try {
    const { shop_id, service_id, staff_id, date } = req.body;
    const service = await Service.findOne({ id: service_id });
    if (!service) return res.status(404).json({ message: '找不到該服務' });
    
    // ★ 1. 取得店家營業時間設定
    let storeSetting = await StoreBookingSetting.findOne({ shop_id }).lean();
    if (!storeSetting) {
        // 如果店家還沒設定，給一組預設值
        storeSetting = { default_open_time: "10:00", default_close_time: "21:00", weekly_schedule: {}, closed_dates: [] };
    }
    
    // ★ 2. 檢查今天是否為店家設定的「特定公休日」
    if (storeSetting.closed_dates && storeSetting.closed_dates.includes(date)) {
        return res.json({ totalMinutesNeeded: 0, existingBookings: [], storeSetting, isClosedDay: true, message: '本日為店家公休日' });
    }

    const totalMinutesNeeded = service.duration_minutes + service.buffer_minutes;

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const existingBookings = await Booking.find({
      shop_id,
      ...(staff_id && { staff_id }),
      status: { $in: ['PENDING', 'CONFIRMED'] },
      start_time: { $gte: startOfDay.toISOString(), $lte: endOfDay.toISOString() }
    }).lean();

    res.json({ totalMinutesNeeded, existingBookings, storeSetting, isClosedDay: false, message: '已回傳防撞期所需基礎數據' });
  } catch (error) {
    res.status(500).json({ message: '時段計算失敗' });
  }
});

// ==========================================
// 4. 預約單建立與查詢 (Bookings)
// ==========================================
router.post('/create', async (req, res) => {
  try {
    const booking = new Booking({ ...req.body, id: `BK-${Date.now()}`, created_at: new Date().toISOString() });
    await booking.save();
    res.json(booking);
  } catch (error) { res.status(500).json({ message: 'Error' }); }
});
router.get('/list', async (req, res) => {
  try {
    const { shop_id, buyer_id } = req.query;
    let query = {};
    if (shop_id) query.shop_id = shop_id;
    if (buyer_id) query.buyer_id = buyer_id;
    res.json(await Booking.find(query).sort({ start_time: 1 }).lean());
  } catch (error) { res.status(500).json({ message: 'Error' }); }
});

// ★ 新增：更新預約單狀態
router.patch('/update-status/:id', async (req, res) => {
  try {
    const { status } = req.body;
    res.json(await Booking.findOneAndUpdate({ id: req.params.id }, { status }, { new: true }));
  } catch (e) { res.status(500).json({ message: 'Error' }); }
});

// ==========================================
// 5. 設備/資源管理 (Resources)
// ==========================================
router.get('/resources/:shop_id', async (req, res) => {
  try { res.json(await Resource.find({ shop_id: req.params.shop_id }).lean()); }
  catch (e) { res.status(500).json({ message: 'Error' }); }
});
router.post('/resources', async (req, res) => {
  try { const r = new Resource(req.body); await r.save(); res.json(r); }
  catch (e) { res.status(500).json({ message: 'Error' }); }
});
router.put('/resources/:id', async (req, res) => {
  try { res.json(await Resource.findOneAndUpdate({ id: req.params.id }, req.body, { new: true })); }
  catch (e) { res.status(500).json({ message: 'Error' }); }
});
router.delete('/resources/:id', async (req, res) => {
  try { await Resource.deleteOne({ id: req.params.id }); res.json({ success: true }); }
  catch (e) { res.status(500).json({ message: 'Error' }); }
});

// ==========================================
// 6. 套券/儲值金管理 (Vouchers)
// ==========================================
router.get('/vouchers/:shop_id', async (req, res) => {
  try { res.json(await Voucher.find({ shop_id: req.params.shop_id }).lean()); }
  catch (e) { res.status(500).json({ message: 'Error' }); }
});
router.post('/vouchers', async (req, res) => {
  try { const v = new Voucher(req.body); await v.save(); res.json(v); }
  catch (e) { res.status(500).json({ message: 'Error' }); }
});
router.put('/vouchers/:id', async (req, res) => {
  try { res.json(await Voucher.findOneAndUpdate({ id: req.params.id }, req.body, { new: true })); }
  catch (e) { res.status(500).json({ message: 'Error' }); }
});

router.delete('/vouchers/:id', async (req, res) => {
  try { await Voucher.deleteOne({ id: req.params.id }); res.json({ success: true }); }
  catch (e) { res.status(500).json({ message: 'Error' }); }
});

// ==========================================
// 8. 營業時間與公休設定 (Store Settings)
// ==========================================
router.get('/settings/:shop_id', async (req, res) => {
  try {
    let setting = await StoreBookingSetting.findOne({ shop_id: req.params.shop_id }).lean();
    if (!setting) {
      setting = { shop_id: req.params.shop_id, default_open_time: "10:00", default_close_time: "21:00", weekly_schedule: {}, closed_dates: [] };
    }
    res.json(setting);
  } catch (e) { res.status(500).json({ message: 'Error' }); }
});
router.put('/settings/:shop_id', async (req, res) => {
  try {
    const data = { ...req.body, updated_at: new Date().toISOString() };
    const setting = await StoreBookingSetting.findOneAndUpdate({ shop_id: req.params.shop_id }, data, { new: true, upsert: true });
    res.json(setting);
  } catch (e) { res.status(500).json({ message: 'Error' }); }
});

export default router;