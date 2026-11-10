/* parcel-lines.js — แสดงรูปแปลงที่ดินและเลขแปลงตามแนวท่อ (ข้อมูลจาก 5TP2_Parcel.kmz)
 * ข้อมูลอยู่ใน parcels.json  — สีตามสถานะในไฟล์ KMZ: 1 = เส้นขอบ, 2 = เหลือง, 3 = เขียว
 */
(function () {
  var MIN_ZOOM = 15;          // เริ่มแสดงรูปแปลง
  var LABEL_ZOOM = 17;        // เริ่มแสดงเลขแปลง
  var MAX_LABELS = 400;       // จำนวนป้ายเลขแปลงสูงสุดต่อหน้าจอ
  var DATA_URL = "parcels.json";
  var STYLE = {
    1: { fillOpacity: 0,    strokeColor: "#ffffff", fillColor: "#ffffff" },
    2: { fillOpacity: 0.12, strokeColor: "#facc15", fillColor: "#facc15" },
    3: { fillOpacity: 0.12, strokeColor: "#22c55e", fillColor: "#22c55e" }
  };

  function ready() {
    try { return typeof google !== "undefined" && google.maps && typeof map !== "undefined" && map && map.getZoom; }
    catch (e) { return false; }
  }

  function start() {
    var gmap = map;
    var layer = new google.maps.Data();
    var visible = true, labels = [], centers = [];
    var iw = new google.maps.InfoWindow();

    layer.setStyle(function (f) {
      var s = STYLE[f.getProperty("s")] || STYLE[1];
      return { strokeColor: s.strokeColor, strokeOpacity: 0.45, strokeWeight: 0.8,
               fillColor: s.fillColor, fillOpacity: s.fillOpacity, zIndex: -100 };
    });
    layer.addListener("click", function (e) {
      var n = e.feature.getProperty("n") || "-";
      iw.setContent("<b>แปลง " + n + "</b><br>สถานะ " + e.feature.getProperty("s"));
      iw.setPosition(e.latLng); iw.open(gmap);
    });

    fetch(DATA_URL, { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var feats = (d.parcels || []).map(function (p) {
          var c = p.c, sx = 0, sy = 0;
          for (var i = 0; i < c.length; i++) { sx += c[i][0]; sy += c[i][1]; }
          if (p.n) centers.push({ n: p.n, lat: sy / c.length, lng: sx / c.length });
          return { type: "Feature", properties: { n: p.n, s: p.s },
                   geometry: { type: "Polygon", coordinates: [c] } };
        });
        layer.addGeoJson({ type: "FeatureCollection", features: feats });
        update();
      })
      .catch(function (e) { console.warn("parcels: load failed", e); });

    function clearLabels() { labels.forEach(function (m) { m.setMap(null); }); labels = []; }

    function drawLabels() {
      clearLabels();
      if (!visible || gmap.getZoom() < LABEL_ZOOM) return;
      var b = gmap.getBounds(); if (!b) return;
      for (var i = 0; i < centers.length && labels.length < MAX_LABELS; i++) {
        var c = centers[i];
        if (!b.contains(c)) continue;
        labels.push(new google.maps.Marker({
          position: c, map: gmap, clickable: false, zIndex: -100, opacity: 0.75,
          icon: { path: google.maps.SymbolPath.CIRCLE, scale: 0 },
          label: { text: c.n, color: "#e5e7eb", fontSize: "10px", fontWeight: "400",
                   className: "parcel-num-label" }
        }));
      }
    }

    function update() {
      var show = visible && gmap.getZoom() >= MIN_ZOOM;
      if ((layer.getMap() != null) !== show) layer.setMap(show ? gmap : null);
      drawLabels();
    }
    gmap.addListener("idle", update);

    var css = document.createElement("style");
    css.textContent = ".parcel-num-label{text-shadow:0 0 2px #000,0 0 2px #000}";
    document.head.appendChild(css);

    var box = document.createElement("div");
    box.style.cssText = "background:#fff;margin:10px;padding:6px 10px;border-radius:6px;box-shadow:0 1px 4px rgba(0,0,0,.3);font:12px sans-serif;color:#111;user-select:none";
    box.innerHTML =
      '<label style="cursor:pointer;font-weight:600"><input type="checkbox" checked style="vertical-align:middle;margin-right:6px">รูปแปลงที่ดิน</label>' +
      '<div style="margin-top:4px;line-height:1.6">' +
      '<span style="display:inline-block;width:10px;height:10px;border:1.5px solid #888;margin-right:4px"></span>สถานะ 1 ' +
      '<span style="display:inline-block;width:10px;height:10px;background:#facc15;margin:0 4px 0 8px"></span>2 ' +
      '<span style="display:inline-block;width:10px;height:10px;background:#16a34a;margin:0 4px 0 8px"></span>3</div>';
    box.querySelector("input").addEventListener("change", function (e) { visible = e.target.checked; update(); });
    gmap.controls[google.maps.ControlPosition.LEFT_BOTTOM].push(box);
  }

  (function wait(n) {
    if (ready()) return start();
    if (n > 200) return console.warn("parcels: map not found");
    setTimeout(function () { wait(n + 1); }, 150);
  })(0);
})();
