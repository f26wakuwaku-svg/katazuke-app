/* ============================================================
   データの保存・読み出しを担当します（端末の中に保存します）。
   サーバーは使わないので、この端末・このブラウザにだけ記録が残ります。
   ============================================================ */

window.Store = (function () {
  const KEYS = {
    done: "tk_done",           // { "2026-06-09": {taskId, ts}, ... }
    checklist: "tk_checklist", // { placeId: [checkedIds] }
    diagnosis: "tk_diagnosis", // { placeId, answers, ts }
    meta: "tk_meta"            // { firstSeen, lastSeen }
  };

  /* --- 内部ヘルパー --- */
  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      // localStorageが使えない環境では何もしない
    }
  }

  /* --- 日付ユーティリティ（YYYY-MM-DD のローカル日付） --- */
  function dateKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  function todayKey() {
    return dateKey(new Date());
  }

  /* --- 完了記録 --- */
  function getDone() {
    return read(KEYS.done, {});
  }
  function isDoneToday() {
    return !!getDone()[todayKey()];
  }
  function markDone(taskId) {
    const done = getDone();
    done[todayKey()] = { taskId: taskId, ts: Date.now() };
    write(KEYS.done, done);
  }
  function totalDone() {
    return Object.keys(getDone()).length;
  }

  /* --- 連続日数（今日 or 昨日を起点に、さかのぼって数える） --- */
  function currentStreak() {
    const done = getDone();
    if (Object.keys(done).length === 0) return 0;

    let count = 0;
    const cursor = new Date();

    // 今日がまだなら昨日から数える（連続を途切れさせない）
    if (!done[dateKey(cursor)]) {
      cursor.setDate(cursor.getDate() - 1);
    }
    while (done[dateKey(cursor)]) {
      count++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }

  /* --- チェックリスト --- */
  function getChecklist(placeId) {
    const all = read(KEYS.checklist, {});
    return all[placeId] || [];
  }
  function toggleChecklistItem(placeId, itemId) {
    const all = read(KEYS.checklist, {});
    const list = all[placeId] || [];
    const idx = list.indexOf(itemId);
    if (idx >= 0) list.splice(idx, 1);
    else list.push(itemId);
    all[placeId] = list;
    write(KEYS.checklist, all);
    return list;
  }

  /* --- 診断結果 --- */
  function getDiagnosis() {
    return read(KEYS.diagnosis, null);
  }
  function setDiagnosis(placeId, answers) {
    write(KEYS.diagnosis, { placeId: placeId, answers: answers, ts: Date.now() });
  }

  /* --- メタ情報（初回・最終アクセス） --- */
  function touchMeta() {
    const meta = read(KEYS.meta, {});
    const t = todayKey();
    if (!meta.firstSeen) meta.firstSeen = t;
    meta.lastSeen = t;
    write(KEYS.meta, meta);
    return meta;
  }

  /* --- 受講生の識別（ユーザーID・ニックネーム） --- */
  function getUserId() {
    var id = localStorage.getItem("tk_uid");
    if (!id) {
      if (window.crypto && crypto.randomUUID) {
        id = crypto.randomUUID();
      } else {
        id = "u" + Date.now() + "-" + Math.random().toString(36).slice(2);
      }
      try { localStorage.setItem("tk_uid", id); } catch (e) {}
    }
    return id;
  }
  function getNickname() { return localStorage.getItem("tk_nick") || ""; }
  function setNickname(n) { try { localStorage.setItem("tk_nick", n); } catch (e) {} }

  /* --- なりたい自分（why） --- */
  function getWhy() { return localStorage.getItem("tk_why") || ""; }
  function setWhy(w) { try { localStorage.setItem("tk_why", w); } catch (e) {} }

  /* --- すべて初期化（記録のみ。ID・ニックネームは残す） --- */
  function resetAll() {
    Object.values(KEYS).forEach(function (k) {
      localStorage.removeItem(k);
    });
  }

  return {
    dateKey: dateKey,
    todayKey: todayKey,
    getDone: getDone,
    isDoneToday: isDoneToday,
    markDone: markDone,
    totalDone: totalDone,
    currentStreak: currentStreak,
    getChecklist: getChecklist,
    toggleChecklistItem: toggleChecklistItem,
    getDiagnosis: getDiagnosis,
    setDiagnosis: setDiagnosis,
    touchMeta: touchMeta,
    getUserId: getUserId,
    getNickname: getNickname,
    setNickname: setNickname,
    getWhy: getWhy,
    setWhy: setWhy,
    resetAll: resetAll
  };
})();
