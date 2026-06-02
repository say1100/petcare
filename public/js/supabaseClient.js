// js/supabaseClient.js

const SUPABASE_URL = "https://ihrzsxxrvlogsahkmsgq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlocnpzeHhydmxvZ3NhaGttc2dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NjI3ODMsImV4cCI6MjA5NTMzODc4M30.oj2E2c5pKbARb2QJo571znep3jpVJlZrDGbbFOa0C8s";

window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

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
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("✅ Supabase client 初始化成功");
    window.dispatchEvent(new CustomEvent('supabaseReady'));
  } catch (error) {
    console.error("❌ Supabase client 初始化失败:", error);
    window.supabaseClient = null;
  }
}

function loadSupabaseSDK() {
  if (window.supabase) {
    initSupabaseClient();
    return;
  }

  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  script.onload = function() {
    console.log("✅ Supabase SDK 加载完成");
    initSupabaseClient();
  };
  script.onerror = function() {
    console.error("❌ Supabase SDK 加载失败");
  };
  document.body.appendChild(script);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadSupabaseSDK);
} else {
  loadSupabaseSDK();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SUPABASE_URL, SUPABASE_ANON_KEY };
}