"use strict";
let fallChart = null;
let satMap, satLayer, satMonth = "04", SATLUT = null;
let LANG = "ja", D = null, map, map2, layer2, markers = [], places = [], chartRefs = [], tmYear = 2024, layerKey = "heavy";
const T = (ja, en) => (LANG === "ja" ? ja : en);
const KEYS = {
  powder: { icon: "❄️", ja: "パウダーの日", en: "Powder days", sub_ja: "雪の日のうち、日平均気温 −5℃以下（軽く乾いた雪）", sub_en: "Snow days with daily mean ≤ −5 °C (light, dry snow)", unit: "日", unit_en: "days", color: "--powder" },
  heavy: { icon: "💧", ja: "重い雪の日", en: "Heavy-snow days", sub_ja: "雪の日のうち、日平均気温 −2℃より暖かい（水分が多い雪）", sub_en: "Snow days with daily mean > −2 °C (wet, heavy snow)", unit: "日", unit_en: "days", color: "--heavy" },
  icy: { icon: "🧊", ja: "つるつる路面の日", en: "Icy-road days", sub_ja: "最高気温0℃超・最低気温0℃未満（昼に溶けて夜に凍る）", sub_en: "Max > 0 °C and min < 0 °C (melts by day, refreezes at night)", unit: "日", unit_en: "days", color: "--icy" },
  spring: { icon: "🛰️", ja: "4月に残る雪（衛星）", en: "April snow cover (satellite)", sub_ja: "NASA MODIS衛星で見た、4月に雪でおおわれた土地の割合（2001〜2026年）", sub_en: "Share of land under snow in April, seen by NASA's MODIS satellite (2001–2026)", unit: "%", unit_en: "%", color: "--blue", sat: "cov_apr" },
  share: { icon: "📊", ja: "雪のうちパウダーの割合", en: "Share of powder", sub_ja: "雪の日全体に占めるパウダーの日の割合", sub_en: "Powder days as a share of all snow days", unit: "%", unit_en: "%", color: "--powder" },
};
const QUICK = [["札幌", "Sapporo", 43.06, 141.33], ["ニセコ（倶知安）", "Niseko (Kutchan)", 42.90, 140.76], ["旭川", "Asahikawa", 43.76, 142.37], ["函館", "Hakodate", 41.82, 140.75], ["釧路", "Kushiro", 42.98, 144.38], ["網走", "Abashiri", 44.02, 144.28]];

const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const km = (a, b, c, d) => { const R = 6371, r = Math.PI / 180, x = (d - b) * r * Math.cos((a + c) / 2 * r), y = (c - a) * r; return Math.sqrt(x * x + y * y) * R; };
const mean = a => { const v = a.filter(x => x != null); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
const fmt = (x, d = 1) => (x == null ? "–" : (Math.round(x * 10 ** d) / 10 ** d).toString());

function applyLang() {
  document.documentElement.lang = LANG;
  document.querySelectorAll("[data-ja]").forEach(e => (e.textContent = e.dataset[LANG]));
  document.querySelectorAll("[data-ph-ja]").forEach(e => (e.placeholder = e.dataset["ph" + (LANG === "ja" ? "Ja" : "En")]));
  document.getElementById("lang").textContent = LANG === "ja" ? "EN" : "日本語";
  document.getElementById("quick").innerHTML = QUICK.map((q, i) => `<button class="chip" data-i="${i}">${T(q[0], q[1])}</button>`).join("");
  document.querySelectorAll("#quick .chip").forEach(b => (b.onclick = () => { const q = QUICK[+b.dataset.i]; choose(q[2], q[3], T(q[0], q[1])); }));
  renderAbout(); renderFacts(); renderFalls(); renderLayerChips(); drawMap2();
  if (places.length) render();
}

function nearestCell(la, lo) { return D.cells.reduce((b, c) => (km(la, lo, c.lat, c.lon) < km(la, lo, b.lat, b.lon) ? c : b)); }
function nearestStation(la, lo) { return D.stations.reduce((b, s) => (km(la, lo, s.lat, s.lon) < km(la, lo, b.lat, b.lon) ? s : b)); }

function choose(la, lo, label) {
  const cmp = document.getElementById("cmpOn").checked;
  const st = nearestStation(la, lo);
  const p = { la, lo, label: label || `${la.toFixed(2)}, ${lo.toFixed(2)}`, cell: nearestCell(la, lo), st, dist: km(la, lo, st.lat, st.lon) };
  if (cmp && places.length >= 1) places = [places[0], p]; else places = [p];
  markers.forEach(m => map.removeLayer(m));
  markers = places.map((q, i) => L.circleMarker([q.la, q.lo], { radius: 9, color: i ? css("--heavy") : css("--blue"), weight: 3, fillOpacity: .3 }).addTo(map).bindTooltip(q.label));
  render();
  document.getElementById("result").hidden = false;
  if (satMap) satMap.invalidateSize();
  if (!cmp) document.getElementById("places").scrollIntoView({ behavior: "smooth", block: "start" });
}

function verdict(g, n) {
  // g: ground (JMA) trend, n: NASA trend
  const sgn = t => (t && t.slope10 !== 0 ? Math.sign(t.slope10) : 0);
  if (!g) return n && n.p < 0.05 ? ["mid", T("NASAでは有意（近くに地上観測なし）", "Significant in NASA data (no nearby ground station)")] : ["no", T("まだ言えない", "Not yet clear")];
  const same = sgn(g) !== 0 && sgn(g) === sgn(n);
  if (same && g.p < 0.05 && n.p < 0.05) return ["ok", T("✅ 確か：NASAと地上観測がそろって有意", "✅ Certain: NASA and ground data agree, both significant")];
  if (same && Math.min(g.p, n.p) < 0.1) return ["mid", T("🟡 傾向あり：同じ方向、片方が有意", "🟡 Likely: same direction, one significant")];
  if (same) return ["no", T("⚪ まだ言えない：同じ方向だが有意でない", "⚪ Not yet clear: same direction, not significant")];
  return ["no", T("⚪ まだ言えない：データの方向が違う", "⚪ Not yet clear: data disagree")];
}

function satCardHTML(k, p, idx) {
  const K = KEYS[k], near = p.dist <= 40, src = near ? p.st : p.cell, ser = src.series[K.sat], tr = src.trend[K.sat];
  const v = ser.filter(x => x != null), a = mean(v.slice(0, 10)), b = mean(ser.slice(-10));
  const cls = tr && tr.p < 0.05 ? "ok" : tr && tr.p < 0.1 ? "mid" : "no";
  const txt = tr && tr.p < 0.05 ? T("✅ 確か：衛星の26年分で有意", "✅ Certain: significant over 26 years of satellite data") : tr && tr.p < 0.1 ? T("🟡 傾向あり（p<0.1）", "🟡 Likely (p < 0.1)") : T("⚪ まだ言えない", "⚪ Not yet clear");
  const arrow = tr ? (tr.slope10 > 0 ? "↑" : tr.slope10 < 0 ? "↓" : "→") : "";
  return `<div class="card kc"><h3>${K.icon} ${T(K.ja, K.en)}</h3><div class="sub">${T(K.sub_ja, K.sub_en)}</div>
  <div class="nums"><span>${T("2000年代", "2000s")} <b class="big">${fmt(a, 0)}</b>%</span><span>→ ${T("2020年代", "2020s")} <b class="big">${fmt(b, 0)}</b>%</span>
  <span class="arrow">${arrow} ${tr ? fmt(tr.slope10) : "–"}${T("ポイント", " pts")}/${T("10年", "decade")}</span></div>
  <canvas id="c${idx}"></canvas><span class="badge ${cls}">${txt}</span>
  <div class="cmpline">${near ? T(`${p.st.ja}のまわり約20km四方`, `~20 km box around ${p.st.en}`) : T(`約50kmのマス（北緯${p.cell.lat}° 東経${p.cell.lon}°）`, `~50 km cell ${p.cell.lat}°N ${p.cell.lon}°E`)}${tr ? " · p=" + fmt(tr.p, 2) : ""} · ${T("北海道全体", "All Hokkaido")} ${fmt(D.hokkaido.trend.cov_apr.slope10)}${T("ポイント/10年", " pts/decade")} (p=${fmt(D.hokkaido.trend.cov_apr.p, 3)})</div></div>`;
}

function cardHTML(k, p, idx) {
  if (KEYS[k].sat) return satCardHTML(k, p, idx);
  const K = KEYS[k], near = p.dist <= 40;
  const ser = near ? p.st.series[k] : p.cell.series[k];
  const a = mean(ser.slice(0, 10)), b = mean(ser.slice(-10));
  const tr = near ? p.st.trend[k] : p.cell.trend[k];
  const [cls, txt] = verdict(near ? p.st.trend[k] : null, p.cell.trend[k]);
  const unit = T(K.unit, K.unit_en);
  const arrow = tr ? (tr.slope10 > 0 ? "↑" : tr.slope10 < 0 ? "↓" : "→") : "";
  return `<div class="card kc"><h3>${K.icon} ${T(K.ja, K.en)}</h3><div class="sub">${T(K.sub_ja, K.sub_en)}</div>
  <div class="nums"><span>${T("1990年代", "1990s")} <b class="big">${fmt(a, 0)}</b>${unit}</span><span>→ ${T("2020年代", "2020s")} <b class="big">${fmt(b, 0)}</b>${unit}</span>
  <span class="arrow">${arrow} ${tr ? fmt(tr.slope10) : "–"}${unit}/${T("10年", "decade")}</span></div>
  <canvas id="c${idx}"></canvas><span class="badge ${cls}">${txt}</span>
  <div class="cmpline">${near ? T(`地上：気象庁${p.st.ja}（${fmt(p.dist, 0)}km）`, `Ground: JMA ${p.st.en} (${fmt(p.dist, 0)} km)`) : T("地上観測が40km以内にないためNASAデータで表示", "No ground station within 40 km, NASA data shown")} · NASA ${p.cell.trend[k] ? fmt(p.cell.trend[k].slope10) + unit + "/" + T("10年", "dec") + " (p=" + fmt(p.cell.trend[k].p, 2) + ")" : "–"}${near && tr ? " · " + T("地上", "ground") + " p=" + fmt(tr.p, 2) : ""}</div></div>`;
}

function drawChart(id, p, k, p2) {
  const near = p.dist <= 40, yrs = D.winters;
  if (KEYS[k].sat) {
    const sk = KEYS[k].sat, i0 = D.winters.indexOf(2001), src = q => (q.dist <= 40 ? q.st : q.cell).series[sk].slice(i0);
    const ds = [{ label: T("NASA MODIS衛星", "NASA MODIS satellite"), data: src(p), borderColor: css(KEYS[k].color), pointRadius: 2, borderWidth: 2, tension: .25 },
      { label: T("北海道全体", "All Hokkaido"), data: D.hokkaido.series[sk].slice(i0), borderColor: css("--gray"), borderDash: [4, 3], pointRadius: 0, borderWidth: 1.5, tension: .25 }];
    if (p2) ds.push({ label: p2.label, data: src(p2), borderColor: css("--heavy"), pointRadius: 0, borderWidth: 2, tension: .25 });
    chartRefs.push(new Chart(document.getElementById(id), { type: "line", data: { labels: yrs.slice(i0), datasets: ds },
      options: { animation: false, maintainAspectRatio: false, spanGaps: true, plugins: { legend: { display: true, labels: { boxWidth: 10, font: { size: 11 }, color: css("--muted") } } },
        scales: { x: { ticks: { maxTicksLimit: 6, color: css("--muted") }, grid: { display: false } }, y: { min: 0, max: 100, ticks: { color: css("--muted"), maxTicksLimit: 3 } } } } }));
    return;
  }
  const ds = [{ label: near ? T("地上（気象庁）", "Ground (JMA)") : "NASA", data: (near ? p.st.series[k] : p.cell.series[k]), borderColor: css(KEYS[k].color), backgroundColor: "transparent", pointRadius: 0, borderWidth: 2, tension: .25 },
    { label: "NASA POWER", data: p.cell.series[k], borderColor: css("--gray"), borderDash: [4, 3], pointRadius: 0, borderWidth: 1.5, tension: .25, hidden: !near }];
  if (p2) ds.push({ label: p2.label, data: (p2.dist <= 40 ? p2.st.series[k] : p2.cell.series[k]), borderColor: css("--heavy"), pointRadius: 0, borderWidth: 2, tension: .25 });
  chartRefs.push(new Chart(document.getElementById(id), { type: "line", data: { labels: yrs, datasets: ds },
    options: { animation: false, maintainAspectRatio: false, plugins: { legend: { display: true, labels: { boxWidth: 10, font: { size: 11 }, color: css("--muted") } } },
      scales: { x: { ticks: { maxTicksLimit: 6, color: css("--muted") }, grid: { display: false } }, y: { beginAtZero: true, ticks: { color: css("--muted"), maxTicksLimit: 4 } } } } }));
}

function person(depth) {
  // 170 cm adult silhouette with snow up to `depth` cm
  const H = 200, scale = 170 / 170, y0 = 190, px = cm => (cm / 170) * 170;
  const snowH = Math.min(depth || 0, 200), sy = y0 - px(snowH);
  return `<svg viewBox="0 0 130 200" role="img" aria-label="snow depth ${depth} cm">
  <g fill="${css("--ink")}" opacity=".85"><circle cx="65" cy="32" r="12"/><rect x="50" y="46" width="30" height="62" rx="12"/><rect x="51" y="102" width="12" height="88" rx="6"/><rect x="67" y="102" width="12" height="88" rx="6"/><rect x="38" y="50" width="10" height="52" rx="5"/><rect x="82" y="50" width="10" height="52" rx="5"/></g>
  <rect x="0" y="${sy}" width="130" height="${y0 - sy}" fill="#dbe9fb" opacity=".88" stroke="#9cc3ef"/>
  <line x1="0" y1="${y0}" x2="130" y2="${y0}" stroke="${css("--muted")}"/>
  <text x="4" y="${Math.max(sy - 4, 12)}" font-size="12" fill="${css("--blue")}" font-weight="700">${depth == null ? "–" : depth + "cm"}</text></svg>`;
}

function partOfBody(d) {
  if (d == null) return T("記録なし", "no record");
  if (d < 25) return T("足首くらい", "about ankle-deep");
  if (d < 50) return T("ひざの下くらい", "below the knee");
  if (d < 75) return T("ひざの上くらい", "above the knee");
  if (d < 100) return T("腰くらい", "about waist-high");
  if (d < 130) return T("おなかから胸くらい", "up to the chest");
  return T("肩くらいまで", "up to the shoulders");
}

function tmHTML(p, y) {
  const s = p.st.series, i = D.winters.indexOf(y), j = D.winters.length - 1;
  const one = (k, lab) => `<div class="tmc">${person(s.maxdepth[k])}<div class="t"><p>${lab}</p><b>${s.maxdepth[k] ?? "–"}cm</b><p>${T("いちばん積もった雪：", "Deepest snow: ")}${partOfBody(s.maxdepth[k])}</p>
    <p>${T("いちばん寒い朝", "Coldest morning")} (${s.cold_date[k] || "–"})：${fmt(s.cold_t[k])}℃ → ${T("体感", "feels like")} <b style="display:inline;font-size:18px">${fmt(s.cold_wc[k])}℃</b></p></div></div>`;
  return one(i, T(`${y}年の冬・${p.st.ja}`, `Winter ${y} · ${p.st.en}`)) + (i !== j ? one(j, T(`${D.winters[j]}年の冬（最新）`, `Winter ${D.winters[j]} (latest)`)) : "");
}

// NASA GIBS monthly snow-cover tiles, recoloured in the browser: GIBS colour -> percent (official colour map) -> blue shade
const SatLayer = L.GridLayer.extend({
  createTile(c, done) {
    const cv = document.createElement("canvas"), sz = this.getTileSize(); cv.width = sz.x; cv.height = sz.y;
    const img = new Image(); img.crossOrigin = "anonymous";
    img.onload = () => {
      const g = cv.getContext("2d"); g.imageSmoothingEnabled = false; g.drawImage(img, 0, 0, sz.x, sz.y);
      const d = g.getImageData(0, 0, sz.x, sz.y), a = d.data;
      for (let i = 0; i < a.length; i += 4) {
        const v = a[i + 3] ? SATLUT.get((a[i] << 16) | (a[i + 1] << 8) | a[i + 2]) : undefined;
        if (!v) { a[i + 3] = 0; continue; }
        const t = v / 100; a[i] = 120 - 100 * t; a[i + 1] = 90 - 30 * t; a[i + 2] = 210 - 50 * t; a[i + 3] = 70 + 180 * t;
      }
      g.putImageData(d, 0, 0); done(null, cv);
    };
    img.onerror = () => done(null, cv);
    img.src = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_L3_Snow_Cover_Monthly_Average_Pct/default/${this.options.time}/GoogleMapsCompatible_Level6/${c.z}/${c.y}/${c.x}.png`;
    return cv;
  },
});

function renderSat() {
  if (!satMap) return;
  if (satLayer) { satMap.removeLayer(satLayer); satLayer = null; }
  const y = tmYear, note = document.getElementById("satNote");
  if (y < 2001) { note.textContent = T(`${y}年の冬はまだ衛星（MODIS、2000年打ち上げ）がありません。2001年以降を選んでください。`, `No MODIS satellite yet in winter ${y} (launched 2000). Pick 2001 or later.`); return; }
  let ym = `${y}-${satMonth}`; if (ym === "2016-02") ym = "2016-01";
  satLayer = new SatLayer({ time: ym + "-01", maxNativeZoom: 6, maxZoom: 9, opacity: 1, attribution: "NASA GIBS / MODIS" }).addTo(satMap);
  const k = satMonth === "04" ? "cov_apr" : "cov_feb", i = D.winters.indexOf(y), v = D.hokkaido.series[k][i], last = D.hokkaido.series[k][D.winters.length - 1];
  const m0 = D.hokkaido.series[k].slice(D.winters.indexOf(2001), D.winters.indexOf(2001) + 10);
  note.textContent = T(`${ym.replace("-", "年")}月：北海道の陸地の${fmt(v, 0)}%が雪（濃い青ほど一か月ずっと雪）。2000年代（2001〜2010年）平均${fmt(mean(m0), 0)}%、最新（2026年）${fmt(last, 0)}%。`,
    `${ym}: ${fmt(v, 0)}% of Hokkaido's land under snow (darker blue = snow all month). 2000s average (2001–2010) ${fmt(mean(m0), 0)}%, latest (2026) ${fmt(last, 0)}%.`) + (ym === "2016-01" ? T("（2016年2月は衛星データがないため1月）", " (Feb 2016 missing, January shown)") : "");
}

function tipsHTML(p) {
  const near = p.dist <= 40, t = k => (near ? p.st.trend[k] : p.cell.trend[k]) || { slope10: 0, p: 1 };
  const L = [];
  if (t("heavy").slope10 > 0) L.push(T("重い雪の日が増える方向です。屋根の雪下ろしは早めに、湿った雪による倒木・停電にも備えましょう。", "Heavy-snow days are rising: clear roofs early and prepare for fallen trees and power cuts from wet snow."));
  if (t("icy").slope10 > 0) L.push(T("つるつる路面の日が増える方向です。滑り止め付きの靴や砂まきを用意しましょう。", "Icy-road days are rising: use anti-slip shoes and grit."));
  if (t("icy").slope10 < 0) L.push(T("つるつる路面の日は減る方向ですが、0℃前後の朝は引き続き注意が必要です。", "Icy-road days are falling, but mornings around 0 °C still need care."));
  const sp = (near ? p.st.trend.cov_apr : p.cell.trend.cov_apr);
  if (sp && sp.slope10 < 0) L.push(T("春の雪どけが早まる方向です（衛星）。春スキーや雪解け水・融雪期の川の増水の時期が変わる可能性があります。", "Spring snow is melting earlier (satellite): spring skiing and meltwater timing may shift."));
  if (t("share").slope10 < 0) L.push(T("パウダーの割合が下がる方向です。スキー場や観光は、雪質の変化を見ながら計画を。", "The powder share is falling: ski areas and tourism should watch snow quality."));
  if (t("share").slope10 >= 0) L.push(T("パウダーの割合はまだ保たれています。北海道の雪の魅力を守るため、毎年の変化を見ていきましょう。", "The powder share is holding for now; keep watching it every winter."));
  L.push(T("「確か」でない傾向は、断定せず参考として見てください。", "Treat trends not marked “certain” as hints, not facts."));
  return "<ul>" + L.map(x => `<li>${x}</li>`).join("") + "</ul>";
}

function trustHTML(p) {
  const pc = p.cell.precip_check || {}, n = pc.nasa, j = pc.jaxa;
  const agree = n && j && Math.sign(n.slope10) === Math.sign(j.slope10);
  return `<ul>
  <li>${T("NASA POWER（MERRA-2再解析）：", "NASA POWER (MERRA-2 reanalysis): ")}${T(`約50kmのマス（北緯${p.cell.lat}°・東経${p.cell.lon}°）の日別データ`, `daily data for the ~50 km cell at ${p.cell.lat}°N ${p.cell.lon}°E`)}</li>
  <li>${T("気象庁の地上観測：", "JMA ground observations: ")}${T(`${p.st.ja}（${fmt(p.dist, 0)}km）の日別の降雪・気温・積雪`, `daily snowfall, temperature and snow depth at ${p.st.en} (${fmt(p.dist, 0)} km)`)}</li>
  <li>${T("JAXA GSMaP（衛星降水）：", "JAXA GSMaP (satellite precipitation): ")}${T("冬の降水量の傾き（2001〜2026年）", "winter precipitation trend (2001–2026)")} — NASA ${n ? fmt(n.slope10) : "–"}mm / JAXA ${j ? fmt(j.slope10) : "–"}mm ${T("（10年あたり）", "per decade")} → ${agree ? T("✅ 同じ方向", "✅ same direction") : T("⚪ 方向が違う／不明", "⚪ differ / unclear")}</li>
  <li>${T("検定：季節を絞った冬ごとの値にマン・ケンドール検定（p<0.05で有意）とセン傾き。", "Test: Mann–Kendall on one value per winter (significant at p < 0.05) with Sen's slope.")}</li></ul>`;
}

function render() {
  chartRefs.forEach(c => c.destroy()); chartRefs = [];
  const [p, p2] = places;
  document.getElementById("places").innerHTML = places.map((q, i) => `<div class="card place ${i ? "b" : ""}"><h3>${q.label}</h3><p>${T(`最寄りの地上観測：気象庁${q.st.ja}（${fmt(q.dist, 0)}km）・NASAのマス：北緯${q.cell.lat}° 東経${q.cell.lon}°`, `Nearest ground station: JMA ${q.st.en} (${fmt(q.dist, 0)} km) · NASA cell ${q.cell.lat}°N ${q.cell.lon}°E`)}</p></div>`).join("");
  const keys = ["powder", "heavy", "icy", "share", "spring"];
  document.getElementById("cards").innerHTML = keys.map((k, i) => cardHTML(k, p, i)).join("");
  keys.forEach((k, i) => drawChart("c" + i, p, k, p2));
  document.getElementById("tmYear").textContent = tmYear;
  document.getElementById("tmSlider").value = tmYear;
  document.getElementById("tm").innerHTML = tmHTML(p, tmYear) + (p2 ? tmHTML(p2, tmYear).split('<div class="tmc">').slice(0, 2).join('<div class="tmc">') : "");
  renderSat();
  document.getElementById("tips").innerHTML = tipsHTML(p);
  document.getElementById("trust").innerHTML = trustHTML(p);
}

function renderLayerChips() {
  const el = document.getElementById("layerChips");
  el.innerHTML = ["heavy", "powder", "icy", "share", "spring"].map(k => `<button class="chip ${k === layerKey ? "on" : ""}" data-k="${k}">${KEYS[k].icon} ${T(KEYS[k].ja, KEYS[k].en)}</button>`).join("");
  el.querySelectorAll(".chip").forEach(b => (b.onclick = () => { layerKey = b.dataset.k; renderLayerChips(); drawMap2(); }));
}

function color(v, max) {
  const t = Math.max(-1, Math.min(1, v / max));
  return t >= 0 ? `rgba(194,65,12,${0.15 + 0.75 * t})` : `rgba(44,116,212,${0.15 + 0.75 * -t})`;
}

function drawMap2() {
  if (!map2 || !D) return;
  if (layer2) map2.removeLayer(layer2);
  layer2 = L.layerGroup().addTo(map2);
  const tk = KEYS[layerKey].sat || layerKey, max = layerKey === "spring" ? 15 : layerKey === "share" ? 6 : 4;
  D.cells.forEach(c => {
    const t = c.trend[tk]; if (!t) return;
    L.rectangle([[c.lat - .25, c.lon - .25], [c.lat + .25, c.lon + .25]], { weight: t.p < 0.05 ? 2.5 : 0.5, color: t.p < 0.05 ? css("--ink") : "#ffffff", fillColor: color(t.slope10, max), fillOpacity: 1 })
      .bindTooltip(`NASA ${c.lat}°N ${c.lon}°E<br>${T(KEYS[layerKey].ja, KEYS[layerKey].en)}: ${fmt(t.slope10)}${(KEYS[layerKey].sat ? T("ポイント", " pts") : T(KEYS[layerKey].unit, KEYS[layerKey].unit_en))}/${T("10年", "decade")} (p=${fmt(t.p, 2)})`).addTo(layer2)
      .on("click", () => choose(c.lat, c.lon, T(`北緯${c.lat}° 東経${c.lon}°`, `${c.lat}°N ${c.lon}°E`)));
  });
  D.stations.forEach(s => {
    const t = s.trend[tk]; if (!t || KEYS[layerKey].sat) return;
    L.circleMarker([s.lat, s.lon], { radius: 9, weight: t.p < 0.05 ? 3 : 1.5, color: css("--ink"), fillColor: color(t.slope10, max), fillOpacity: 1 })
      .bindTooltip(`${T("気象庁", "JMA")} ${T(s.ja, s.en)}<br>${fmt(t.slope10)}${T(KEYS[layerKey].unit, KEYS[layerKey].unit_en)}/${T("10年", "decade")} (p=${fmt(t.p, 2)})`).addTo(layer2)
      .on("click", () => choose(s.lat, s.lon, T(s.ja, s.en)));
  });
  document.getElementById("legend").textContent = (KEYS[layerKey].sat ? T("4月に雪が残る割合の変化（NASA MODIS衛星、2001〜2026年）。", "Change in April snow cover (NASA MODIS satellite, 2001–2026). ") : "") + T("色：赤＝増えた、青＝減った（濃いほど大きい）。太い枠＝統計的に有意（p<0.05）。四角＝NASAの約50kmマス、丸＝気象庁の観測所。", "Colour: red = increased, blue = decreased (darker = larger). Thick outline = significant (p < 0.05). Squares = NASA ~50 km cells, circles = JMA stations.");
}

function renderFacts() {
  const st = D.stations.map(s => s.trend.heavy).filter(Boolean), ce = D.cells.map(c => c.trend.heavy).filter(Boolean);
  const cp = D.cells.map(c => c.trend.powder).filter(Boolean);
  const stUp = st.filter(t => t.slope10 > 0).length, stSig = st.filter(t => t.slope10 > 0 && t.p < 0.05).length;
  const ceSig = ce.filter(t => t.slope10 > 0 && t.p < 0.05).length, ceDown = ce.filter(t => t.slope10 < 0 && t.p < 0.05).length;
  const pUp = cp.filter(t => t.slope10 > 0).length, pDown = cp.filter(t => t.slope10 < 0 && t.p < 0.05).length;
  document.getElementById("facts").innerHTML = [
    ["", `${stUp}/${st.length}`, T(`気象庁の観測所で「重い雪の日」が増える方向（うち${stSig}か所は統計的に有意）`, `JMA stations where heavy-snow days rose (${stSig} significant)`)],
    ["", `${ceSig}/${ce.length}`, T(`NASAの約50kmマスで「重い雪の日」が有意に増加（有意に減ったマスは${ceDown}）`, `NASA ~50 km cells with a significant rise in heavy-snow days (${ceDown} significant falls)`)],
    ["s", `${D.cells.filter(c => c.trend.cov_apr && c.trend.cov_apr.slope10 < 0).length}/${D.cells.filter(c => c.trend.cov_apr).length}`, T(`NASA衛星（MODIS）で「4月に残る雪」が減ったマス（うち${D.cells.filter(c => c.trend.cov_apr && c.trend.cov_apr.slope10 < 0 && c.trend.cov_apr.p < 0.05).length}は有意）。北海道全体で10年に${fmt(-D.hokkaido.trend.cov_apr.slope10, 0)}ポイント減`, `NASA cells where April snow cover fell, seen by the MODIS satellite (${D.cells.filter(c => c.trend.cov_apr && c.trend.cov_apr.slope10 < 0 && c.trend.cov_apr.p < 0.05).length} significant). All Hokkaido: −${fmt(-D.hokkaido.trend.cov_apr.slope10, 0)} points per decade`)],
    ["p", `${pUp}/${cp.length}`, T(`NASAのマスで「パウダーの日」が増えた数（有意に減ったマスは${pDown}）`, `NASA cells where powder days rose (${pDown} significant falls)`)],
  ].map(([c, b, t]) => `<div class="fact ${c}"><b>${b}</b><span>${t}</span></div>`).join("");
  const F = D.field, mark = p => (p < 0.05 ? "✅" : p < 0.1 ? "🟡" : "⚪");
  const row = (k, ja, en) => `<li>${mark(F[k].p_field)} ${T(ja, en)}：${T(`${F[k].of}マス中${F[k].cells_sig}マスが有意に${F[k].direction === "up" ? "増加" : "減少"}`, `${F[k].cells_sig} of ${F[k].of} cells significantly ${F[k].direction === "up" ? "up" : "down"}`)} → ${T("偶然の確率", "chance")} p=${fmt(F[k].p_field, 3)}${T(`（多重比較の補正後も${F[k].cells_fdr}マス）`, ` (${F[k].cells_fdr} cells survive FDR correction)`)}</li>`;
  document.getElementById("field").innerHTML = `<details><summary>${T("🔍 偶然ではないの？（北海道全体での確かめ）", "🔍 Could this be chance? (Hokkaido-wide check)")}</summary>
  <p class="note">${T("43マスも調べると、偶然に「有意」になるマスも出ます。そこで冬の順番を500回シャッフルし、同じくらい多くのマスが偶然そろう確率を計算しました（となりのマスどうしの似かたはそのまま）。", "With 43 cells, some can look significant by chance. We shuffled the order of winters 500 times (same shuffle for every cell, so neighbouring cells stay alike) and counted how often this many cells line up by chance.")}</p><ul>
  ${row("cov_apr", "4月に残る雪（衛星）", "April snow cover (satellite)")}${row("heavy", "重い雪の日", "Heavy-snow days")}${row("icy", "つるつる路面の日", "Icy-road days")}${row("powder", "パウダーの日", "Powder days")}${row("cov_dec", "12月の雪（衛星）", "December snow cover (satellite)")}</ul>
  <p class="note">${T("✅ 偶然の確率5%未満　🟡 10%未満　多重比較の補正：ベンジャミニ・ホッホベルグ法（FDR 5%）", "✅ chance < 5%  🟡 < 10%  Multiple-testing correction: Benjamini–Hochberg (FDR 5%)")}</p></details>`;
}

async function shareCard() {
  const p = places[0], near = p.dist <= 40, s = near ? p.st.series : p.cell.series;
  const a = k => mean(s[k].slice(0, 10)), b = k => mean(s[k].slice(-10));
  const W = 1080, H = 1080, cv = document.createElement("canvas"); cv.width = W; cv.height = H; const g = cv.getContext("2d");
  g.fillStyle = "#f5f8fc"; g.fillRect(0, 0, W, H); g.fillStyle = "#2c74d4"; g.fillRect(0, 0, 36, H);
  g.fillStyle = "#10233f"; g.font = "900 64px 'Noto Sans JP'"; g.fillText(p.label, 90, 150);
  g.font = "700 34px 'Noto Sans JP'"; g.fillStyle = "#2c74d4"; g.fillText(T("わが街の雪質カルテ　1990年代 → 2020年代", "My Town Snow-Quality Chart · 1990s → 2020s"), 90, 215);
  const rows = [["💧", T("重い雪の日", "Heavy-snow days"), "heavy", "#c2410c"], ["❄️", T("パウダーの日", "Powder days"), "powder", "#2c74d4"], ["🧊", T("つるつる路面の日", "Icy-road days"), "icy", "#0e7490"]];
  rows.forEach(([ic, lab, k, col], i) => {
    const y = 360 + i * 190; g.fillStyle = "#ffffff"; g.fillRect(90, y - 90, 900, 160); g.strokeStyle = "#d6e2f1"; g.strokeRect(90, y - 90, 900, 160);
    g.fillStyle = "#10233f"; g.font = "700 40px 'Noto Sans JP'"; g.fillText(`${ic} ${lab}`, 120, y - 25);
    g.font = "900 64px 'Noto Sans JP'"; g.fillStyle = col; g.fillText(`${fmt(a(k), 0)} → ${fmt(b(k), 0)}${T("日", " days")}`, 120, y + 50);
  });
  g.fillStyle = "#4b6385"; g.font = "400 28px 'Noto Sans JP'";
  g.fillText(T(`データ：NASA POWER・JAXA GSMaP・気象庁${near ? p.st.ja : ""}（冬＝12〜3月）`, `Data: NASA POWER, JAXA GSMaP, JMA ${near ? p.st.en : ""} (winter = Dec–Mar)`), 90, 960);
  g.fillText("Snow Trend Detective · NASA Space Apps 2026", 90, 1010);
  const blob = await new Promise(r => cv.toBlob(r, "image/png")); const file = new File([blob], "snow-karte.png", { type: "image/png" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: "わが街の雪質カルテ" }); return; } catch (e) {} }
  const u = URL.createObjectURL(blob), l = document.createElement("a"); l.href = u; l.download = "snow-karte.png"; l.click(); setTimeout(() => URL.revokeObjectURL(u), 2000);
}

function renderFalls() {
  const F = D.falls, sap = D.stations.find(s => s.en === "Sapporo"), last = F.transports.length - 1, lk = F.link.heavy;
  const heavy = F.winters.map(w => { const i = D.winters.indexOf(w); return i < 0 ? null : sap.series.heavy[i]; });
  if (fallChart) fallChart.destroy();
  fallChart = new Chart(document.getElementById("fallChart"), { data: { labels: F.winters, datasets: [
    { type: "bar", label: T("転倒による救急搬送（12〜3月、人）", "Fall-injury ambulance transports (Dec–Mar)"), data: F.transports, backgroundColor: css("--gray") + "88", yAxisID: "y" },
    { type: "line", label: T("札幌の重い雪の日（日）", "Heavy-snow days in Sapporo"), data: heavy, borderColor: css("--heavy"), pointRadius: 0, borderWidth: 2, tension: .25, yAxisID: "y2" }] },
    options: { animation: false, maintainAspectRatio: false, plugins: { legend: { labels: { boxWidth: 10, font: { size: 11 }, color: css("--muted") } } },
      scales: { x: { ticks: { maxTicksLimit: 6, color: css("--muted") }, grid: { display: false } }, y: { beginAtZero: true, ticks: { color: css("--muted"), maxTicksLimit: 4 } },
        y2: { position: "right", beginAtZero: true, grid: { display: false }, ticks: { color: css("--heavy"), maxTicksLimit: 4 } } } } });
  document.getElementById("fallText").innerHTML = [
    T(`札幌では、雪道で転んで救急車で運ばれた人が${F.winters[last]}年の冬（12〜3月）に<b>${F.transports[last].toLocaleString()}人</b>で、記録のある中で最多でした。35年で10年あたり約${fmt(F.trend.slope10, 0)}人のペースで増えています（高齢化も理由の一つと考えられます）。`,
      `In Sapporo, <b>${F.transports[last].toLocaleString()} people</b> were taken to hospital by ambulance after falling on winter roads in winter ${F.winters[last]} (Dec–Mar), the most on record — up about ${fmt(F.trend.slope10, 0)} per decade over 35 years (an ageing population is likely one reason).`),
    T("転倒が特に多かった日（35冬の上位6日、例：2014年12月21日は1日163人）の多くは、<b>水を多く含んだ湿った雪や雨が、そのあと凍った日</b>でした。これは、このアプリの「重い雪の日」と同じ条件です。",
      "The worst days (top 6 in 35 winters, e.g. 163 people on 21 Dec 2014) mostly came when <b>wet, heavy snow or rain froze afterwards</b> — the same conditions as this app's “heavy-snow days”."),
    T(`前の冬より重い雪の日が増えた冬は、搬送も増える傾向がありました（年ごとの増減の相関 r=${fmt(lk.r_change, 2)}、p=${fmt(lk.p_change, 3)}、${lk.n}冬）。ただし関係は強くなく、原因と言い切ることはできません。`,
      `Winters with more heavy-snow days than the year before tended to have more transports (correlation of year-to-year changes r = ${fmt(lk.r_change, 2)}, p = ${fmt(lk.p_change, 3)}, ${lk.n} winters). The link is modest and does not prove cause.`),
  ].map(x => `<li>${x}</li>`).join("");
}

function renderAbout() {
  document.getElementById("about").innerHTML = [
    T("期間：1992〜2026年の冬（前年12月〜3月、1月の年で表示）", "Period: winters 1992–2026 (Dec–Mar, labelled by January)"),
    T("雪質の目安：雪の日（気象庁は降雪1cm以上、NASAは降雪1mm（水換算）以上）の日平均気温が−5℃以下ならパウダー、−2℃より暖かければ重い雪", "Snow quality rule of thumb: on a snow day (JMA ≥ 1 cm snowfall, NASA ≥ 1 mm water equivalent), daily mean ≤ −5 °C = powder, > −2 °C = heavy"),
    T("NASA POWER 日別データ（MERRA-2）：気温・降雪・降水・風", "NASA POWER daily (MERRA-2): temperature, snowfall, precipitation, wind"),
    T("NASA MODIS（Terra）月平均の雪のおおわれ方（NASA GIBS地図タイルを公式カラーマップで％に戻して集計）：12月・2月・4月、2001〜2026年", "NASA MODIS (Terra) monthly snow cover (NASA GIBS tiles turned back into % with the official colour map): Dec, Feb, Apr, 2001–2026"),
    T("JAXA GSMaP 月別衛星降水（JAXA Earth API）：冬の降水量の傾向を確認", "JAXA GSMaP monthly satellite precipitation (JAXA Earth API): cross-check of winter precipitation"),
    T("気象庁 過去の気象データ：北海道10観測所の日別値（降雪・最深積雪・気温・風速）", "JMA historical data: daily values at 10 Hokkaido stations (snowfall, snow depth, temperature, wind)"),
    T("体感温度：気温と平均風速から風冷指数（カナダ気象局の式）で計算した目安", "Feels-like: wind-chill index (Environment Canada formula) from temperature and mean wind, as a rough guide"),
    T("雪道の転倒による救急搬送：札幌市消防局のデータ（ウインターライフ推進協議会 tsurutsuru.jp）", "Fall-injury ambulance transports: Sapporo City Fire Bureau data (Winter Life Promotion Council, tsurutsuru.jp)"),
    T("確かめ：多くのマスを同時に検定するため、ベンジャミニ・ホッホベルグ法（FDR）と、冬の順番をシャッフルする検定（500回）で偶然かどうかを確認", "Checks: many cells are tested at once, so we use Benjamini–Hochberg FDR and a 500-run shuffle test of winter order"),
    T("住所検索：国土地理院 / 地図：国土地理院タイル", "Address search and map tiles: Geospatial Information Authority of Japan"),
  ].map(x => `<li>${x}</li>`).join("");
}

async function geocode(q) {
  const r = await fetch("https://msearch.gsi.go.jp/address-search/AddressSearch?q=" + encodeURIComponent(q));
  const j = await r.json();
  if (!j.length) { alert(T("見つかりませんでした", "Not found")); return; }
  const [lo, la] = j[0].geometry.coordinates;
  if (la < 41.2 || la > 45.7 || lo < 139.3 || lo > 146) { alert(T("北海道内の場所を選んでください", "Please choose a place in Hokkaido")); return; }
  choose(la, lo, j[0].properties.title);
}

async function init() {
  D = await (await fetch("data.json")).json();
  const tiles = () => L.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png", { maxZoom: 14, attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>' });
  map = L.map("map", { scrollWheelZoom: false }).setView([43.4, 142.6], 6); tiles().addTo(map);
  map.on("click", e => choose(e.latlng.lat, e.latlng.lng));
  SATLUT = new Map(D.modis_lut.map(([r, g, b, v]) => [(r << 16) | (g << 8) | b, v]));
  satMap = L.map("satmap", { scrollWheelZoom: false }).setView([43.4, 142.8], 6); tiles().addTo(satMap);
  document.querySelectorAll("#satChips .chip").forEach(b => (b.onclick = () => { satMonth = b.dataset.m; document.querySelectorAll("#satChips .chip").forEach(x => x.classList.toggle("on", x === b)); renderSat(); }));
  map2 = L.map("map2", { scrollWheelZoom: false }).setView([43.4, 142.8], 6); tiles().addTo(map2);
  document.getElementById("shareBtn").onclick = shareCard;
  document.getElementById("lang").onclick = () => { LANG = LANG === "ja" ? "en" : "ja"; applyLang(); };
  document.getElementById("search").onsubmit = e => { e.preventDefault(); const q = document.getElementById("q").value.trim(); if (q) geocode(q); };
  document.getElementById("gps").onclick = () => navigator.geolocation ? navigator.geolocation.getCurrentPosition(
    p => { const { latitude: la, longitude: lo } = p.coords; if (la < 41.2 || la > 45.7 || lo < 139.3 || lo > 146) { alert(T("現在地が北海道の外です。地図か住所で選んでください。", "You are outside Hokkaido. Please pick on the map or search.")); return; } choose(la, lo, T("現在地", "My location")); },
    () => alert(T("位置情報を取得できませんでした", "Could not get your location"))) : null;
  const sl = document.getElementById("tmSlider");
  sl.oninput = () => { tmYear = +sl.value; if (places.length) render(); };
  document.querySelectorAll(".tm-ctl .chip").forEach(b => (b.onclick = () => { tmYear = +b.dataset.y; if (places.length) render(); }));
  applyLang();
  choose(QUICK[0][2], QUICK[0][3], T(QUICK[0][0], QUICK[0][1]));
  window.scrollTo(0, 0);
}
init();
