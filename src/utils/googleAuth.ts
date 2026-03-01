const CLIENT_ID = '783138565820-sl1ug065ao86aatg70efst5o87up203p.apps.googleusercontent.com';

export const verifyGmail = (onSuccess: (email: string) => void, onError: (err: any) => void) => {
  if (!(window as any).google) {
    onError(new Error('Google 登入模組尚未載入，請稍後再試。'));
    return;
  }

  // 使用 TokenClient 僅請求最低層級的 email 讀取權限 (不會觸發敏感權限審查)
  const client = (window as any).google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: 'https://www.googleapis.com/auth/userinfo.email',
    callback: async (response: any) => {
      if (response.error) {
        onError(new Error('授權失敗或已取消'));
        return;
      }
      try {
        // 利用取得的臨時 token 呼叫 Google API 獲取使用者的 Email
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${response.access_token}` },
        });
        const data = await res.json();
        
        if (data.email) {
          onSuccess(data.email);
        } else {
          onError(new Error('無法從 Google 取得您的 Email'));
        }
      } catch (err) {
        onError(err);
      }
    },
  });
  
  // 觸發登入視窗
  client.requestAccessToken();
};