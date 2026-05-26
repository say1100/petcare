// js/supabaseClient.js

// Supabase 配置
const SUPABASE_URL = "https://ihrzsxhbrvlogsahkmsgq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlocnpzeHhydmxvZ3NhaGttc2dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NjI3ODMsImV4cCI6MjA5NTMzODc4M30.oj2E2c5pKbARb2QJo571znep3jpVJlZrDGbbFOa0C8s";

// 暴露到全局
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

console.log("=== Supabase 配置信息 ===");
console.log("SUPABASE_URL:", !!SUPABASE_URL);
console.log("SUPABASE_ANON_KEY:", !!SUPABASE_ANON_KEY);
console.log("window.supabase 是否存在:", !!window.supabase);

function initSupabaseClient() {
  if (!window.supabase) {
    console.error("❌ window.supabase 不存在！请检查 CDN 是否加载");
    window.supabaseClient = null;
    return;
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("❌ Supabase 配置缺失");
    window.supabaseClient = null;
    return;
  }

  try {
    console.log("🚀 正在初始化 Supabase client...");
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("✅ Supabase client 初始化成功");
    
    const event = new CustomEvent('supabaseReady');
    window.dispatchEvent(event);
  } catch (error) {
    console.error("❌ Supabase client 初始化失败:", error);
    window.supabaseClient = null;
  }
}

initSupabaseClient();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SUPABASE_URL, SUPABASE_ANON_KEY };
}