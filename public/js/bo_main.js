// ─── BACK-OFFICE INITIALIZATION ──────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  renderBoLayout();
  // Supabase DB에서 핵심 데이터 로드 (실패 시 JS mock 데이터로 자동 fallback)
  if (typeof initSupabaseData === 'function') {
    await initSupabaseData();
  }
  boNavigate('dashboard');
});