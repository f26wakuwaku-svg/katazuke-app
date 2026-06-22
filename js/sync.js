/* ============================================================
   オンライン保存（Supabase）との同期を担当します。
   - 受講生アプリ: 進捗を Supabase に送る（push）
   - 管理者画面 : ログインして全受講生の進捗を取得する
   設定（config.js）が空のときは、何もしません（アプリは通常動作）。
   ============================================================ */

window.Sync = (function () {
  var cfg = window.APP_CONFIG || {};
  var hasConfig = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);
  var hasLib = !!(window.supabase && window.supabase.createClient);
  var enabled = hasConfig && hasLib;
  var client = enabled ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;

  function isEnabled() { return enabled; }
  function isConfigured() { return hasConfig; }

  /* localStorage の現在の状態を、保存用の1件にまとめる */
  function buildSnapshot() {
    var S = window.Store, D = window.APP_DATA;
    var done = S.getDone();
    var clRaw = {};
    try { clRaw = JSON.parse(localStorage.getItem("tk_checklist") || "{}"); } catch (e) {}
    var clCount = 0;
    Object.keys(clRaw).forEach(function (k) { clCount += (clRaw[k] || []).length; });
    var diag = S.getDiagnosis();
    var meta = {};
    try { meta = JSON.parse(localStorage.getItem("tk_meta") || "{}"); } catch (e) {}

    return {
      user_id: S.getUserId(),
      nickname: S.getNickname() || "（名前なし）",
      why: S.getWhy() || null,
      streak: S.currentStreak(),
      total_done: S.totalDone(),
      first_seen: meta.firstSeen || S.todayKey(),
      last_active: S.todayKey(),
      diagnosis_place: (diag && D.places[diag.placeId]) ? D.places[diag.placeId].name : null,
      checklist_done: clCount,
      data: { done: done, checklist: clRaw, diagnosis: diag },
      updated_at: new Date().toISOString()
    };
  }

  /* 受講生の進捗をオンラインに送る（失敗・オフラインは黙って無視） */
  function push() {
    if (!enabled) return;
    if (!window.Store.getNickname()) return; // 名前未入力なら送らない
    try {
      var row = buildSnapshot();
      client.from("progress")
        .upsert(row, { onConflict: "user_id" })
        .then(function () {}, function () {});
    } catch (e) { /* 何もしない */ }
  }

  /* ---- 管理者用 ---- */
  function adminSignIn(email, password) {
    return client.auth.signInWithPassword({ email: email, password: password });
  }
  function adminSignOut() { return client.auth.signOut(); }
  function adminGetUser() { return client.auth.getUser(); }
  function fetchAll() {
    return client.from("progress").select("*").order("last_active", { ascending: false });
  }

  return {
    isEnabled: isEnabled,
    isConfigured: isConfigured,
    push: push,
    adminSignIn: adminSignIn,
    adminSignOut: adminSignOut,
    adminGetUser: adminGetUser,
    fetchAll: fetchAll
  };
})();
