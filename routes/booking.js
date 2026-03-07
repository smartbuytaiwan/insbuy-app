import express from 'express';
import { Staff, Service, Resource, Booking, CustomerProfile, Voucher, StoreBookingSetting, Wallet } from '../models/index.js'; // ★ 新增：引入 Wallet 模型

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
    // ★ 跨日邏輯支援：為了確保能抓到跨日到凌晨的預約單進行防撞期比對，將結束時間往後推 24 小時
    endOfDay.setDate(endOfDay.getDate() + 1); 

    const existingBookings = await Booking.find({
      shop_id,
      ...(staff_id && { staff_id }),
      status: { $in: ['PENDING', 'CONFIRMED'] },
      start_time: { $gte: startOfDay.toISOString(), $lte: endOfDay.toISOString() }
    }).lean();

    // ★ 新增：取得指定的員工當日班表，交給前端判斷是否可預約
    let staffShift = null;
    if (staff_id) {
       const staff = await Staff.findOne({ id: staff_id }).lean();
       if (staff) {
          const leaveRecord = staff.leave_records?.find(l => l.date === date);
          if (leaveRecord) {
             staffShift = { isLeave: true, leaveType: leaveRecord.leave_type };
          } else {
             const assignedShiftId = staff.shift_assignments?.[date];
             if (assignedShiftId) {
                const shift = staff.shifts?.find(s => s.id === assignedShiftId);
                if (shift) staffShift = { isLeave: false, start: shift.start_time, end: shift.end_time };
             } else {
                staffShift = { isLeave: false, start: null, end: null }; // 未排班
             }
          }
       }
    }

    res.json({ totalMinutesNeeded, existingBookings, storeSetting, staffShift, isClosedDay: false, message: '已回傳防撞期所需基礎數據' });
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
// ★ 新增：更新預約單狀態 (支援付款狀態更新)
router.patch('/update-status/:id', async (req, res) => {
  try {
    const { status, deposit_status } = req.body;
    const updateData = {};
    if (status) updateData.status = status;
    if (deposit_status) updateData.deposit_status = deposit_status;
    res.json(await Booking.findOneAndUpdate({ id: req.params.id }, { $set: updateData }, { new: true }));
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

// ==========================================
// 9. 買家專屬資產查詢 (Buyer Assets)
// ==========================================
// 取得買家擁有的所有票券
router.get('/vouchers/buyer/:buyer_id', async (req, res) => {
  try { res.json(await Voucher.find({ buyer_id: req.params.buyer_id }).lean()); }
  catch (e) { res.status(500).json({ message: 'Error' }); }
});

// 取得買家儲值金總餘額
router.get('/wallet/buyer/:buyer_id', async (req, res) => {
  try { 
    const wallets = await Wallet.find({ buyer_id: req.params.buyer_id }).lean();
    const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
    res.json({ total_balance: totalBalance, wallets }); 
  }
  catch (e) { res.status(500).json({ message: 'Error' }); }
});

// ==========================================
// 10. 票券轉贈 (Transfer Voucher)
// ==========================================
router.post('/vouchers/transfer', async (req, res) => {
  try {
    const { voucher_id, from_buyer_id, to_buyer_id } = req.body;
    
    // 檢查朋友是否存在 (透過 mongoose 動態取得 User model)
    const mongoose = await import('mongoose');
    const User = mongoose.model('User');
    const friend = await User.findOne({ id: to_buyer_id });
    
    if (!friend) {
        return res.status(404).json({ message: '找不到該好友 ID，請確認輸入是否正確！' });
    }

    const voucher = await Voucher.findOne({ id: voucher_id, buyer_id: from_buyer_id });
    if (!voucher) return res.status(404).json({ message: '找不到此票券，或您無權限轉贈。' });

    // 轉移擁有權
    voucher.buyer_id = to_buyer_id;
    await voucher.save();
    
    res.json({ success: true, message: `成功將票券贈送給好友「${friend.name || friend.id}」！` });
  } catch (e) { 
    res.status(500).json({ message: '轉贈發生錯誤，請稍後再試。' }); 
  }
});

export default router;