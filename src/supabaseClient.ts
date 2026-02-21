import { createClient } from '@supabase/supabase-js';

// ★ 正確的 URL
const SUPABASE_URL = 'https://robgmhyjdfizzxdddqzr.supabase.co';

// ★ 已修正：刪除前方多餘的中文字「請把您的_ANO」，留下正確的 JWT 金鑰
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvYmdtaHlqZGZpenp4ZGRkcXpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MTM1NTAsImV4cCI6MjA4NDQ4OTU1MH0.wtVeC1aTE_6NUny3CumQNopdPlWe0MHqlA2_jN71GwI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 圖片上傳共用函式
export const uploadImageToSupabase = async (file: Blob | File, bucketName: string = 'images'): Promise<string | null> => {
  try {
    const fileExt = file.type.split('/')[1] || 'jpg';
    const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'image/jpeg' // ★ 明確指定 Content-Type 確保圖片不漏失格式
      });

    if (error) {
      console.error('Supabase Upload Error:', error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (e) {
    console.error('Upload Exception:', e);
    return null;
  }
};