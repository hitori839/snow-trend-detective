"use strict";
let LANG = "ja", D = null, map, map2, layer2, markers = [], places = [], chartRefs = [], tmYear = 2024, layerKey = "heavy";
const T = (ja, en) => (LANG === "ja" ? ja : en);
const KEYS = {
  powder: { icon: "❄️", ja: "パウダーの日", en: "Powder days", sub_ja: "雪の日のうち、日平均気温 −5℃以下（軽く乾いた雪）", sub_en: "Snow days with daily mean ≤ −5 °C (light, dry snow)", unit: "日", unit_en: "days", color: "--powder" },
  heavy: { icon: "💧", ja: "重い雪の日", en: "Heavy-snow days", sub_ja: "雪の日のうち、日平均気温 −2℃より暖かい（水分が多い雪）", sub_en: "Snow days with daily mean > −2 °C (wet, heavy snow)", unit: "日", unit_en: "days", color: "--heavy" },
  icy: { icon: "🧊", ja: "つるつる路面の日", en: "Icy-road days", sub_ja: "最高気温0℃超・最低気温0℃未満（昼に溶けて夜に凍る）", sub_en: "Max > 0 °C and min < 0 °C (melts by day, refreezes at night)", unit: "日", unit_en: "days", color: "--icy" },
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
  renderAbout(); renderFacts(); renderLayerChips(); drawMap2();
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

function cardHTML(k, p, idx) {
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

function tipsHTML(p) {
  const near = p.dist <= 40, t = k => (near ? p.st.trend[k] : p.cell.trend[k]) || { slope10: 0, p: 1 };
  const L = [];
  if (t("heavy").slope10 > 0) L.push(T("重い雪の日が増える方向です。屋根の雪下ろしは早めに、湿った雪による倒木・停電にも備えましょう。", "Heavy-snow days are rising: clear roofs early and prepare for fallen trees and power cuts from wet snow."));
  if (t("icy").slope10 > 0) L.push(T("つるつる路面の日が増える方向です。滑り止め付きの靴や砂まきを用意しましょう。", "Icy-road days are rising: use anti-slip shoes and grit."));
  if (t("icy").slope10 < 0) L.push(T("つるつる路面の日は減る方向ですが、0℃前後の朝は引き続き注意が必要です。", "Icy-road days are falling, but mornings around 0 °C still need care."));
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
  const keys = ["powder", "heavy", "icy", "share"];
  document.getElementById("cards").innerHTML = keys.map((k, i) => cardHTML(k, p, i)).join("");
  keys.forEach((k, i) => drawChart("c" + i, p, k, p2));
  document.getElementById("tmYear").textContent = tmYear;
  document.getElementById("tmSlider").value = tmYear;
  document.getElementById("tm").innerHTML = tmHTML(p, tmYear) + (p2 ? tmHTML(p2, tmYear).split('<div class="tmc">').slice(0, 2).join('<div class="tmc">') : "");
  document.getElementById("tips").innerHTML = tipsHTML(p);
  document.getElementById("trust").innerHTML = trustHTML(p);
}

function renderLayerChips() {
  const el = document.getElementById("layerChips");
  el.innerHTML = ["heavy", "powder", "icy", "share"].map(k => `<button class="chip ${k === layerKey ? "on" : ""}" data-k="${k}">${KEYS[k].icon} ${T(KEYS[k].ja, KEYS[k].en)}</button>`).join("");
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
  const max = layerKey === "share" ? 6 : 4;
  D.cells.forEach(c => {
    const t = c.trend[layerKey]; if (!t) return;
    L.rectangle([[c.lat - .25, c.lon - .25], [c.lat + .25, c.lon + .25]], { weight: t.p < 0.05 ? 2.5 : 0.5, color: t.p < 0.05 ? css("--ink") : "#ffffff", fillColor: color(t.slope10, max), fillOpacity: 1 })
      .bindTooltip(`NASA ${c.lat}°N ${c.lon}°E<br>${T(KEYS[layerKey].ja, KEYS[layerKey].en)}: ${fmt(t.slope10)}${T(KEYS[layerKey].unit, KEYS[layerKey].unit_en)}/${T("10年", "decade")} (p=${fmt(t.p, 2)})`).addTo(layer2)
      .on("click", () => choose(c.lat, c.lon, T(`北緯${c.lat}° 東経${c.lon}°`, `${c.lat}°N ${c.lon}°E`)));
  });
  D.stations.forEach(s => {
    const t = s.trend[layerKey]; if (!t) return;
    L.circleMarker([s.lat, s.lon], { radius: 9, weight: t.p < 0.05 ? 3 : 1.5, color: css("--ink"), fillColor: color(t.slope10, max), fillOpacity: 1 })
      .bindTooltip(`${T("気象庁", "JMA")} ${T(s.ja, s.en)}<br>${fmt(t.slope10)}${T(KEYS[layerKey].unit, KEYS[layerKey].unit_en)}/${T("10年", "decade")} (p=${fmt(t.p, 2)})`).addTo(layer2)
      .on("click", () => choose(s.lat, s.lon, T(s.ja, s.en)));
  });
  document.getElementById("legend").textContent = T("色：赤＝増えた、青＝減った（濃いほど大きい）。太い枠＝統計的に有意（p<0.05）。四角＝NASAの約50kmマス、丸＝気象庁の観測所。", "Colour: red = increased, blue = decreased (darker = larger). Thick outline = significant (p < 0.05). Squares = NASA ~50 km cells, circles = JMA stations.");
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
    ["p", `${pUp}/${cp.length}`, T(`NASAのマスで「パウダーの日」が増えた数（有意に減ったマスは${pDown}）`, `NASA cells where powder days rose (${pDown} significant falls)`)],
  ].map(([c, b, t]) => `<div class="fact ${c}"><b>${b}</b><span>${t}</span></div>`).join("");
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

function renderAbout() {
  document.getElementById("about").innerHTML = [
    T("期間：1992〜2026年の冬（前年12月〜3月、1月の年で表示）", "Period: winters 1992–2026 (Dec–Mar, labelled by January)"),
    T("雪質の目安：雪の日（気象庁は降雪1cm以上、NASAは降雪1mm（水換算）以上）の日平均気温が−5℃以下ならパウダー、−2℃より暖かければ重い雪", "Snow quality rule of thumb: on a snow day (JMA ≥ 1 cm snowfall, NASA ≥ 1 mm water equivalent), daily mean ≤ −5 °C = powder, > −2 °C = heavy"),
    T("NASA POWER 日別データ（MERRA-2）：気温・降雪・降水・風", "NASA POWER daily (MERRA-2): temperature, snowfall, precipitation, wind"),
    T("JAXA GSMaP 月別衛星降水（JAXA Earth API）：冬の降水量の傾向を確認", "JAXA GSMaP monthly satellite precipitation (JAXA Earth API): cross-check of winter precipitation"),
    T("気象庁 過去の気象データ：北海道10観測所の日別値（降雪・最深積雪・気温・風速）", "JMA historical data: daily values at 10 Hokkaido stations (snowfall, snow depth, temperature, wind)"),
    T("体感温度：気温と平均風速から風冷指数（カナダ気象局の式）で計算した目安", "Feels-like: wind-chill index (Environment Canada formula) from temperature and mean wind, as a rough guide"),
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
  map2 = L.map("map2", { scrollWheelZoom: false }).setView([43.4, 142.8], 6); tiles().addTo(map2);
  document.getElementById("shareBtn").onclick = shareCard;
  document.getElementById("lang").onclick = () => { LANG = LANG === "ja" ? "en" : "ja"; applyLang(); };
  document.getElementById("search").onsubmit = e => { e.preventDefault(); const q = document.getElementById("q").value.trim(); if (q) geocode(q); };
  document.getElementById("gps").onclick = () => navigator.geolocation ? navigator.geolocation.getCurrentPosition(
    p => { const { latitude: la, longitude: lo } = p.coords; if (la < 41.2 || la > 45.7 || lo < 139.3 || lo > 146) { alert(T("現在地が北海道の外です。地図か住所で選んでください。", "You are outside Hokkaido. Please pick on the map or search.")); return; } choose(la, lo, T("現在地", "My location")); },
    () => alert(T("位置情報を取得できませんでした", "Could not get your location"))) : null;
  const sl = document.getElementById("tmSlider");
  sl.oninput = () => { tmYear = +sl.value; if (places.length) render(); };
  document.querySelectorAll(".tm .chip").forEach(b => (b.onclick = () => { tmYear = +b.dataset.y; if (places.length) render(); }));
  applyLang();
  choose(QUICK[0][2], QUICK[0][3], T(QUICK[0][0], QUICK[0][1]));
  window.scrollTo(0, 0);
}
init();
