// routes/google.js
import express from 'express';
import { User } from '../models/index.js'; // 引入剛剛獨立的 User 模型

const router = express.Router();

// ★ 新增：抓取 Google 日曆行程的後端 API (能讀取最新面交訂單)
router.get('/events', async (req, res) => {
  try {
    const { userId } = req.query;
    const user = await User.findOne({ id: userId });
    if (!user || !user.google_calendar_refresh_token) {
       return res.json([]); 
    }

    const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: user.google_calendar_refresh_token,
        grant_type: 'refresh_token'
      })
    });
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) return res.json([]);

    const timeMin = new Date(); timeMin.setMonth(timeMin.getMonth() - 1);
    const timeMax = new Date(); timeMax.setMonth(timeMax.getMonth() + 2);

    const eventsRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}&singleEvents=true&orderBy=startTime`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const eventsData = await eventsRes.json();

    if (eventsData.items) {
       const formattedEvents = eventsData.items.map(item => {
           const start = item.start.dateTime || item.start.date;
           const end = item.end.dateTime || item.end.date;
           const isAllDay = !item.start.dateTime;
           const startDate = new Date(start);
           const endDate = new Date(end);

           return {
              id: item.id,
              title: item.summary || '無標題行程',
              date: `${startDate.getFullYear()}-${String(startDate.getMonth()+1).padStart(2,'0')}-${String(startDate.getDate()).padStart(2,'0')}`,
              time: isAllDay ? '' : `${String(startDate.getHours()).padStart(2,'0')}:${String(startDate.getMinutes()).padStart(2,'0')}`,
              endDate: `${endDate.getFullYear()}-${String(endDate.getMonth()+1).padStart(2,'0')}-${String(endDate.getDate()).padStart(2,'0')}`,
              endTime: isAllDay ? '' : `${String(endDate.getHours()).padStart(2,'0')}:${String(endDate.getMinutes()).padStart(2,'0')}`,
              isAllDay,
              location: item.location || '',
              description: item.description || '',
              isGoogle: true 
           };
       });
       res.json(formattedEvents);
    } else {
       res.json([]);
    }
  } catch (err) {
    console.error('Fetch Google Events Error:', err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// ★ 新增：前台手動新增行程至 Google 的 API
router.post('/events', async (req, res) => {
  try {
    const { userId, title, date, time, endDate, endTime, isAllDay, location, description, calendarId, reminders, attendees, addMeetLink } = req.body;
    const user = await User.findOne({ id: userId });
    if (!user || !user.google_calendar_refresh_token) return res.status(400).json({ error: 'No token' });

    const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
        refresh_token: user.google_calendar_refresh_token, grant_type: 'refresh_token'
      })
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) return res.status(401).json({ error: 'Refresh failed' });

    let start, end;
    if (isAllDay) {
      start = { date };
      const endD = new Date(endDate || date);
      endD.setDate(endD.getDate() + 1); 
      end = { date: `${endD.getFullYear()}-${String(endD.getMonth()+1).padStart(2,'0')}-${String(endD.getDate()).padStart(2,'0')}` };
    } else {
      start = { dateTime: `${date}T${time}:00+08:00`, timeZone: 'Asia/Taipei' };
      end = { dateTime: `${endDate || date}T${endTime}:00+08:00`, timeZone: 'Asia/Taipei' };
    }

    const event = { summary: title, location, description, start, end };
    if (reminders && reminders.length > 0) event.reminders = { useDefault: false, overrides: reminders.map(m => ({ method: 'popup', minutes: m })) };
    if (addMeetLink) event.conferenceData = { createRequest: { requestId: `meet-${Date.now()}`, conferenceSolutionKey: { type: 'hangoutsMeet' } } };

    const calId = encodeURIComponent(calendarId || 'primary');
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calId}/events?conferenceDataVersion=1`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenData.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    });
    const data = await response.json();
    res.json({ success: true, event: data });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// ★ 新增：Google 授權換取永久 Token 的後端 API
router.post('/auth', async (req, res) => {
  try {
    const { userId, code } = req.body;
    const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

    if (!CLIENT_ID || !CLIENT_SECRET) {
      console.error('❌ [錯誤] 後端伺服器缺少 GOOGLE_CLIENT_ID 或 GOOGLE_CLIENT_SECRET 環境變數！');
      return res.status(400).json({ error: '伺服器金鑰未設定' });
    }

    console.log(`🔗 收到授權碼，準備兌換 Token... (Client ID: ${CLIENT_ID.substring(0, 15)}...)`);

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: 'postmessage', 
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenResponse.json();
    
    if (tokenData.error) {
       console.error('❌ Google 拒絕了 Token 兌換！詳細原因:', tokenData);
       return res.status(400).json({ error: tokenData.error, description: tokenData.error_description });
    }

    const infoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const infoData = await infoResponse.json();

    const updateData = { google_calendar_token: tokenData.access_token, google_calendar_email: infoData.email };
    if (tokenData.refresh_token) {
        updateData.google_calendar_refresh_token = tokenData.refresh_token;
    }

    const user = await User.findOneAndUpdate({ id: userId }, updateData, { new: true });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: 'Google Auth Failed' });
  }
});

export default router;