// src/utils/googleCalendar.ts

// ★ 注意：這裡需要填入你自己申請的 Google Client ID 才能正式運作！
const CLIENT_ID = '783138565820-sl1ug065ao86aatg70efst5o87up203p.apps.googleusercontent.com'; 
// ★ 將權限改為完整的 calendar，以支援讀取日曆群組清單
const SCOPES = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email';

let tokenClient: any;

// 動態載入 Google 官方安全登入套件
export const initGoogleCalendar = (onCodeSuccess: (code: string) => void) => {
  const initClient = () => {
    if ((window as any).google?.accounts?.oauth2) {
        tokenClient = (window as any).google.accounts.oauth2.initCodeClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          ux_mode: 'popup',
          callback: (response: any) => {
            if (response.error !== undefined) {
              console.error('Google 授權失敗:', response);
              return;
            }
            onCodeSuccess(response.code); // ★ 核心差異：現在拿的是 Code，不是 1 小時就過期的 Token
          },
        });
    }
  };

  if (document.getElementById('google-gsi-client')) {
    initClient(); 
    return;
  }

  const script = document.createElement('script');
  script.id = 'google-gsi-client';
  script.src = 'https://accounts.google.com/gsi/client';
  script.async = true;
  script.defer = true;
  script.onload = initClient;
  document.body.appendChild(script);
};

export const authorizeGoogle = () => {
  if (tokenClient) {
    tokenClient.requestCode(); // ★ 請求離線授權碼
  } else {
    alert('Google 登入模組載入中，請稍後再試。');
  }
};

// 將行程寫入 Google 日曆 API
// ★ 新增：取得使用者的日曆群組清單
export const getGoogleCalendars = async (accessToken: string) => {
  const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error('無法取得日曆清單');
  return await response.json();
};

// 將行程寫入 Google 日曆 API (擴充完整參數)
export const addEventToGoogleCalendar = async (
  accessToken: string,
  eventDetails: { 
    title: string; date: string; time: string; 
    endDate: string; endTime: string; isAllDay: boolean; 
    location: string; description: string;
    calendarId?: string; reminders?: number[]; attendees?: string[]; addMeetLink?: boolean;
  }
) => {
  let start, end;

  if (eventDetails.isAllDay) {
    start = { date: eventDetails.date, timeZone: 'Asia/Taipei' };
    const endD = new Date(eventDetails.endDate);
    endD.setDate(endD.getDate() + 1);
    end = { date: endD.toISOString().split('T')[0], timeZone: 'Asia/Taipei' };
  } else {
    start = { dateTime: `${eventDetails.date}T${eventDetails.time}:00+08:00`, timeZone: 'Asia/Taipei' };
    end = { dateTime: `${eventDetails.endDate}T${eventDetails.endTime}:00+08:00`, timeZone: 'Asia/Taipei' };
  }

  const event: any = {
    summary: eventDetails.title,
    location: eventDetails.location || undefined,
    description: eventDetails.description || undefined,
    start: start,
    end: end,
  };

  // ★ 新增：自訂提醒通知 (傳入提前的分鐘數)
  if (eventDetails.reminders && eventDetails.reminders.length > 0) {
    event.reminders = {
      useDefault: false,
      overrides: eventDetails.reminders.map(min => ({ method: 'popup', minutes: min }))
    };
  }

  // ★ 新增：邀請對象 (Email 陣列)
  if (eventDetails.attendees && eventDetails.attendees.length > 0) {
    event.attendees = eventDetails.attendees.map(email => ({ email: email.trim() }));
  }

  // ★ 新增：建立 Google Meet 視訊會議
  if (eventDetails.addMeetLink) {
    event.conferenceData = {
      createRequest: { requestId: `meet-${Date.now()}`, conferenceSolutionKey: { type: 'hangoutsMeet' } }
    };
  }

  // ★ 支援指定日曆群組 (calendarId)，並且加上 conferenceDataVersion=1 參數以支援產生 Meet 連結
  const calendarId = encodeURIComponent(eventDetails.calendarId || 'primary');
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?conferenceDataVersion=1`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) throw new Error('Google Calendar API 拒絕存取，可能授權已過期。');
  return await response.json();
};