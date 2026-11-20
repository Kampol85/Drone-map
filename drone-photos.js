/* drone-photos.js — ภาพนิ่งจากวิดีโอโดรน (ซ้อนแนวท่อ + KP + ขอบเขตแปลง)
 * ข้อมูลอยู่ใน photos/photos.json : [{src, clip, day, t, kp, lat, lng, yaw, alt}]
 * หมุดลูกศรสีส้ม = ตำแหน่งโดรนและทิศที่กล้องหัน  กดหมุดเพื่อเปิดภาพ
 * ปุ่ม "📷 ภาพโดรน" มุมล่างซ้าย = แผงรายชื่อภาพ (แยกตามวัน ค้นหา KP กดเพื่อเปิดภาพ / 📍 ไปยังตำแหน่ง)
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
      ".dp-load{position:absolute;font:13px var(--font,system-ui);opacity:.7}" +
      ".dp-wrap{display:flex;flex-direction:column;align-items:flex-start;margin:10px;font-family:var(--font,system-ui)}" +
      ".dp-wrap .dp-btn{margin:0}" +
      ".dp-btn[aria-expanded=true]{background:#f97316;border-color:#f97316}" +
      ".dp-pan{display:none;flex-direction:column;width:min(340px,calc(100vw - 20px));max-height:min(62vh,560px);margin-bottom:8px;background:rgba(15,23,32,.96);color:#fff;border:1px solid rgba(255,255,255,.14);border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.45);overflow:hidden}" +
      ".dp-pan.on{display:flex}" +
      ".dp-ph{display:flex;align-items:center;gap:8px;padding:10px 12px 6px;font:700 13px var(--font,system-ui)}" +
      ".dp-ph span{flex:1}" +
      ".dp-x{background:none;border:0;color:#cbd5e1;font-size:16px;cursor:pointer;padding:2px 6px;border-radius:6px}.dp-x:hover{background:#334155;color:#fff}" +
      ".dp-tools{display:flex;gap:6px;padding:0 12px 8px;flex-wrap:wrap}" +
      ".dp-tools input,.dp-tools select{flex:1;min-width:0;background:#0b1220;color:#fff;border:1px solid #334155;border-radius:7px;padding:6px 8px;font:12px var(--font,system-ui)}" +
      ".dp-tools label input{flex:none;width:15px;height:15px;margin:0;padding:0;accent-color:#f97316}" +
      ".dp-tools label{display:flex;align-items:center;gap:6px;font:12px var(--font,system-ui);color:#cbd5e1;width:100%;cursor:pointer}" +
      ".dp-list{overflow-y:auto;flex:1;padding:0 6px 8px;overscroll-behavior:contain}" +
      ".dp-day{position:sticky;top:0;background:rgba(15,23,32,.98);font:700 11px var(--font,system-ui);color:#fdba74;text-transform:uppercase;letter-spacing:.04em;padding:8px 6px 4px;display:flex;justify-content:space-between;cursor:pointer;z-index:1}" +
      ".dp-day small{color:#94a3b8;font-weight:500;text-transform:none;letter-spacing:0}" +
      ".dp-row{display:flex;align-items:center;gap:9px;width:100%;text-align:left;background:none;border:0;color:#e5e7eb;padding:5px 6px;border-radius:7px;cursor:pointer;font:12px var(--font,system-ui)}" +
      ".dp-row:hover{background:#1e293b}.dp-row.cur{background:#7c2d12}" +
      ".dp-row img{width:64px;height:36px;object-fit:cover;border-radius:4px;background:#1e293b;flex:none}" +
      ".dp-row b{display:block;font-weight:600;color:#fff}.dp-row small{color:#94a3b8}" +
      ".dp-pin{margin-left:auto;background:none;border:0;color:#94a3b8;cursor:pointer;font-size:14px;padding:4px 6px;border-radius:6px;flex:none}.dp-pin:hover{background:#334155;color:#fff}" +
      ".dp-empty{padding:16px;text-align:center;color:#94a3b8;font-size:12px}";
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
      markRow();
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

    // ---------- photo list panel (bottom-left) ----------
    var wrap = el("div", { "class": "dp-wrap" });
    var pan = el("div", { "class": "dp-pan", role: "region", "aria-label": "Drone photo list" });
    var ph = el("div", { "class": "dp-ph" }, "<span>📷 รายชื่อภาพโดรน</span>");
    var px = el("button", { "class": "dp-x", title: "ปิด", "aria-label": "Close list" }, "✕");
    ph.appendChild(px);
    var tools = el("div", { "class": "dp-tools" });
    var q = el("input", { type: "search", placeholder: "ค้นหา KP / คลิป เช่น 155+2", "aria-label": "Search photos" });
    var dsel = el("select", { "aria-label": "Filter by day" });
    var chk = el("input", { type: "checkbox" }); chk.checked = true;
    var lab = el("label"); lab.appendChild(chk); lab.appendChild(document.createTextNode("แสดงหมุดภาพบนแผนที่"));
    [q, dsel, lab].forEach(function (x) { tools.appendChild(x); });
    var list = el("div", { "class": "dp-list" });
    [ph, tools, list].forEach(function (x) { pan.appendChild(x); });
    var btn = el("button", { "class": "dp-btn", "aria-expanded": "false", title: "Show drone photo list" }, "📷 ภาพโดรน");
    wrap.appendChild(pan); wrap.appendChild(btn);
    gmap.controls[google.maps.ControlPosition.LEFT_BOTTOM].push(wrap);
    ["mousedown", "touchstart", "wheel", "dblclick"].forEach(function (ev) {
      pan.addEventListener(ev, function (e) { e.stopPropagation(); }, { passive: true });
    });

    var rows = [], collapsed = {};
    function setOpen(o) { pan.classList.toggle("on", o); btn.setAttribute("aria-expanded", String(o)); if (o) { renderList(); markRow(true); } }
    btn.onclick = function () { setOpen(!pan.classList.contains("on")); };
    px.onclick = function () { setOpen(false); };
    chk.onchange = function () { visible = chk.checked; update(); };
    q.oninput = renderList; dsel.onchange = renderList;

    function thumb(src) { return src.replace(/^photos\//, "photos/thumbs/"); }
    function dayKey(p) { return p.day || "—"; }
    function dayNum(d) { var m = /Day\s*(\d+)/i.exec(d); return m ? +m[1] : 999; }
    function markRow(scroll) {
      rows.forEach(function (r) {
        var on = r.k === cur; r.el.classList.toggle("cur", on);
        if (on && scroll) r.el.scrollIntoView({ block: "nearest" });
      });
    }
    function goMap(k) {
      var p = items[k]; gmap.panTo({ lat: p.lat, lng: p.lng }); if (gmap.getZoom() < 17) gmap.setZoom(17);
      markers.forEach(function (m, j) { m.setIcon(icon(items[j].yaw, j === k)); m.setZIndex(j === k ? 999 : 50); });
      cur = k; markRow();
    }
    function renderList() {
      var term = q.value.trim().toLowerCase().replace(/^kp\s*/, ""), dsv = dsel.value;
      var groups = {}, order = [];
      items.forEach(function (p, k) {
        var d = dayKey(p);
        if (dsv && d !== dsv) return;
        if (term && (p.kp + " " + p.clip + " " + p.src).toLowerCase().indexOf(term) < 0) return;
        if (!groups[d]) { groups[d] = []; order.push(d); }
        groups[d].push(k);
      });
      order.sort(function (a, b) { return dayNum(a) - dayNum(b) || (a < b ? -1 : 1); });
      list.innerHTML = ""; rows = [];
      if (!order.length) { list.appendChild(el("div", { "class": "dp-empty" }, "ไม่พบภาพ")); return; }
      var frag = document.createDocumentFragment();
      order.forEach(function (d) {
        var ks = groups[d], f = items[ks[0]], l = items[ks[ks.length - 1]];
        var open = term || dsv || !collapsed[d];
        var hd = el("div", { "class": "dp-day", title: "ย่อ/ขยาย" },
          (open ? "▾ " : "▸ ") + d + "<small>" + ks.length + " ภาพ · KP " + f.kp + "–" + l.kp + "</small>");
        hd.onclick = function () { collapsed[d] = !collapsed[d]; renderList(); };
        frag.appendChild(hd);
        if (!open) return;
        ks.forEach(function (k) {
          var p = items[k];
          var r = el("div", { "class": "dp-row", role: "button", tabindex: "0", title: "เปิดภาพ" },
            '<img loading="lazy" alt="" src="' + thumb(p.src) + '" onerror="this.onerror=null;this.src=\'' + p.src + '\'"><span><b>KP ' + p.kp + "</b><small>" + p.clip + " · t=" + p.t + "s</small></span>");
          var pin = el("button", { "class": "dp-pin", title: "ไปยังตำแหน่งบนแผนที่", "aria-label": "Show on map" }, "📍");
          pin.onclick = function (e) { e.stopPropagation(); goMap(k); };
          r.appendChild(pin);
          r.onclick = function () { show(k); };
          r.onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); show(k); } };
          rows.push({ k: k, el: r }); frag.appendChild(r);
        });
      });
      list.appendChild(frag); markRow();
    }

    fetch(DATA_URL, { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        items = (d.photos || d).slice().sort(function (a, b) { return kpNum(a.kp) - kpNum(b.kp) || a.t - b.t; });
        btn.innerHTML = "📷 ภาพโดรน (" + items.length + ")";
        var days = []; items.forEach(function (p) { var d = dayKey(p); if (days.indexOf(d) < 0) days.push(d); });
        days.sort(function (a, b) { return dayNum(a) - dayNum(b) || (a < b ? -1 : 1); });
        dsel.innerHTML = '<option value="">ทุกวัน (' + days.length + ")</option>" +
          days.map(function (d) { return '<option value="' + d.replace(/"/g, "&quot;") + '">' + d + "</option>"; }).join("");
        days.forEach(function (d) { collapsed[d] = true; });
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
