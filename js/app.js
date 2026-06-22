/* ============================================================
   アプリの動き（画面の描画・ボタンの反応）を担当します。
   ============================================================ */

(function () {
  const D = window.APP_DATA;
  const S = window.Store;

  const viewEl = document.getElementById("view");
  const tabsEl = document.getElementById("tabs");

  /* --- 小さなユーティリティ --- */
  function el(html) {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }
  // 1日の中で固定の「日替わり」乱数（同じ日は同じ結果）
  function dailyIndex(len) {
    const key = S.todayKey().replace(/-/g, "");
    let n = 0;
    for (let i = 0; i < key.length; i++) n = (n * 31 + key.charCodeAt(i)) >>> 0;
    return n % len;
  }
  // 今日の候補タスクをcount個返す（同じ日は同じ組み合わせ）
  function dailyCandidates(count) {
    const base = dailyIndex(D.tasks.length);
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(D.tasks[(base + i) % D.tasks.length]);
    }
    return result;
  }
  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* ============================================================
     タブ定義
     ============================================================ */
  const TABS = [
    { id: "home",   label: "ホーム",   emoji: "🏠", render: renderHome },
    { id: "room",   label: "おへや",   emoji: "🏡", render: renderRoom },
    { id: "record", label: "きろく",   emoji: "📅", render: renderRecord },
    { id: "shindan",label: "しんだん", emoji: "🔍", render: renderShindan },
    { id: "setting",label: "せってい", emoji: "⚙️", render: renderSetting }
  ];
  let activeTab = "home";
  let selectedTaskId = null; // ホームで選んだタスクID（その日のセッション中保持）

  function renderTabs() {
    tabsEl.innerHTML = "";
    TABS.forEach(function (tab) {
      const b = el(
        `<button class="tab ${tab.id === activeTab ? "is-active" : ""}">
           <span class="tab__emoji">${tab.emoji}</span>
           <span class="tab__label">${tab.label}</span>
         </button>`
      );
      b.addEventListener("click", function () {
        activeTab = tab.id;
        render();
      });
      tabsEl.appendChild(b);
    });
  }

  function render() {
    renderTabs();
    const tab = TABS.find(function (t) { return t.id === activeTab; });
    viewEl.innerHTML = "";
    viewEl.appendChild(tab.render());
    viewEl.scrollTop = 0;
  }

  /* ============================================================
     画面1: ホーム（今日の5分タスク）
     ============================================================ */
  function renderHome() {
    const streak = S.currentStreak();
    const doneToday = S.isDoneToday();
    const wrap = el(`<div class="screen"></div>`);

    // なりたい自分バナー
    wrap.appendChild(whyBanner());

    // ヘッダー
    wrap.appendChild(el(
      `<div class="hero">
         <p class="hero__catch">${escapeHtml(D.appCatch)}</p>
         <p class="hero__streak">${
           streak > 0 ? "🔥 " + streak + "日 続いてるよ" : "今日から はじめよう"
         }</p>
       </div>`
    ));

    // メッセージカード
    wrap.appendChild(el(
      `<div class="card card--msg">
         <p class="msg">${escapeHtml(pickRandom(D.messages))}</p>
       </div>`
    ));

    if (doneToday) {
      // 完了済み
      wrap.appendChild(el(
        `<div class="card card--task">
           <p class="task__eyebrow">今日の5分片付け</p>
           <div class="task__action">
             <div class="done-state">
               <div class="done-state__mark">🌸</div>
               <p class="done-state__text">今日はもう できた! はなまる</p>
             </div>
           </div>
         </div>`
      ));
    } else if (selectedTaskId) {
      // タスク選択済み → できた! ボタンを表示
      const task = D.tasks.find(function (t) { return t.id === selectedTaskId; });
      const place = D.places[task.place];
      const taskCard = el(
        `<div class="card card--task">
           <p class="task__eyebrow">今日の5分片付け ${place ? place.emoji : ""}</p>
           <p class="task__text">${escapeHtml(task.text)}</p>
           <div class="task__action"></div>
         </div>`
      );
      const btn = el(`<button class="btn-done">できた!</button>`);
      btn.addEventListener("click", function () {
        S.markDone(task.id);
        pushSync();
        const up = checkRoomLevelUp();
        if (up) { celebrateRoom(up); activeTab = "room"; }
        else { celebrate(); }
        render();
      });
      taskCard.querySelector(".task__action").appendChild(btn);
      const changeBtn = el(`<button class="btn-ghost task__change">やっぱり別のを選ぶ</button>`);
      changeBtn.addEventListener("click", function () { selectedTaskId = null; render(); });
      taskCard.appendChild(changeBtn);
      wrap.appendChild(taskCard);
    } else {
      // タスク未選択 → 3択ピッカーを表示
      wrap.appendChild(el(`<p class="task__pick-title">今日はどれをやる？</p>`));
      dailyCandidates(3).forEach(function (task) {
        const place = D.places[task.place];
        const card = el(
          `<div class="card card--pick">
             <p class="pick__place">${place ? place.emoji + "　" + escapeHtml(place.name) : ""}</p>
             <p class="pick__text">${escapeHtml(task.text)}</p>
             <button class="btn-pick">これをやる！</button>
           </div>`
        );
        card.querySelector(".btn-pick").addEventListener("click", function () {
          selectedTaskId = task.id;
          render();
        });
        wrap.appendChild(card);
      });
    }

    // 累計
    wrap.appendChild(el(
      `<p class="home__total">これまでの「できた!」 合計 <b>${S.totalDone()}</b> 回</p>`
    ));

    return wrap;
  }

  /* 進捗をオンラインに送る（設定があれば。なければ何もしない） */
  function pushSync() {
    if (window.Sync && Sync.isEnabled) { try { Sync.push(); } catch (e) {} }
  }

  /* 初回：ニックネーム入力（入力するまで閉じられない） */
  function ensureNickname(done) {
    if (S.getNickname()) { done(); return; }
    var overlay = el(
      '<div class="celebrate is-show nick-overlay">' +
        '<div class="celebrate__box nick-box">' +
          '<div class="celebrate__emoji">🌸</div>' +
          '<p class="celebrate__cheer">ようこそ!</p>' +
          '<p class="muted">お名前（ニックネーム）を入れてね</p>' +
          '<input class="nick-input" type="text" maxlength="20" placeholder="例: あや" />' +
          '<button class="btn-primary nick-ok">はじめる</button>' +
        '</div>' +
      '</div>'
    );
    document.body.appendChild(overlay);
    var input = overlay.querySelector(".nick-input");
    var ok = overlay.querySelector(".nick-ok");
    function submit() {
      var v = (input.value || "").trim();
      if (!v) { input.focus(); return; }
      S.setNickname(v);
      pushSync();
      overlay.remove();
      done();
    }
    ok.addEventListener("click", submit);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") submit(); });
    setTimeout(function () { input.focus(); }, 100);
  }

  /* 「なりたい自分」を決める／変える モーダル */
  function openWhyEditor(onDone) {
    const current = S.getWhy();
    const overlay = el(
      '<div class="celebrate is-show nick-overlay">' +
        '<div class="celebrate__box nick-box why-box">' +
          '<div class="celebrate__emoji">🌟</div>' +
          '<p class="celebrate__cheer">なりたい自分</p>' +
          '<p class="muted">' + escapeHtml(D.whyQuestion) + '</p>' +
          '<div class="why-presets"></div>' +
          '<input class="nick-input why-input" type="text" maxlength="40" placeholder="自由に書いてもOK" />' +
          '<button class="btn-primary why-ok">これにする</button>' +
          (current ? '<button class="btn-ghost why-cancel">とじる</button>' : '') +
        '</div>' +
      '</div>'
    );
    document.body.appendChild(overlay);
    const input = overlay.querySelector(".why-input");
    if (current) input.value = current;
    const presetsEl = overlay.querySelector(".why-presets");
    D.whyPresets.forEach(function (p) {
      const chip = el('<button class="why-chip">' + escapeHtml(p) + '</button>');
      chip.addEventListener("click", function () { input.value = p; input.focus(); });
      presetsEl.appendChild(chip);
    });
    function submit() {
      const v = (input.value || "").trim();
      if (!v) { input.focus(); return; }
      S.setWhy(v); pushSync(); overlay.remove(); if (onDone) onDone();
    }
    overlay.querySelector(".why-ok").addEventListener("click", submit);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") submit(); });
    const cancel = overlay.querySelector(".why-cancel");
    if (cancel) cancel.addEventListener("click", function () { overlay.remove(); if (onDone) onDone(); });
  }

  /* なりたい自分のバナー（ホーム・おへや 共通） */
  function whyBanner() {
    const why = S.getWhy();
    const b = why
      ? el('<div class="why-banner">🌟 なりたい私：<b>' + escapeHtml(why) + '</b></div>')
      : el('<div class="why-banner why-banner--empty">🌟 「なりたい自分」を決めよう →</div>');
    b.addEventListener("click", function () { openWhyEditor(render); });
    return b;
  }

  /* 完了時の演出 */
  function celebrate() {
    const overlay = el(
      `<div class="celebrate">
         <div class="celebrate__box">
           <div class="celebrate__emoji">🎉</div>
           <p class="celebrate__cheer">${escapeHtml(pickRandom(D.doneCheers))}</p>
           <p class="celebrate__msg">${escapeHtml(pickRandom(D.messages))}</p>
         </div>
       </div>`
    );
    document.body.appendChild(overlay);
    setTimeout(function () { overlay.classList.add("is-show"); }, 10);
    overlay.addEventListener("click", function () { overlay.remove(); });
    setTimeout(function () {
      if (overlay.parentNode) overlay.remove();
    }, 2600);
  }

  /* ============================================================
     画面: おへや（お部屋が育つ達成ビジュアル）
     ============================================================ */
  const ROOM_SVG =
    '<svg class="room-svg" viewBox="0 0 300 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="あなたのお部屋">' +
      '<rect x="0" y="0" width="300" height="150" fill="#FBF6EF"/>' +
      '<rect x="0" y="150" width="300" height="70" fill="#EADFD2"/>' +
      // 窓
      '<rect x="34" y="28" width="86" height="68" rx="6" fill="#DCEAF0"/>' +
      '<rect class="room-sun" x="34" y="28" width="86" height="68" rx="6" fill="#FFF1B8" opacity="0"/>' +
      '<line x1="77" y1="28" x2="77" y2="96" stroke="#C9BCAE" stroke-width="3"/>' +
      '<line x1="34" y1="62" x2="120" y2="62" stroke="#C9BCAE" stroke-width="3"/>' +
      '<rect x="30" y="24" width="94" height="76" rx="8" fill="none" stroke="#B9A892" stroke-width="4"/>' +
      // 陽の光（Lv4〜）
      '<polygon data-min="4" points="120,42 226,150 150,150" fill="#FFE9A8" opacity="0.35"/>' +
      // 壁の絵（Lv3〜）
      '<g data-min="3">' +
        '<rect x="200" y="40" width="50" height="40" rx="3" fill="#fff" stroke="#C9A98E" stroke-width="3"/>' +
        '<path d="M205 73 l12 -17 8 9 7 -6 11 14 z" fill="#9FB07F"/>' +
        '<circle cx="240" cy="50" r="4" fill="#E7B3AC"/>' +
      '</g>' +
      // 棚＋本（Lv5〜）
      '<g data-min="5">' +
        '<rect x="196" y="92" width="62" height="8" fill="#C9A98E"/>' +
        '<rect x="202" y="78" width="6" height="14" fill="#E7B3AC"/>' +
        '<rect x="210" y="74" width="6" height="18" fill="#8E9678"/>' +
        '<rect x="218" y="80" width="6" height="12" fill="#B47B7B"/>' +
        '<rect x="226" y="76" width="6" height="16" fill="#9FB6C9"/>' +
      '</g>' +
      // ラグ（Lv2〜）
      '<ellipse data-min="2" cx="150" cy="186" rx="96" ry="22" fill="#F3D9D4"/>' +
      // ソファ（Lv2〜）
      '<g data-min="2">' +
        '<rect x="16" y="120" width="62" height="46" rx="9" fill="#C98F8B"/>' +
        '<rect x="12" y="112" width="18" height="42" rx="8" fill="#B97E7A"/>' +
        '<rect x="64" y="112" width="18" height="42" rx="8" fill="#B97E7A"/>' +
        '<rect x="30" y="106" width="34" height="18" rx="6" fill="#F0C9C4"/>' +
      '</g>' +
      // テーブル（Lv1〜）＋ お花（Lv4〜）
      '<g data-min="1">' +
        '<rect x="118" y="150" width="72" height="8" rx="3" fill="#C9A98E"/>' +
        '<rect x="122" y="158" width="6" height="22" fill="#B9956F"/>' +
        '<rect x="180" y="158" width="6" height="22" fill="#B9956F"/>' +
        '<g data-min="4">' +
          '<rect x="144" y="136" width="16" height="16" rx="3" fill="#9FB6C9"/>' +
          '<line x1="152" y1="138" x2="152" y2="128" stroke="#8E9678" stroke-width="2"/>' +
          '<circle cx="147" cy="130" r="5" fill="#E7B3AC"/>' +
          '<circle cx="157" cy="129" r="5" fill="#F0A8B0"/>' +
          '<circle cx="152" cy="124" r="5" fill="#EAC36B"/>' +
        '</g>' +
      '</g>' +
      // 観葉植物（Lv3〜）
      '<g data-min="3">' +
        '<rect x="252" y="150" width="26" height="24" rx="4" fill="#C98F6B"/>' +
        '<path d="M265 150 q-14 -18 -2 -34 q12 14 2 34" fill="#8E9678"/>' +
        '<path d="M265 150 q14 -16 4 -30 q-12 12 -4 30" fill="#9FB07F"/>' +
      '</g>' +
      // ねこ（Lv6）
      '<g data-min="6">' +
        '<ellipse cx="150" cy="180" rx="20" ry="12" fill="#8C8077"/>' +
        '<circle cx="168" cy="172" r="9" fill="#8C8077"/>' +
        '<polygon points="162,166 165,158 170,165" fill="#8C8077"/>' +
        '<polygon points="170,165 175,158 178,166" fill="#8C8077"/>' +
        '<path d="M132 178 q-12 -2 -14 -12" stroke="#8C8077" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      '</g>' +
      // キラキラ（Lv5〜）
      '<g data-min="5" fill="#EAC36B">' +
        '<path d="M62 40 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z"/>' +
        '<path d="M182 100 l1.6 4.5 4.5 1.6 -4.5 1.6 -1.6 4.5 -1.6 -4.5 -4.5 -1.6 4.5 -1.6z"/>' +
      '</g>' +
      // 散らかり（Lv1だけ表示）
      '<g data-max="1">' +
        '<rect x="118" y="168" width="26" height="18" rx="2" fill="#C9B59B" transform="rotate(-8 131 177)"/>' +
        '<rect x="158" y="172" width="22" height="14" rx="2" fill="#D7C3A6" transform="rotate(7 169 179)"/>' +
        '<path d="M92 190 q10 -9 23 -2 q-4 8 -15 8 q-8 0 -8 -6z" fill="#B9C2A0"/>' +
        '<circle cx="212" cy="188" r="7" fill="#D8B7B2"/>' +
      '</g>' +
    '</svg>';

  function stageOf(total) {
    const stages = D.roomStages;
    let cur = stages[0];
    for (let i = 0; i < stages.length; i++) { if (total >= stages[i].min) cur = stages[i]; }
    return cur;
  }
  function nextStage(total) {
    const stages = D.roomStages;
    for (let i = 0; i < stages.length; i++) { if (stages[i].min > total) return stages[i]; }
    return null;
  }
  function applyRoomLevel(svg, level) {
    if (!svg) return;
    svg.querySelectorAll("[data-min]").forEach(function (e) {
      e.style.display = (level >= parseInt(e.getAttribute("data-min"), 10)) ? "" : "none";
    });
    svg.querySelectorAll("[data-max]").forEach(function (e) {
      e.style.display = (level <= parseInt(e.getAttribute("data-max"), 10)) ? "" : "none";
    });
    const sun = svg.querySelector(".room-sun");
    if (sun) sun.setAttribute("opacity", String(Math.min(0.6, (level - 1) / 5 * 0.6)));
  }

  function renderRoom() {
    const total = S.totalDone();
    const stage = stageOf(total);
    const next = nextStage(total);
    const wrap = el(`<div class="screen"></div>`);

    wrap.appendChild(whyBanner());

    const card = el(`<div class="card card--room"></div>`);
    card.appendChild(el(`<p class="room__stage">Lv.${stage.level}　${escapeHtml(stage.name)}</p>`));
    const scene = el(`<div class="room-scene">${ROOM_SVG}</div>`);
    card.appendChild(scene);
    card.appendChild(el(`<p class="room__word">${escapeHtml(stage.word)}</p>`));
    wrap.appendChild(card);
    applyRoomLevel(scene.querySelector(".room-svg"), stage.level);

    if (next) {
      const span = next.min - stage.min;
      const doneInStage = total - stage.min;
      const remain = next.min - total;
      const pct = Math.max(4, Math.min(100, Math.round(doneInStage / span * 100)));
      wrap.appendChild(el(
        `<div class="card">
           <p class="room__nexttitle">つぎの変化まで</p>
           <div class="bar"><div class="bar__fill" style="width:${pct}%"></div></div>
           <p class="room__next">あと <b>${remain}</b> 回の「できた!」で「${escapeHtml(next.name)}」に育つよ🌱</p>
         </div>`
      ));
    } else {
      wrap.appendChild(el(
        `<div class="card center"><p class="room__word">最高ランク達成! あなたの理想の暮らしが完成しました👑</p></div>`
      ));
    }

    // 変化のあゆみ（到達したステージを時系列で）
    const reached = D.roomStages.filter(function (s) { return total >= s.min; });
    const ayumi = el(`<div class="card"><p class="card__title">変化のあゆみ ✨</p></div>`);
    reached.forEach(function (s) {
      const isCurrent = s.level === stage.level;
      ayumi.appendChild(el(
        `<div class="ayumi ${isCurrent ? "is-current" : ""}">
           <span class="ayumi__lv">Lv.${s.level}</span>
           <span class="ayumi__text"><b>${escapeHtml(s.name)}</b><br>${escapeHtml(s.change)}</span>
         </div>`
      ));
    });
    wrap.appendChild(ayumi);

    wrap.appendChild(el(
      `<p class="home__total">これまでの「できた!」 合計 <b>${total}</b> 回</p>`
    ));
    return wrap;
  }

  /* レベルアップ判定（できた直後に呼ぶ）。上がっていれば新ステージを返す */
  function checkRoomLevelUp() {
    const lvl = stageOf(S.totalDone()).level;
    const stored = parseInt(localStorage.getItem("tk_room_lv") || "0", 10);
    localStorage.setItem("tk_room_lv", String(lvl));
    if (stored && lvl > stored) return stageOf(S.totalDone());
    return null;
  }

  function celebrateRoom(stage) {
    const why = S.getWhy();
    const whyLine = why
      ? `<p class="celebrate__why">なりたい私『${escapeHtml(why)}』に近づいています🌱</p>`
      : "";
    const overlay = el(
      `<div class="celebrate">
         <div class="celebrate__box">
           <div class="celebrate__emoji">🏡</div>
           <p class="celebrate__cheer">お部屋が育った!</p>
           <p class="celebrate__stage">『${escapeHtml(stage.name)}』</p>
           <p class="celebrate__msg">${escapeHtml(stage.change)}</p>
           ${whyLine}
         </div>
       </div>`
    );
    document.body.appendChild(overlay);
    setTimeout(function () { overlay.classList.add("is-show"); }, 10);
    overlay.addEventListener("click", function () { overlay.remove(); });
    setTimeout(function () { if (overlay.parentNode) overlay.remove(); }, 3200);
  }

  /* ============================================================
     画面2: きろく（見える化：連続日数・累計・カレンダー・バッジ）
     ============================================================ */
  let calCursor = new Date(); // 表示中の月

  function renderRecord() {
    const streak = S.currentStreak();
    const total = S.totalDone();
    const wrap = el(`<div class="screen"></div>`);

    wrap.appendChild(el(
      `<div class="stats">
         <div class="stat">
           <div class="stat__num">${streak}</div>
           <div class="stat__label">連続日数</div>
         </div>
         <div class="stat">
           <div class="stat__num">${total}</div>
           <div class="stat__label">できた合計</div>
         </div>
       </div>`
    ));

    // バッジ
    const earned = D.badges.filter(function (b) { return streak >= b.days; });
    const next = D.badges.find(function (b) { return streak < b.days; });
    const badgeCard = el(`<div class="card"><p class="card__title">ごほうびバッジ</p><div class="badges"></div></div>`);
    const badgesEl = badgeCard.querySelector(".badges");
    if (earned.length === 0) {
      badgesEl.appendChild(el(`<p class="muted">続けると、バッジが増えていくよ🌱</p>`));
    } else {
      earned.forEach(function (b) {
        badgesEl.appendChild(el(
          `<div class="badge"><span class="badge__emoji">${b.emoji}</span><span class="badge__label">${escapeHtml(b.label)}</span></div>`
        ));
      });
    }
    if (next) {
      badgeCard.appendChild(el(
        `<p class="muted next-badge">つぎは「${escapeHtml(next.label)}」まで あと ${next.days - streak}日 ${next.emoji}</p>`
      ));
    }
    wrap.appendChild(badgeCard);

    // カレンダー
    wrap.appendChild(renderCalendar());

    return wrap;
  }

  function renderCalendar() {
    const done = S.getDone();
    const year = calCursor.getFullYear();
    const month = calCursor.getMonth();
    const first = new Date(year, month, 1);
    const startDow = first.getDay(); // 0=日
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayK = S.todayKey();

    const card = el(`<div class="card cal"></div>`);
    const head = el(
      `<div class="cal__head">
         <button class="cal__nav" data-dir="-1">‹</button>
         <span class="cal__title">${year}年 ${month + 1}月</span>
         <button class="cal__nav" data-dir="1">›</button>
       </div>`
    );
    head.querySelectorAll(".cal__nav").forEach(function (btn) {
      btn.addEventListener("click", function () {
        calCursor = new Date(year, month + parseInt(btn.dataset.dir, 10), 1);
        render();
      });
    });
    card.appendChild(head);

    const grid = el(`<div class="cal__grid"></div>`);
    ["日", "月", "火", "水", "木", "金", "土"].forEach(function (w) {
      grid.appendChild(el(`<div class="cal__dow">${w}</div>`));
    });
    for (let i = 0; i < startDow; i++) {
      grid.appendChild(el(`<div class="cal__cell cal__cell--empty"></div>`));
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const k = S.dateKey(new Date(year, month, d));
      const isDone = !!done[k];
      const isToday = k === todayK;
      grid.appendChild(el(
        `<div class="cal__cell ${isToday ? "is-today" : ""}">
           <span class="cal__day">${d}</span>
           <span class="cal__stamp">${isDone ? "🌸" : ""}</span>
         </div>`
      ));
    }
    card.appendChild(grid);
    return card;
  }

  /* ============================================================
     画面3: しんだん（場所診断 → チェックリスト）
     ============================================================ */
  // 状態: null=未開始, 数値=回答中の質問番号, 'result'=結果表示
  let shindanStep = null;
  let shindanAnswers = [];

  function renderShindan() {
    const wrap = el(`<div class="screen"></div>`);
    const saved = S.getDiagnosis();

    if (shindanStep === null) {
      // スタート画面（保存済みがあれば結果も見られる）
      wrap.appendChild(el(
        `<div class="card card--intro">
           <p class="card__title">どこから片付ける? 場所しんだん</p>
           <p class="muted">かんたんな質問に答えると、まず取りかかると良い場所を提案します。</p>
         </div>`
      ));
      const startBtn = el(`<button class="btn-primary">しんだんを はじめる</button>`);
      startBtn.addEventListener("click", function () {
        shindanStep = 0;
        shindanAnswers = [];
        render();
      });
      wrap.appendChild(startBtn);

      if (saved && D.places[saved.placeId]) {
        const p = D.places[saved.placeId];
        wrap.appendChild(el(`<p class="muted center" style="margin-top:18px">前回の結果: ${p.emoji} ${escapeHtml(p.name)}</p>`));
        wrap.appendChild(renderChecklist(saved.placeId));
      }
      return wrap;
    }

    if (shindanStep === "result") {
      const placeId = calcDiagnosisResult(shindanAnswers);
      S.setDiagnosis(placeId, shindanAnswers);
      pushSync();
      const p = D.places[placeId];
      wrap.appendChild(el(
        `<div class="card card--result">
           <p class="muted center">あなたへのおすすめは…</p>
           <p class="result__place">${p.emoji} ${escapeHtml(p.name)}</p>
           <p class="muted center">ここから、5分ずつ整えていきましょう🌸</p>
         </div>`
      ));
      const again = el(`<button class="btn-ghost">もう一度しんだんする</button>`);
      again.addEventListener("click", function () { shindanStep = null; render(); });
      wrap.appendChild(again);
      wrap.appendChild(renderChecklist(placeId));
      return wrap;
    }

    // 質問中
    const qIndex = shindanStep;
    const item = D.diagnosis[qIndex];
    wrap.appendChild(el(`<p class="q__progress">質問 ${qIndex + 1} / ${D.diagnosis.length}</p>`));
    const qcard = el(`<div class="card card--q"><p class="q__text">${escapeHtml(item.q)}</p><div class="q__opts"></div></div>`);
    const opts = qcard.querySelector(".q__opts");
    item.options.forEach(function (op) {
      const b = el(`<button class="q__opt">${escapeHtml(op.label)}</button>`);
      b.addEventListener("click", function () {
        shindanAnswers.push(op.points);
        shindanStep = qIndex + 1 >= D.diagnosis.length ? "result" : qIndex + 1;
        render();
      });
      opts.appendChild(b);
    });
    wrap.appendChild(qcard);
    return wrap;
  }

  function calcDiagnosisResult(answers) {
    const score = {};
    answers.forEach(function (pts) {
      Object.keys(pts).forEach(function (place) {
        score[place] = (score[place] || 0) + pts[place];
      });
    });
    let best = null, bestVal = -1;
    Object.keys(D.places).forEach(function (place) {
      const v = score[place] || 0;
      if (v > bestVal) { bestVal = v; best = place; }
    });
    return best || "living";
  }

  function renderChecklist(placeId) {
    const list = D.checklists[placeId] || [];
    const checked = S.getChecklist(placeId);
    const p = D.places[placeId];
    const card = el(`<div class="card check"></div>`);
    card.appendChild(el(`<p class="card__title">${p.emoji} ${escapeHtml(p.name)} チェックリスト</p>`));

    list.forEach(function (it) {
      const isChecked = checked.indexOf(it.id) >= 0;
      const row = el(
        `<label class="check__row ${isChecked ? "is-checked" : ""}">
           <input type="checkbox" ${isChecked ? "checked" : ""}>
           <span class="check__box">✓</span>
           <span class="check__text">${escapeHtml(it.text)}</span>
         </label>`
      );
      const input = row.querySelector("input");
      input.addEventListener("change", function () {
        S.toggleChecklistItem(placeId, it.id);
        row.classList.toggle("is-checked", input.checked);
        updateCheckProgress(card, placeId, list.length);
        pushSync();
      });
      card.appendChild(row);
    });

    const prog = el(`<p class="check__progress"></p>`);
    card.appendChild(prog);
    updateCheckProgress(card, placeId, list.length);
    return card;
  }

  function updateCheckProgress(card, placeId, total) {
    const n = S.getChecklist(placeId).length;
    const prog = card.querySelector(".check__progress");
    if (!prog) return;
    if (n >= total && total > 0) {
      prog.innerHTML = "ぜんぶ できた! すばらしい🎉";
      prog.classList.add("is-complete");
    } else {
      prog.textContent = `${n} / ${total} 完了`;
      prog.classList.remove("is-complete");
    }
  }

  /* ============================================================
     画面4: せってい
     ============================================================ */
  function renderSetting() {
    const wrap = el(`<div class="screen"></div>`);

    // お名前（ニックネーム）
    const nick = S.getNickname() || "（未設定）";
    const nickCard = el(
      `<div class="card">
         <p class="card__title">お名前（ニックネーム）</p>
         <p class="muted">いまのお名前: <b>${escapeHtml(nick)}</b></p>
       </div>`
    );
    const changeBtn = el(`<button class="btn-ghost">名前を変える</button>`);
    changeBtn.addEventListener("click", function () {
      const v = prompt("新しいお名前（ニックネーム）", S.getNickname() || "");
      if (v && v.trim()) { S.setNickname(v.trim()); pushSync(); render(); }
    });
    nickCard.appendChild(changeBtn);
    wrap.appendChild(nickCard);

    // なりたい自分
    const why = S.getWhy() || "（未設定）";
    const whyCard = el(
      `<div class="card">
         <p class="card__title">なりたい自分</p>
         <p class="muted">いまの目標: <b>${escapeHtml(why)}</b></p>
       </div>`
    );
    const whyBtn = el(`<button class="btn-ghost">なりたい自分を決める／変える</button>`);
    whyBtn.addEventListener("click", function () { openWhyEditor(render); });
    whyCard.appendChild(whyBtn);
    wrap.appendChild(whyCard);

    wrap.appendChild(el(
      `<div class="card">
         <p class="card__title">このアプリについて</p>
         <p class="muted">${escapeHtml(D.appName)}</p>
         <p class="muted">1日5分の片付けで、「できた私」を増やすアプリです。</p>
       </div>`
    ));

    wrap.appendChild(el(
      `<div class="card">
         <p class="card__title">ホーム画面に追加</p>
         <p class="muted">ブラウザのメニューから「ホーム画面に追加」を選ぶと、アプリのように使えます。</p>
       </div>`
    ));

    const resetCard = el(
      `<div class="card">
         <p class="card__title">記録をリセット</p>
         <p class="muted">これまでの「できた!」やチェックを、すべて消します。元には戻せません。</p>
       </div>`
    );
    const resetBtn = el(`<button class="btn-danger">記録をすべて消す</button>`);
    resetBtn.addEventListener("click", function () {
      if (confirm("本当に、すべての記録を消しますか?")) {
        S.resetAll();
        shindanStep = null;
        activeTab = "home";
        render();
        alert("記録をリセットしました。");
      }
    });
    resetCard.appendChild(resetBtn);
    wrap.appendChild(resetCard);

    // 管理者（先生）用リンク（ログインが必要なので表示しても安全）
    wrap.appendChild(el(
      `<p class="admin-link"><a href="./admin.html">（管理者の方）受講生の進捗を見る →</a></p>`
    ));

    return wrap;
  }

  /* ============================================================
     起動
     ============================================================ */
  S.touchMeta();
  // お部屋レベルの初期値を記録（既存の進捗で誤ってレベルアップ演出が出ないように）
  if (localStorage.getItem("tk_room_lv") === null) {
    localStorage.setItem("tk_room_lv", String(stageOf(S.totalDone()).level));
  }
  ensureNickname(function () {
    pushSync();   // 起動時にも最新状態を送る（最終ログイン日の更新）
    render();
  });

  // Service Worker 登録（PWA / オフライン対応）
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("./sw.js").catch(function () { /* 失敗しても通常動作 */ });
    });
  }
})();
