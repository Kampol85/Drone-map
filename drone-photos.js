/* drone-photos.js — ภาพนิ่งจากวิดีโอโดรน (ซ้อนแนวท่อ + KP + ขอบเขตแปลง)
 * ข้อมูลอยู่ใน photos/photos.json : [{src, clip, day, t, kp, lat, lng, yaw, alt}]
 * หมุดลูกศรสีส้ม = ตำแหน่งโดรนและทิศที่กล้องหัน  กดหมุดเพื่อเปิดภาพ
 */
(function () {
  var DATA_URL = "photos/photos.json";
  var MIN_ZOOM = 13;
  var COLOR = "#f97316";

  function ready() {
    try { return typeof google !== "undefined" && google.maps && typeof map !== "undefined" && map && map.getZoom; }
    catch (e) { return false; }
  }
  function kpNum(s) { var p = String(s).split("+"); return (+p[0]) * 1000 + (+p[1] || 0); }
  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    for (var k in attrs || {}) { if (k === "style") e.style.cssText = attrs[k]; else e.setAttribute(k, attrs[k]); }
    if (html != null) e.innerHTML = html;
    return e;
  }

  function css() {
    var s = el("style");
    s.textContent =
      ".dp-btn{font:600 12px var(--font,system-ui);background:rgba(15,23,32,.92);color:#fff;border:1px solid rgba(255,255,255,.18);border-radius:8px;padding:7px 10px;margin:10px;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.3)}" +
      ".dp-btn[aria-pressed=false]{opacity:.55}" +
      ".dp-view{position:fixed;inset:0;z-index:1000;background:rgba(5,8,12,.94);display:none;flex-direction:column;font-family:var(--font,system-ui);color:#fff}" +
      ".dp-view.on{display:flex}" +
      ".dp-bar{display:flex;align-items:center;gap:10px;padding:10px 14px;flex-wrap:wrap}" +
      ".dp-cap{flex:1;min-width:180px;font:600 14px var(--font,system-ui)}" +
      ".dp-cap small{display:block;font-weight:400;opacity:.7;font-size:12px;margin-top:2px}" +
      ".dp-b{background:#1f2937;color:#fff;border:1px solid #374151;border-radius:8px;padding:8px 12px;font:600 14px var(--font,system-ui);cursor:pointer;text-decoration:none}" +
      ".dp-b:hover{background:#374151}" +
      ".dp-img{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:0 8px 8px;position:relative}" +
      ".dp-img img{max-width:100%;max-height:100%;object-fit:contain;border-radius:6px;box-shadow:0 4px 24px rgba(0,0,0,.6)}" +
      ".dp-nav{position:absolute;top:50%;transform:translateY(-50%);background:rgba(0,0,0,.45);border:0;color:#fff;font-size:30px;width:48px;height:72px;border-radius:8px;cursor:pointer}" +
      ".dp-nav.l{left:10px}.dp-nav.r{right:10px}" +
      ".dp-load{position:absolute;font:13px var(--font,system-ui);opacity:.7}";
    document.head.appendChild(s);
  }

  function start() {
    var gmap = map, items = [], markers = [], visible = true, cur = -1;
    css();

    // ---------- viewer ----------
    var view = el("div", { "class": "dp-view", role: "dialog", "aria-modal": "true", "aria-label": "Drone photo" });
    var cap = el("div", { "class": "dp-cap" });
    var bPrev = el("button", { "class": "dp-b", title: "Previous (←)" }, "◀");
    var bNext = el("button", { "class": "dp-b", title: "Next (→)" }, "▶");
    var bMap = el("button", { "class": "dp-b", title: "Show on map" }, "📍 Map");
    var bOpen = el("a", { "class": "dp-b", target: "_blank", rel: "noopener", title: "Open full size" }, "⤢ Full size");
    var bClose = el("button", { "class": "dp-b", title: "Close (Esc)" }, "✕");
    var bar = el("div", { "class": "dp-bar" });
    [cap, bPrev, bNext, bMap, bOpen, bClose].forEach(function (x) { bar.appendChild(x); });
    var box = el("div", { "class": "dp-img" });
    var img = el("img", { alt: "" });
    var load = el("div", { "class": "dp-load" }, "Loading…");
    var nl = el("button", { "class": "dp-nav l", "aria-label": "Previous" }, "‹");
    var nr = el("button", { "class": "dp-nav r", "aria-label": "Next" }, "›");
    [load, img, nl, nr].forEach(function (x) { box.appendChild(x); });
    view.appendChild(bar); view.appendChild(box); document.body.appendChild(view);

    img.addEventListener("load", function () { load.style.display = "none"; });
    function show(i) {
      if (!items.length) return;
      cur = (i + items.length) % items.length;
      var p = items[cur];
      load.style.display = "block";
      img.src = p.src; img.alt = p.clip + " KP " + p.kp;
      bOpen.href = p.src;
      cap.innerHTML = "KP " + p.kp + " · " + p.clip + " · t=" + p.t + "s" +
        "<small>" + (p.day || "") + " · ภาพ " + (cur + 1) + "/" + items.length +
        " · alt " + p.alt + " m · " + p.lat.toFixed(6) + ", " + p.lng.toFixed(6) + "</small>";
      markers.forEach(function (m, k) { m.setIcon(icon(items[k].yaw, k === cur)); m.setZIndex(k === cur ? 999 : 50); });
      // preload neighbours
      [cur + 1, cur - 1].forEach(function (k) { var q = items[(k + items.length) % items.length]; if (q) { var im = new Image(); im.src = q.src; } });
      view.classList.add("on");
    }
    function hide() { view.classList.remove("on"); if (cur >= 0 && markers[cur]) markers[cur].setIcon(icon(items[cur].yaw, false)); }
    bPrev.onclick = nl.onclick = function () { show(cur - 1); };
    bNext.onclick = nr.onclick = function () { show(cur + 1); };
    bClose.onclick = hide;
    bMap.onclick = function () { var p = items[cur]; hide(); gmap.panTo({ lat: p.lat, lng: p.lng }); if (gmap.getZoom() < 17) gmap.setZoom(17); markers[cur].setIcon(icon(p.yaw, true)); };
    view.addEventListener("click", function (e) { if (e.target === view || e.target === box) hide(); });
    document.addEventListener("keydown", function (e) {
      if (!view.classList.contains("on")) return;
      if (e.key === "Escape") hide(); else if (e.key === "ArrowLeft") show(cur - 1); else if (e.key === "ArrowRight") show(cur + 1);
    });
    var tx = null;
    box.addEventListener("touchstart", function (e) { tx = e.touches[0].clientX; }, { passive: true });
    box.addEventListener("touchend", function (e) {
      if (tx == null) return; var dx = e.changedTouches[0].clientX - tx; tx = null;
      if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1));
    });

    // ---------- markers ----------
    function icon(yaw, sel) {
      return { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, rotation: yaw, scale: sel ? 7 : 4.5,
               fillColor: sel ? "#facc15" : COLOR, fillOpacity: 1, strokeColor: "#111", strokeWeight: sel ? 2 : 1.2 };
    }
    function update() {
      var on = visible && gmap.getZoom() >= MIN_ZOOM;
      markers.forEach(function (m) { if ((m.getMap() != null) !== on) m.setMap(on ? gmap : null); });
    }

    // ---------- toggle button ----------
    var btn = el("button", { "class": "dp-btn", "aria-pressed": "true", title: "Show/hide drone photos" }, "📷 ภาพโดรน");
    btn.onclick = function () { visible = !visible; btn.setAttribute("aria-pressed", String(visible)); update(); };
    gmap.controls[google.maps.ControlPosition.LEFT_BOTTOM].push(btn);

    fetch(DATA_URL, { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        items = (d.photos || d).slice().sort(function (a, b) { return kpNum(a.kp) - kpNum(b.kp) || a.t - b.t; });
        btn.innerHTML = "📷 ภาพโดรน (" + items.length + ")";
        items.forEach(function (p, k) {
          var m = new google.maps.Marker({ position: { lat: p.lat, lng: p.lng }, icon: icon(p.yaw, false), zIndex: 50,
                                           title: "KP " + p.kp + " · " + p.clip + " t=" + p.t + "s" });
          m.addListener("click", function () { show(k); });
          markers.push(m);
        });
        gmap.addListener("zoom_changed", update);
        update();
        var q = location.hash.match(/photo=([^&]+)/);
        if (q) { var k = items.findIndex(function (p) { return p.src.indexOf(decodeURIComponent(q[1])) >= 0; }); if (k >= 0) show(k); }
      })
      .catch(function (e) { console.warn("drone photos: load failed", e); });
  }

  (function wait() { if (ready()) start(); else setTimeout(wait, 300); })();
})();
