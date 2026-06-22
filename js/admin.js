/* ============================================================
   管理者ページの動き：ログイン → 全受講生の進捗を一覧表示。
   ============================================================ */
(function () {
  var view = document.getElementById("admin-view");

  function el(html) {
    var t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function todayKey() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  /* 累計できた数 → おへやレベル（data.js の roomStages を使用） */
  function roomStage(total) {
    var stages = (window.APP_DATA && window.APP_DATA.roomStages) || [];
    var cur = stages[0] || { level: 1, name: "-" };
    for (var i = 0; i < stages.length; i++) { if ((total || 0) >= stages[i].min) cur = stages[i]; }
    return cur;
  }

  /* 設定が未完了のときの案内 */
  function renderNotConfigured() {
    view.innerHTML = "";
    view.appendChild(el(
      '<div class="card">' +
        '<p class="card__title">まだセットアップが必要です</p>' +
        '<p class="muted">オンライン保存（Supabase）の設定がされていません。' +
        'README.md の「管理者機能のセットアップ」に沿って、<b>js/config.js</b> に ' +
        'Supabase の URL と anonキーを入れてください。</p>' +
      '</div>'
    ));
  }

  /* ログイン画面 */
  function renderLogin(errorMsg) {
    view.innerHTML = "";
    var card = el(
      '<div class="card card--login">' +
        '<p class="card__title">管理者ログイン</p>' +
        '<p class="muted">先生用のメールアドレスとパスワードでログインしてください。</p>' +
        '<input id="email" class="nick-input" type="email" placeholder="メールアドレス" autocomplete="username" />' +
        '<input id="pw" class="nick-input" type="password" placeholder="パスワード" autocomplete="current-password" />' +
        '<button id="loginBtn" class="btn-primary" style="margin-top:14px">ログイン</button>' +
        '<p id="loginErr" class="login-err"></p>' +
      '</div>'
    );
    view.appendChild(card);
    if (errorMsg) card.querySelector("#loginErr").textContent = errorMsg;

    var emailEl = card.querySelector("#email");
    var pwEl = card.querySelector("#pw");
    var btn = card.querySelector("#loginBtn");

    function doLogin() {
      var email = emailEl.value.trim();
      var pw = pwEl.value;
      if (!email || !pw) { card.querySelector("#loginErr").textContent = "メールアドレスとパスワードを入力してください。"; return; }
      btn.disabled = true; btn.textContent = "ログイン中…";
      Sync.adminSignIn(email, pw).then(function (res) {
        btn.disabled = false; btn.textContent = "ログイン";
        if (res.error) { card.querySelector("#loginErr").textContent = "ログインできませんでした。メール・パスワードをご確認ください。"; return; }
        loadDashboard();
      });
    }
    btn.addEventListener("click", doLogin);
    pwEl.addEventListener("keydown", function (e) { if (e.key === "Enter") doLogin(); });
  }

  /* ダッシュボード（一覧） */
  function renderDashboard(rows) {
    view.innerHTML = "";
    var today = todayKey();
    var count = rows.length;
    var doneToday = rows.filter(function (r) { return r.last_active === today; }).length;
    var totalSum = rows.reduce(function (a, r) { return a + (r.total_done || 0); }, 0);
    var avg = count ? Math.round((totalSum / count) * 10) / 10 : 0;

    // 上部バー（更新・ログアウト）
    var bar = el('<div class="admin-bar"></div>');
    var refresh = el('<button class="btn-ghost admin-btn">↻ 更新</button>');
    var logout = el('<button class="btn-ghost admin-btn">ログアウト</button>');
    refresh.addEventListener("click", loadDashboard);
    logout.addEventListener("click", function () { Sync.adminSignOut().then(function () { renderLogin(); }); });
    bar.appendChild(refresh); bar.appendChild(logout);
    view.appendChild(bar);

    // サマリー
    view.appendChild(el(
      '<div class="stats">' +
        '<div class="stat"><div class="stat__num">' + count + '</div><div class="stat__label">受講生</div></div>' +
        '<div class="stat"><div class="stat__num">' + doneToday + '</div><div class="stat__label">今日できた</div></div>' +
        '<div class="stat"><div class="stat__num">' + avg + '</div><div class="stat__label">平均できた数</div></div>' +
      '</div>'
    ));

    if (count === 0) {
      view.appendChild(el('<div class="card"><p class="muted">まだ受講生の記録がありません。受講生がアプリを使い始めると、ここに表示されます。</p></div>'));
      return;
    }

    // 一覧テーブル
    var card = el('<div class="card admin-table-card"></div>');
    var rowsHtml = rows.map(function (r) {
      var last = r.last_active || "-";
      var isToday = r.last_active === today;
      var st = roomStage(r.total_done);
      return '<tr>' +
        '<td class="t-nick">' + esc(r.nickname) + '</td>' +
        '<td class="t-why">' + esc(r.why || "-") + '</td>' +
        '<td class="t-room">Lv.' + st.level + ' ' + esc(st.name) + '</td>' +
        '<td class="t-num">' + (r.streak || 0) + '</td>' +
        '<td class="t-num">' + (r.total_done || 0) + '</td>' +
        '<td class="t-num">' + (r.checklist_done || 0) + '</td>' +
        '<td class="t-place">' + esc(r.diagnosis_place || "-") + '</td>' +
        '<td class="t-date ' + (isToday ? "is-today" : "") + '">' + esc(last) + '</td>' +
      '</tr>';
    }).join("");
    card.appendChild(el(
      '<div class="admin-table-wrap"><table class="admin-table">' +
        '<thead><tr>' +
          '<th>ニックネーム</th><th>なりたい自分</th><th>おへや</th><th>連続</th><th>合計</th><th>チェック</th><th>診断</th><th>最終ログイン</th>' +
        '</tr></thead>' +
        '<tbody>' + rowsHtml + '</tbody>' +
      '</table></div>'
    ));
    view.appendChild(card);
    view.appendChild(el('<p class="muted center" style="margin-top:10px">「連続」=連続日数 / 「合計」=できた合計 / 「チェック」=チェックリスト完了数</p>'));
  }

  function loadDashboard() {
    view.innerHTML = '<p class="muted center" style="margin-top:30px">読み込み中…</p>';
    Sync.fetchAll().then(function (res) {
      if (res.error) {
        renderLogin("データを取得できませんでした。もう一度ログインしてください。");
        return;
      }
      renderDashboard(res.data || []);
    });
  }

  /* ---- 起動 ---- */
  if (!window.Sync || !Sync.isConfigured() || !Sync.isEnabled()) {
    renderNotConfigured();
    return;
  }
  // すでにログイン済みかチェック
  Sync.adminGetUser().then(function (res) {
    if (res && res.data && res.data.user) { loadDashboard(); }
    else { renderLogin(); }
  });
})();
