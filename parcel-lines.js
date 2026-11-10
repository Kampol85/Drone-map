/* parcel-lines.js — แสดงเส้นแปลงที่ดิน (คัดลอกตำแหน่งจากภาพ LandsMaps กรมที่ดิน) ตามแนวท่อ
 * วิธีใช้: วางไฟล์นี้กับ parcel_lines.json ไว้โฟลเดอร์เดียวกับ index.html
 *          แล้วเพิ่ม <script src="parcel-lines.js"></script> ก่อน </body>
 * หมายเหตุ: ข้อมูลใช้ดูตำแหน่งโดยสังเขปเท่านั้น ไม่ใช่ข้อมูลรังวัด
 */
(function () {
  var MIN_ZOOM = 16;            // เริ่มแสดงเส้นแปลงเมื่อซูมถึงระดับนี้
  var DATA_URL = "parcel_lines.json";

  function ready() {
    try { return typeof google !== "undefined" && google.maps && typeof map !== "undefined" && map && map.getZoom; }
    catch (e) { return false; }
  }

  function start() {
    var gmap = map; // ตัวแปร map จาก index.html
    var layer = new google.maps.Data();
    layer.setStyle({ strokeColor: "#ff3b30", strokeOpacity: 0.85, strokeWeight: 1.5, clickable: false, zIndex: 1 });
    var visible = true;

    fetch(DATA_URL, { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var feats = (d.windows || []).map(function (w) {
          return { type: "Feature", properties: { kp: w.k },
                   geometry: { type: "MultiLineString", coordinates: w.lines } };
        });
        layer.addGeoJson({ type: "FeatureCollection", features: feats });
        update();
      })
      .catch(function (e) { console.warn("parcel-lines: load failed", e); });

    function update() {
      var show = visible && gmap.getZoom() >= MIN_ZOOM;
      if ((layer.getMap() != null) !== show) layer.setMap(show ? gmap : null);
    }
    gmap.addListener("zoom_changed", update);

    // ปุ่มเปิด/ปิด
    var box = document.createElement("label");
    box.style.cssText = "background:#fff;margin:10px;padding:6px 10px;border-radius:6px;box-shadow:0 1px 4px rgba(0,0,0,.3);font:13px sans-serif;cursor:pointer;user-select:none";
    box.innerHTML = '<input type="checkbox" checked style="vertical-align:middle;margin-right:6px">เส้นแปลง (LandsMaps)';
    box.querySelector("input").addEventListener("change", function (e) { visible = e.target.checked; update(); });
    gmap.controls[google.maps.ControlPosition.LEFT_BOTTOM].push(box);
  }

  (function wait(n) {
    if (ready()) return start();
    if (n > 200) return console.warn("parcel-lines: map not found");
    setTimeout(function () { wait(n + 1); }, 150);
  })(0);
})();
