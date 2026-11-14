"use strict";
let fallChart = null, FC = null, fcKey = "", TL = 32, whyCharts = [];
const TL_FUT = [2030, 2035, 2040, 2045, 2050];   // timeline: 0..34 = winters 1992..2026, 35 = next 7 days, 36..40 = trend to 2030..2050
let satMap, satLayer, satMonth = "04", SATLUT = null;
let LANG = "ja", D = null, map, map2, layer2, markers = [], places = [], chartRefs = [], tmYear = 2024, layerKey = "heavy";
const T = (ja, en, ko) => (LANG === "ja" ? ja : LANG === "ko" ? (ko ?? en) : en);
const SIDE = {
  home: [["北海道の軽い雪は、重い雪に変わりつつあるのか？", "Is Hokkaido's light, dry snow turning into heavy snow?", "홋카이도의 가벼운 눈은 무거운 눈으로 바뀌고 있을까?"],
    ["北海道の雪は、重くなる方向に動いている。", "Hokkaido's snow is moving toward heavier snow.", "홋카이도의 눈은 무거워지는 쪽으로 움직이고 있다."],
    ["35回の冬（1992〜2026年）の雪の日を一日ずつ数え、NASA・JAXA・気象庁のデータがそろったときだけ「確か」と言う、街ごとの雪質カルテ。", "We counted every snow day of 35 winters (1992–2026) and only say “certain” when NASA, JAXA and JMA data agree — a snow-quality chart for your town.", "35번의 겨울(1992~2026년) 동안 눈 온 날을 하루씩 세고, NASA·JAXA·기상청 자료가 맞아떨어질 때만 「확실」이라고 말하는 동네별 눈 품질 카르테."]],
  karte: [["雪質カルテ", "Snow-quality chart", "눈 품질 카르테"], ["あなたの街の、雪の35年。", "Your town's 35 winters of snow.", "우리 동네 눈의 35년."],
    ["北海道全体で確かめられた5つの変化を、あなたの街の数字と「だから何をするか」で見ます。", "Five changes confirmed across Hokkaido, shown with your town's numbers and what to do about them.", "홋카이도 전체에서 확인된 5가지 변화를, 우리 동네 숫자와 '그래서 무엇을 할지'로 봅니다."]],
  time: [["雪の年表", "Snow timeline", "눈의 연표"], ["1992年から、明日、そして2050年へ。", "From 1992 to tomorrow, and on to 2050.", "1992년에서 내일, 그리고 2050년으로."],
    ["ひとつのスライダーで、あの冬の雪（観測）、この先7日（予報）、今の傾きがつづいた未来（推定）をたどります。", "One slider: past winters (observed), the next 7 days (forecast) and a future that continues today's trend (estimate).", "슬라이더 하나로 그 겨울의 눈(관측), 앞으로 7일(예보), 지금 추세가 이어진 미래(추정)를 따라갑니다."]],
  why: [["なぜ・どこで", "Why & where", "왜·어디서"], ["何が雪を重くし、次はどこが変わるのか。", "What made the snow heavier, and where it changes next.", "무엇이 눈을 무겁게 했고, 다음은 어디가 바뀌나."],
    ["気温と水分で原因を分け、変わりやすい場所を北海道と世界で探します。わからないことも、そのまま書きます。", "We split the cause into warming and moisture, and look for the places most likely to change, in Hokkaido and worldwide. What we cannot say, we say too.", "기온과 수분으로 원인을 나누고, 바뀌기 쉬운 곳을 홋카이도와 세계에서 찾습니다. 모르는 것도 그대로 적습니다."]],
};
let VIEW = "home";
const STKO = { Sapporo: "삿포로", Asahikawa: "아사히카와", Obihiro: "오비히로", Kushiro: "구시로", Hakodate: "하코다테", Wakkanai: "왓카나이", Abashiri: "아바시리", Muroran: "무로란", "Kutchan (Niseko)": "굿찬 (니세코)", Iwamizawa: "이와미자와" };
const KEYS = {
  powder: { icon: "❄️", ja: "軽い雪の日", en: "Light-snow days", sub_ja: "雪の日のうち、日平均気温 −5℃以下（軽く乾いた雪）", sub_en: "Snow days with daily mean ≤ −5 °C (light, dry snow)", ko: "가벼운 눈의 날", sub_ko: "눈 온 날 중 일평균 기온 −5℃ 이하 (가볍고 마른 눈)", unit_ko: "일", unit: "日", unit_en: " days", color: "--powder" },
  heavy: { icon: "💧", ja: "重い雪の日", en: "Heavy-snow days", sub_ja: "雪の日のうち、日平均気温 −2℃より暖かい（水分が多い雪）", sub_en: "Snow days with daily mean > −2 °C (wet, heavy snow)", ko: "무거운 눈의 날", sub_ko: "눈 온 날 중 일평균 기온 −2℃보다 따뜻함 (물기 많은 눈)", unit_ko: "일", unit: "日", unit_en: " days", color: "--heavy" },
  icy: { icon: "🧊", ja: "つるつる路面の日", en: "Icy-road days", sub_ja: "最高気温0℃超・最低気温0℃未満（昼に溶けて夜に凍る）", sub_en: "Max > 0 °C and min < 0 °C (melts by day, refreezes at night)", ko: "빙판길 날", sub_ko: "최고 기온 0℃ 초과·최저 기온 0℃ 미만 (낮에 녹고 밤에 얼어요)", unit_ko: "일", unit: "日", unit_en: " days", color: "--icy" },
  spring: { icon: "🛰️", ja: "4月に残る雪（衛星）", en: "April snow cover (satellite)", sub_ja: "NASA MODIS衛星で見た、4月に雪でおおわれた土地の割合（2001〜2026年）", sub_en: "Share of land under snow in April, seen by NASA's MODIS satellite (2001–2026)", ko: "4월에 남는 눈 (위성)", sub_ko: "NASA MODIS 위성으로 본, 4월에 눈으로 덮인 땅의 비율 (2001~2026년)", unit_ko: "%", unit: "%", unit_en: "%", color: "--blue", sat: "cov_apr" },
  dens: { icon: "⚖️", ja: "雪の軽さ（水1mmで積もる雪）", en: "Snow fluffiness (cm of snow per mm of water)", ko: "눈의 가벼움 (물 1mm로 쌓이는 눈)", sub_ja: "同じ1mmの水（JAXA衛星の降水）で、何cmの雪が積もったか（気象庁の降雪）。小さくなるほど、重く湿った雪。2001〜2026年", sub_en: "How many cm of snow (JMA snowfall) fell per mm of water (JAXA satellite precipitation). Smaller = denser, heavier snow. 2001–2026", sub_ko: "같은 물 1mm(JAXA 위성 강수)로 눈이 몇 cm 쌓였는지(기상청 강설). 작아질수록 무겁고 젖은 눈. 2001~2026년", unit: "cm/mm", unit_en: " cm/mm", unit_ko: "cm/mm", color: "--heavy", sat: "slr", stOnly: true, down: true, d: 2 },
  storm: { icon: "💥", ja: "重い大雪・大雨の日（JAXA衛星）", en: "Wet heavy-storm days (JAXA satellite)", ko: "무거운 폭설·폭우 날 (JAXA 위성)", sub_ja: "JAXA衛星の降水が1日10mm以上で、日平均気温が−2℃より暖かい日（2001〜2026年、最寄りの観測所）", sub_en: "Days with ≥ 10 mm of JAXA satellite precipitation and a daily mean warmer than −2 °C (2001–2026, nearest station)", sub_ko: "JAXA 위성 강수가 하루 10mm 이상이고 일평균 기온이 −2℃보다 따뜻한 날 (2001~2026년, 가장 가까운 관측소)", unit: "日", unit_en: " days", unit_ko: "일", color: "--heavy", sat: "storm_wet", stOnly: true },
  share: { icon: "📊", ja: "雪のうち軽い雪の割合", en: "Share of light snow", sub_ja: "雪の日全体に占める軽い雪の日の割合", sub_en: "Light-snow days as a share of all snow days", ko: "눈 중 가벼운 눈 비율", sub_ko: "눈 온 날 전체 중 가벼운 눈의 날 비율", unit_ko: "%", unit: "%", unit_en: "%", color: "--powder" },
};
// What to DO with each robust finding (who uses it and how)
const ACT = {
  dens: ["同じ雪の量でも屋根や木にかかる重さは増えます。雪下ろし・除雪は「深さ」だけでなく「重さ」で判断を。", "The same depth of snow now weighs more on roofs and trees: judge roof clearing and snow removal by weight, not only depth.", "같은 깊이의 눈이라도 지붕·나무에 걸리는 무게는 늘어납니다. 지붕 눈 치우기·제설은 '깊이'만이 아니라 '무게'로 판단을."],
  heavy: ["屋根の雪下ろしは早めに。重い雪は倒木・停電・除雪の負担を増やすので、市は排雪や人手の計画を見直す目安に。", "Clear roofs early. Wet snow brings fallen trees, power cuts and heavier snow removal — a cue for the city to re-plan snow hauling and crews.", "지붕 눈은 일찍 치우세요. 무거운 눈은 나무 쓰러짐·정전·제설 부담을 늘리므로, 시는 배설(눈 운반)·인력 계획을 다시 보는 기준으로."],
  storm: ["湿った大雪・大雨の日は、屋根・電線・道路が一気に危なくなります。下の⚠️予報と合わせて、前の日に備えを。", "Wet heavy storms make roofs, power lines and roads dangerous at once — pair this with the ⚠️ forecast and prepare the day before.", "젖은 폭설·폭우 날에는 지붕·전선·도로가 한꺼번에 위험해집니다. ⚠️ 예보와 함께 전날 대비하세요."],
  icy: ["滑り止めの靴と砂まきを。市は転倒が多い地下鉄駅や繁華街から砂箱・ロードヒーティングを優先する根拠に。", "Anti-slip shoes and grit. For the city: evidence to prioritise grit boxes and road heating around subway stations and busy streets, where falls cluster.", "미끄럼 방지 신발과 모래를. 시는 낙상이 많은 지하철역·번화가부터 모래함·도로 열선을 우선하는 근거로."],
  spring: ["春スキーやイベントは「雪どけが早まる」前提で計画を。雪解け水（水資源・川の増水）の時期の見直しにも。", "Plan spring skiing and events assuming an earlier melt; also rethink the timing of meltwater for water supply and river levels.", "봄 스키·행사는 '눈이 일찍 녹는다'는 전제로 계획하세요. 눈 녹은 물(수자원·하천 수위) 시기 재검토에도."],
};
const QUICK = [["札幌", "Sapporo", 43.06, 141.33, "삿포로"], ["ニセコ（倶知安）", "Niseko (Kutchan)", 42.90, 140.76, "니세코 (굿찬)"], ["旭川", "Asahikawa", 43.76, 142.37, "아사히카와"], ["函館", "Hakodate", 41.82, 140.75, "하코다테"], ["釧路", "Kushiro", 42.98, 144.38, "구시로"], ["網走", "Abashiri", 44.02, 144.28, "아바시리"]];

const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const km = (a, b, c, d) => { const R = 6371, r = Math.PI / 180, x = (d - b) * r * Math.cos((a + c) / 2 * r), y = (c - a) * r; return Math.sqrt(x * x + y * y) * R; };
const mean = a => { const v = a.filter(x => x != null); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
const fmt = (x, d = 1) => (x == null ? "–" : (Math.round(x * 10 ** d) / 10 ** d).toString());

function applyLang() {
  document.documentElement.lang = LANG;
  const cap = LANG[0].toUpperCase() + LANG.slice(1);
  document.querySelectorAll("[data-ja]").forEach(e => (e.textContent = e.dataset[LANG] ?? e.dataset.en));
  document.querySelectorAll("[data-html-ja]").forEach(e => (e.innerHTML = e.dataset["html" + cap] ?? e.dataset.htmlEn));
  document.querySelectorAll("[data-ph-ja]").forEach(e => (e.placeholder = e.dataset["ph" + cap] ?? e.dataset.phEn));
  document.querySelectorAll("#lang button").forEach(b => b.classList.toggle("on", b.dataset.l === LANG));
  try { localStorage.setItem("lang", LANG); } catch (e) {}
  document.getElementById("quick").innerHTML = QUICK.map((q, i) => `<button class="chip" data-i="${i}">${T(q[0], q[1], q[4])}</button>`).join("");
  document.querySelectorAll("#quick .chip").forEach(b => (b.onclick = () => { const q = QUICK[+b.dataset.i]; choose(q[2], q[3], null, { q: +b.dataset.i }); }));
  renderSide();
  renderAbout(); renderFacts(); renderFalls(); renderLayerChips(); drawMap2();
  places.forEach(q => q.geo && !q.geo[LANG] && reverseName(q));
  if (places.length) { render(); renderForecast(); }
}

// =====================================================================
// Home hero: 3D Earth (NASA Blue Marble) + HUD. Hokkaido cells coloured by the heavy-snow trend;
// clicking anywhere on Earth picks that place (world mode outside Hokkaido).
// =====================================================================
const TEX = "https://cdn.jsdelivr.net/npm/three-globe@2.31.1/example/img/";
function initGlobe() {
  const el = document.getElementById("globe");
  if (!el || !window.Globe) return;
  let G;
  try { G = Globe()(el); } catch (e) { el.innerHTML = ""; return; }   // no WebGL: the HUD still works
  G.globeImageUrl(TEX + "earth-blue-marble.jpg").bumpImageUrl(TEX + "earth-topology.png").backgroundColor("rgba(0,0,0,0)")
    .showAtmosphere(true).atmosphereColor("#9cc8ff").atmosphereAltitude(0.16)
    .onGlobeClick(({ lat, lng }) => choose(lat, lng))
    // soft glow on the chosen place only: slow, wide, fading aurora-mint rings
    .ringColor(() => t => `rgba(126,240,196,${0.85 * (1 - t) * (1 - t)})`).ringMaxRadius(4.5).ringPropagationSpeed(0.9).ringRepeatPeriod(1600).ringAltitude(0.003)
    .htmlElementsData([]).htmlElement(d => { const e = document.createElement("div"); e.className = "gdot"; e.title = d.label; return e; });
  const size = () => G.width(el.clientWidth).height(el.clientHeight);
  size(); window.addEventListener("resize", size);
  const ctl = G.controls(); ctl.autoRotate = true; ctl.autoRotateSpeed = 0.45; ctl.enableZoom = true; ctl.minDistance = 140; ctl.maxDistance = 600;
  G.pointOfView({ lat: 25, lng: 120, altitude: 2.5 });
  setTimeout(() => { ctl.autoRotate = false; G.pointOfView({ lat: 41.5, lng: 142.5, altitude: 1.25 }, 2600); }, 1600);
  el.addEventListener("pointerdown", () => (ctl.autoRotate = false));
  window.GLOBE = G; globeMark();
}
function globeMark() {
  if (!window.GLOBE) return;
  window.GLOBE.ringsData(places.map(q => ({ lat: q.la, lng: q.lo })));
  window.GLOBE.htmlElementsData(places.map(q => ({ lat: q.la, lng: q.lo, label: placeLabel(q) })));
}
function renderHud() {
  const hp = document.getElementById("hudPlace"); if (hp && places[0]) hp.textContent = placeLabel(places[0]);
  const C = D.cause, F = D.field, st = D.stations, slr = st.map(x => x.trend.slr).filter(Boolean);
  const rows = [
    [T("重い雪の日（気象庁）", "Heavy-snow days (JMA)", "무거운 눈의 날 (기상청)"), `${st.filter(x => x.trend.heavy && x.trend.heavy.slope10 > 0).length}/${st.length} ↑`],
    [T("水1mmで積もる雪", "Snow per mm of water", "물 1mm로 쌓이는 눈"), `${slr.filter(t => t.slope10 < 0).length}/${slr.length} ↓`],
    [T("重い大雪・大雨（JAXA）", "Wet heavy storms (JAXA)", "무거운 폭설·폭우 (JAXA)"), `${stormUp()}/10 ↑`],
    [T("4月の雪（NASA MODIS）", "April snow (NASA MODIS)", "4월 눈 (NASA MODIS)"), `${fmt(D.hokkaido.trend.cov_apr.slope10, 1)} pt/10y`],
    [T("冬の気温（NASA）", "Winter temperature (NASA)", "겨울 기온 (NASA)"), `+${fmt(C.hok_trend.slope10, 2)} °C/10y`],
    [T("気温＋水分で説明", "Warming + moisture explain", "기온+수분으로 설명"), `${fmt(C.explained_share * 100, 0)} + ${fmt((C.explained_share_tp - C.explained_share) * 100, 0)} %`],
    [T("偶然の確率（重い雪）", "Chance level (heavy snow)", "우연일 확률 (무거운 눈)"), `${fmt(F.heavy.p_field * 100, 1)} %`],
  ];
  document.getElementById("hudStats").innerHTML = rows.map(([a, b]) => `<li><span>${a}</span><b>${b}</b></li>`).join("");
  // small line: Hokkaido winter temperature, 1992–2026
  const t = C.hok_temp.filter(v => v != null), lo = Math.min(...t), hi = Math.max(...t);
  const pts = C.hok_temp.map((v, i) => v == null ? null : `${(i / (C.hok_temp.length - 1) * 200).toFixed(1)},${(38 - (v - lo) / (hi - lo) * 34).toFixed(1)}`).filter(Boolean).join(" ");
  document.getElementById("hudWave").innerHTML = `<polyline points="${pts}" fill="none" stroke="#7ef0c4" stroke-width="1.4"/><line x1="0" y1="40" x2="200" y2="40" stroke="rgba(255,255,255,.2)"/>`;
  document.getElementById("hudBr").innerHTML = `${T("冬の平均気温", "Winter mean temperature", "겨울 평균기온")}<br><b>${fmt(mean(C.hok_temp.slice(0, 10)), 1)} → ${fmt(mean(C.hok_temp.slice(-10)), 1)} °C</b>`;
}
function tickClock() { const c = document.getElementById("clock"); if (c) c.textContent = new Date().toISOString().slice(11, 19) + " UTC"; }

function renderSide() {
  const [a, h, l] = SIDE[VIEW] || SIDE.home;
  document.getElementById("sideAsk").textContent = T(...a);
  document.getElementById("sideH").textContent = T(...h);
  document.getElementById("sideLead").textContent = T(...l);
  document.getElementById("pAsk").textContent = T(...a); document.getElementById("pH").textContent = T(...h); document.getElementById("pLead").textContent = T(...l);
  if (D && places.length) renderHud();
}

// ---------- pages (hash routing) ----------
function route() {
  const v = (location.hash.match(/^#\/(\w+)/) || [])[1];
  VIEW = SIDE[v] ? v : v === "future" ? "time" : "home";
  if (v === "future") TL = 40;
  document.body.dataset.view = VIEW;
  document.querySelectorAll(".view").forEach(e => (e.hidden = e.dataset.view !== VIEW));
  document.querySelectorAll(".navlinks a").forEach(a => a.classList.toggle("on", a.dataset.v === VIEW));
  renderSide();
  if (!places.length) return;
  render();
  [map, map2, satMap].forEach(m => m && m.invalidateSize());
  if (VIEW === "home") renderFalls();
  if (VIEW === "why") renderWhy();
  const go = route.go; route.go = null;
  if (go) setTimeout(() => document.getElementById(go).scrollIntoView({ behavior: "smooth", block: "start" }), 30);
  else window.scrollTo(0, 0);
}

// ---------- place names: BigDataCloud client reverse geocoding (city · region · country) ----------
async function reverseName(p) {
  const lang = LANG; p.geo = p.geo || {};
  try {
    const r = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${p.la}&longitude=${p.lo}&localityLanguage=${lang}`);
    const j = await r.json();
    p.geo[lang] = j.countryName ? [j.city || j.locality, j.principalSubdivision, j.countryName].filter(Boolean).filter((x, i, arr) => arr.indexOf(x) === i).join(" · ")
      : (j.locality || T("海の上", "At sea", "바다 위")) + ` (${p.la.toFixed(2)}, ${p.lo.toFixed(2)})`;
  } catch (e) { p.geo[lang] = `${p.la.toFixed(2)}, ${p.lo.toFixed(2)}`; }
  if (places[0] && places[0].out) { if (places.includes(p)) render(); }
  else if (places.includes(p)) { renderPlaces(); renderEntries(places[0]); renderSummary(); markers.forEach((m, i) => m.setTooltipContent(placeLabel(places[i]))); }
}
function placeLabel(p) {
  if (p.q != null) { const q = QUICK[p.q]; return T(q[0], q[1], q[4]); }
  if (p.geo) return p.geo[LANG] || Object.values(p.geo)[0] || T("地名を読みこみ中…", "Finding place name…", "지명 불러오는 중…");
  return p.label;
}

function nearestCell(la, lo) { return D.cells.reduce((b, c) => (km(la, lo, c.lat, c.lon) < km(la, lo, b.lat, b.lon) ? c : b)); }
function nearestStation(la, lo) { return D.stations.reduce((b, s) => (km(la, lo, s.lat, s.lon) < km(la, lo, b.lat, b.lon) ? s : b)); }

function choose(la, lo, label, opt = {}) {
  const cmp = document.getElementById("cmpOn").checked;
  const st = nearestStation(la, lo), cell = nearestCell(la, lo);
  const p = { la, lo, label, q: opt.q, cell, st, dist: km(la, lo, st.lat, st.lon), out: km(la, lo, cell.lat, cell.lon) > 45 };
  if (label == null && opt.q == null) { p.geo = {}; reverseName(p); }
  if (cmp && places.length >= 1) places = [places[0], p]; else places = [p];
  markers.forEach(m => map.removeLayer(m));
  markers = places.map((q, i) => L.circleMarker([q.la, q.lo], { radius: 9, color: i ? css("--heavy") : css("--blue"), weight: 3, fillOpacity: .3 }).addTo(map).bindTooltip(placeLabel(q)));
  render(); loadForecast(places[0]);
  if (p.out) loadWorld(p).then(w => { p.world = w; if (places[0] === p) { render(); if (window.GLOBE) globeMark(); } }).catch(() => { p.world = { error: true }; if (places[0] === p) render(); });
  if (window.GLOBE) globeMark();
  if (D) renderHud();
  if (!cmp && VIEW === "home" && !opt.quiet) document.getElementById("places").scrollIntoView({ behavior: "smooth", block: "start" });
}

function verdict(g, n) {
  // g: ground (JMA) trend, n: NASA trend
  const sgn = t => (t && t.slope10 !== 0 ? Math.sign(t.slope10) : 0);
  if (!g) return n && n.p < 0.05 ? ["mid", T("NASAでは有意（近くに地上観測なし）", "Significant in NASA data (no nearby ground station)", "NASA 자료에서 유의 (가까운 지상 관측소 없음)")] : ["no", T("まだ言えない", "Not yet clear", "아직 말할 수 없음")];
  const same = sgn(g) !== 0 && sgn(g) === sgn(n);
  if (same && g.p < 0.05 && n.p < 0.05) return ["ok", T("✅ この街でも確か：NASAと地上観測がそろって有意", "✅ Certain here too: NASA and ground agree, both significant", "✅ 이 동네도 확실: NASA와 지상 관측 모두 유의")];
  if (same && Math.min(g.p, n.p) < 0.1) return ["mid", T("🟡 この街でも傾向あり：同じ向き、片方が有意", "🟡 Likely here too: same direction, one significant", "🟡 이 동네도 경향 있음: 같은 방향, 한쪽만 유의")];
  if (same) return ["no", T("⚪ この街だけではまだ言えない：同じ向きだが有意でない", "⚪ Not clear for this town alone: same direction, not significant", "⚪ 이 동네만으로는 아직 말할 수 없음: 같은 방향이지만 유의하지 않음")];
  if (sgn(g) === 0 || sgn(n) === 0) return ["no", T("⚪ この街だけではまだ言えない：片方は変化なし", "⚪ Not clear for this town alone: one source shows no change", "⚪ 이 동네만으로는 아직 말할 수 없음: 한쪽은 변화 없음"), "flat"];
  return ["no", T("⚪ この街だけではまだ言えない：地上とNASAで向きが逆", "⚪ Not clear for this town alone: ground and NASA point opposite ways", "⚪ 이 동네만으로는 아직 말할 수 없음: 지상과 NASA의 방향이 반대"), "opp"];
}

function satCardHTML(k, p, idx) {
  const K = KEYS[k], near = K.stOnly || p.dist <= 40, src = near ? p.st : p.cell, ser = src.series[K.sat], tr = src.trend[K.sat];
  const v = ser.filter(x => x != null), a = mean(v.slice(0, 10)), b = mean(ser.slice(-10)), u = K.stOnly ? T(K.unit, K.unit_en, K.unit_ko) : "%", dg = K.d ?? (K.stOnly ? 1 : 0), good = K.down ? b < a : b > a;
  const cls = tr && tr.p < 0.05 ? "ok" : tr && tr.p < 0.1 ? "mid" : "no";
  const txt = tr && tr.p < 0.05 ? T("✅ この街でも有意（衛星の26年分）", "✅ Significant here too (26 years of satellite data)", "✅ 이 동네에서도 유의 (위성 26년 자료)") : K.stOnly && good ? (K.down ? T("🟡 この街でも重くなる方向（まだ有意でない）", "🟡 Getting heavier here too, not yet significant", "🟡 이 동네도 무거워지는 방향 (아직 유의하지 않음)") : T("🟡 この街でも増える方向（まだ有意でない）", "🟡 Rising here too, not yet significant", "🟡 이 동네도 늘어나는 방향 (아직 유의하지 않음)")) : tr && tr.p < 0.1 ? T("🟡 この街でも傾向あり（p<0.1）", "🟡 Likely here too (p < 0.1)", "🟡 이 동네도 경향 있음 (p < 0.1)") : T("⚪ この街だけではまだ言えない", "⚪ Not clear for this town alone", "⚪ 이 동네만으로는 아직 말할 수 없음");
  const arrow = tr ? (tr.slope10 > 0 ? "↑" : tr.slope10 < 0 ? "↓" : "→") : "";
  const pTxt = tr ? " · p=" + fmt(tr.p, 2) : "";
  const foot = k === "dens"
    ? T(`気象庁${p.st.ja}（${fmt(p.dist, 0)}km）の降雪 ÷ JAXA衛星の降水` + pTxt + "。注意：衛星は雪の降水を少なめに見る傾向があり、気象庁の降雪は積雪計から計算した値です。", `JMA ${p.st.en} (${fmt(p.dist, 0)} km) snowfall ÷ JAXA satellite precipitation` + pTxt + ". Caveat: satellites tend to under-catch snowfall; JMA snowfall is derived from snow-depth sensors.", `기상청 ${STKO[p.st.en] || p.st.en}(${fmt(p.dist, 0)}km) 강설 ÷ JAXA 위성 강수` + pTxt + ". 주의: 위성은 눈 강수를 적게 잡는 경향이 있고, 기상청 강설은 적설계로 계산한 값입니다.")
    : K.stOnly
    ? T(`気象庁${p.st.ja}（${fmt(p.dist, 0)}km）の気温 × JAXA衛星の降水`, `JMA ${p.st.en} (${fmt(p.dist, 0)} km) temperature × JAXA satellite rain`, `기상청 ${STKO[p.st.en] || p.st.en}(${fmt(p.dist, 0)}km) 기온 × JAXA 위성 강수`) + pTxt + " · " + T(`10観測所中${stormUp()}か所で増加`, `rising at ${stormUp()} of 10 stations`, `관측소 10곳 중 ${stormUp()}곳에서 증가`)
    : (near ? T(`${p.st.ja}のまわり約20km四方`, `~20 km box around ${p.st.en}`, `${STKO[p.st.en] || p.st.en} 주변 약 20km 사방`) : T(`約50kmのマス（北緯${p.cell.lat}° 東経${p.cell.lon}°）`, `~50 km cell ${p.cell.lat}°N ${p.cell.lon}°E`, `약 50km 칸 (북위 ${p.cell.lat}° 동경 ${p.cell.lon}°)`)) + pTxt + ` · ${T("北海道全体", "All Hokkaido", "홋카이도 전체")} ${fmt(D.hokkaido.trend.cov_apr.slope10)}${T("ポイント/10年", " pts/decade", "%p/10년")} (p=${fmt(D.hokkaido.trend.cov_apr.p, 3)})`;
  return `<div class="card kc"><h3>${K.icon} ${T(K.ja, K.en, K.ko)}</h3><div class="sub">${T(K.sub_ja, K.sub_en, K.sub_ko)}</div>${regionHTML(k)}<div class="here mono">${T("この街", "This town", "이 동네")} · ${placeLabel(p)}</div>
  <div class="nums"><span>${T("2000年代", "2000s", "2000년대")} <b class="big">${fmt(a, dg)}</b>${u}</span><span>→ ${T("2020年代", "2020s", "2020년대")} <b class="big">${fmt(b, dg)}</b>${u}</span>
  <span class="arrow">${arrow} ${tr ? fmt(tr.slope10, dg) : "–"}${K.stOnly ? u : T("ポイント", " pts", "%p")}/${T("10年", "decade", "10년")}</span></div>
  <div class="cbox"><canvas id="c${idx}"></canvas></div><span class="badge ${cls} small">${txt}</span>${k === "dens" && a && b ? roofHTML(a, b) : ""}${actHTML(k)}
  <div class="cmpline">${foot}</div></div>`;
}
function stormUp() {
  const i0 = D.winters.indexOf(2001);
  return D.stations.filter(s => { const a = s.series.storm_wet.slice(i0); return mean(a.slice(-10)) > mean(a.slice(0, 10)); }).length;
}

function regionHTML(k) {
  const fk = KEYS[k].sat || k, F = D.field && D.field[fk];
  if (k === "dens") {
    const t = D.stations.map(x => x.trend.slr).filter(Boolean), dn = t.filter(x => x.slope10 < 0).length, sg = t.filter(x => x.slope10 < 0 && x.p < 0.05).length;
    return `<div class="region ok">✅ ${T(`北海道全体：${t.length}観測所中${dn}か所で、同じ水で積もる雪が減少（${sg}か所で有意）＝雪が重くなった`, `All Hokkaido: snow per mm of water fell at ${dn} of ${t.length} stations (${sg} significant) — the snow got heavier`, `홋카이도 전체: 관측소 ${t.length}곳 중 ${dn}곳에서 같은 물로 쌓이는 눈이 감소 (${sg}곳 유의) = 눈이 무거워짐`)}</div>`;
  }
  if (k === "storm") { const u = stormUp(); return `<div class="region ${u >= 8 ? "ok" : "no"}">${u >= 8 ? "✅ " : "⚪ "}${T(`北海道全体：10観測所中${u}か所で増加`, `All Hokkaido: rising at ${u} of 10 stations`, `홋카이도 전체: 관측소 10곳 중 ${u}곳에서 증가`)}</div>`; }
  if (!F) return "";
  const m = F.p_field < 0.05 ? "ok" : F.p_field < 0.1 ? "mid" : "no", mk = { ok: "✅", mid: "🟡", no: "⚪" }[m];
  const dir = F.direction === "up" ? T("増加", "up", "증가") : T("減少", "down", "감소");
  return `<div class="region ${m}">${mk} ${T(`北海道全体：${F.of}マス中${F.cells_sig}マスで有意に${dir}（偶然の確率 ${fmt(F.p_field * 100, 1)}%）`, `All Hokkaido: ${F.cells_sig} of ${F.of} cells significantly ${dir} (chance ${fmt(F.p_field * 100, 1)}%)`, `홋카이도 전체: ${F.of}칸 중 ${F.cells_sig}칸에서 유의하게 ${dir} (우연일 확률 ${fmt(F.p_field * 100, 1)}%)`)}</div>`;
}
// Roof load of 1 m of NEW snow: 1 cm of snow = 1/ratio mm of water = 1/ratio kg per m2  ->  100/ratio kg/m2
const roofHTML = (a, b) => { const r0 = 100 / a, r1 = 100 / b;
  return `<div class="roof">🏠 ${T(`新しく積もった雪1mが屋根にかける重さ：<b>${fmt(r0, 0)} → ${fmt(r1, 0)} kg/m²（${r1 >= r0 ? "+" : ""}${fmt(100 * (r1 - r0) / r0, 0)}%）</b>。同じ深さでも、雪下ろしで動かす重さが増えています。`,
    `Weight of 1 m of new snow on a roof: <b>${fmt(r0, 0)} → ${fmt(r1, 0)} kg/m² (${r1 >= r0 ? "+" : ""}${fmt(100 * (r1 - r0) / r0, 0)}%)</b>. Same depth, more weight to clear.`,
    `새로 쌓인 눈 1m가 지붕에 주는 무게: <b>${fmt(r0, 0)} → ${fmt(r1, 0)} kg/m² (${r1 >= r0 ? "+" : ""}${fmt(100 * (r1 - r0) / r0, 0)}%)</b>. 같은 깊이라도 치워야 할 무게가 늘었습니다.`)}
    <span class="note">${T("降ったばかりの雪の目安です。積もった雪は押し固められて、さらに重くなります。", "For freshly fallen snow; settled snow gets heavier still.", "갓 내린 눈 기준입니다. 쌓인 눈은 눌려서 더 무거워집니다.")}</span></div>`; };
const actHTML = k => (ACT[k] ? `<div class="act"><b>${T("だから", "So", "그래서")}</b> ${T(...ACT[k])}</div>` : "");
const WHY = () => `<div class="why">${T("なぜずれる？ 地上は街の中の1地点、NASAは約50km四方の平均です。街の熱や海・山の近さで、1か所だけの向きはずれることがあります。だから北海道全体でも確かめています。",
  "Why can they differ? The ground station is one point in town; NASA averages a ~50 km cell. Urban heat, coast or mountains can tilt a single spot, which is why we also check all of Hokkaido.",
  "왜 어긋날까? 지상은 동네 안의 한 지점, NASA는 약 50km 사방의 평균입니다. 도시의 열이나 바다·산과의 거리 때문에 한 곳만의 방향은 어긋날 수 있습니다. 그래서 홋카이도 전체로도 확인합니다.")}</div>`;

function cardHTML(k, p, idx) {
  if (KEYS[k].sat) return satCardHTML(k, p, idx);
  const K = KEYS[k], near = p.dist <= 40;
  const ser = near ? p.st.series[k] : p.cell.series[k];
  const a = mean(ser.slice(0, 10)), b = mean(ser.slice(-10));
  const tr = near ? p.st.trend[k] : p.cell.trend[k];
  const [cls, txt, kind] = verdict(near ? p.st.trend[k] : null, p.cell.trend[k]);
  const unit = T(K.unit, K.unit_en, K.unit_ko);
  const arrow = tr ? (tr.slope10 > 0 ? "↑" : tr.slope10 < 0 ? "↓" : "→") : "";
  return `<div class="card kc"><h3>${K.icon} ${T(K.ja, K.en, K.ko)}</h3><div class="sub">${T(K.sub_ja, K.sub_en, K.sub_ko)}</div>${regionHTML(k)}<div class="here mono">${T("この街", "This town", "이 동네")} · ${placeLabel(p)}</div>
  <div class="nums"><span>${T("1990年代", "1990s", "1990년대")} <b class="big">${fmt(a, 0)}</b>${unit}</span><span>→ ${T("2020年代", "2020s", "2020년대")} <b class="big">${fmt(b, 0)}</b>${unit}</span>
  <span class="arrow">${arrow} ${tr ? fmt(tr.slope10) : "–"}${unit}/${T("10年", "decade", "10년")}</span></div>
  <div class="cbox"><canvas id="c${idx}"></canvas></div><span class="badge ${cls} small">${txt}</span>${kind === "opp" ? WHY() : ""}${actHTML(k)}
  <div class="cmpline">${near ? T(`地上：気象庁${p.st.ja}（${fmt(p.dist, 0)}km）`, `Ground: JMA ${p.st.en} (${fmt(p.dist, 0)} km)`, `지상: 기상청 ${STKO[p.st.en] || p.st.en} (${fmt(p.dist, 0)}km)`) : T("地上観測が40km以内にないためNASAデータで表示", "No ground station within 40 km, NASA data shown", "40km 안에 지상 관측소가 없어 NASA 자료로 표시")} · NASA ${p.cell.trend[k] ? fmt(p.cell.trend[k].slope10) + unit + "/" + T("10年", "dec", "10년") + " (p=" + fmt(p.cell.trend[k].p, 2) + ")" : "–"}${near && tr ? " · " + T("地上", "ground", "지상") + " p=" + fmt(tr.p, 2) : ""}</div></div>`;
}

function drawChart(id, p, k, p2) {
  const near = p.dist <= 40, yrs = D.winters;
  if (KEYS[k].sat) {
    const sk = KEYS[k].sat, so = KEYS[k].stOnly, i0 = D.winters.indexOf(2001), src = q => ((so || q.dist <= 40) ? q.st : q.cell).series[sk].slice(i0);
    const ds = so ? [{ label: T("JAXA衛星×気象庁", "JAXA satellite × JMA", "JAXA 위성 × 기상청"), data: src(p), borderColor: css(KEYS[k].color), pointRadius: 2, borderWidth: 2, tension: .25 }]
      : [{ label: T("NASA MODIS衛星", "NASA MODIS satellite", "NASA MODIS 위성"), data: src(p), borderColor: css(KEYS[k].color), pointRadius: 2, borderWidth: 2, tension: .25 },
      { label: T("北海道全体", "All Hokkaido", "홋카이도 전체"), data: D.hokkaido.series[sk].slice(i0), borderColor: css("--gray"), borderDash: [4, 3], pointRadius: 0, borderWidth: 1.5, tension: .25 }];
    if (p2) ds.push({ label: placeLabel(p2), data: src(p2), borderColor: css("--heavy"), pointRadius: 0, borderWidth: 2, tension: .25 });
    chartRefs.push(new Chart(document.getElementById(id), { type: "line", data: { labels: yrs.slice(i0), datasets: ds },
      options: { animation: false, maintainAspectRatio: false, spanGaps: true, plugins: { legend: { display: true, labels: { boxWidth: 10, font: { size: 11 }, color: css("--muted") } } },
        scales: { x: { ticks: { maxTicksLimit: 6, color: css("--muted") }, grid: { display: false } }, y: { min: 0, max: so ? undefined : 100, ticks: { color: css("--muted"), maxTicksLimit: 3 } } } } }));
    return;
  }
  const ds = [{ label: near ? T("地上（気象庁）", "Ground (JMA)", "지상 (기상청)") : "NASA", data: (near ? p.st.series[k] : p.cell.series[k]), borderColor: css(KEYS[k].color), backgroundColor: "transparent", pointRadius: 0, borderWidth: 2, tension: .25 },
    { label: "NASA POWER", data: p.cell.series[k], borderColor: css("--gray"), borderDash: [4, 3], pointRadius: 0, borderWidth: 1.5, tension: .25, hidden: !near }];
  if (p2) ds.push({ label: placeLabel(p2), data: (p2.dist <= 40 ? p2.st.series[k] : p2.cell.series[k]), borderColor: css("--heavy"), pointRadius: 0, borderWidth: 2, tension: .25 });
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
  if (d == null) return T("記録なし", "no record", "기록 없음");
  if (d < 25) return T("足首くらい", "about ankle-deep", "발목 정도");
  if (d < 50) return T("ひざの下くらい", "below the knee", "무릎 아래 정도");
  if (d < 75) return T("ひざの上くらい", "above the knee", "무릎 위 정도");
  if (d < 100) return T("腰くらい", "about waist-high", "허리 정도");
  if (d < 130) return T("おなかから胸くらい", "up to the chest", "배에서 가슴 정도");
  return T("肩くらいまで", "up to the shoulders", "어깨 정도까지");
}

function tmHTML(p, y) {
  const s = p.st.series, i = D.winters.indexOf(y), j = D.winters.length - 1;
  const one = (k, lab) => `<div class="tmc">${person(s.maxdepth[k])}<div class="t"><p>${lab}</p><b>${s.maxdepth[k] ?? "–"}cm</b><p>${T("いちばん積もった雪：", "Deepest snow: ", "가장 많이 쌓인 눈: ")}${partOfBody(s.maxdepth[k])}</p>
    <p>${T("いちばん寒い朝", "Coldest morning", "가장 추운 아침")} (${s.cold_date[k] || "–"})：${fmt(s.cold_t[k])}℃ → ${T("体感", "feels like", "체감")} <b style="display:inline;font-size:18px">${fmt(s.cold_wc[k])}℃</b></p></div></div>`;
  return one(i, T(`${y}年の冬・${p.st.ja}`, `Winter ${y} · ${p.st.en}`, `${y}년 겨울 · ${STKO[p.st.en] || p.st.en}`)) + (i !== j ? one(j, T(`${D.winters[j]}年の冬（最新）`, `Winter ${D.winters[j]} (latest)`, `${D.winters[j]}년 겨울 (최신)`)) : "");
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
        const t = v / 100; a[i] = 200 + 50 * t; a[i + 1] = 225 + 25 * t; a[i + 2] = 255; a[i + 3] = 50 + 200 * t;   // white snow on the dark map
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
  if (y < 2001) { note.textContent = T(`${y}年の冬はまだ衛星（MODIS、2000年打ち上げ）がありません。2001年以降を選んでください。`, `No MODIS satellite yet in winter ${y} (launched 2000). Pick 2001 or later.`, `${y}년 겨울에는 아직 MODIS 위성이 없습니다(2000년 발사). 2001년 이후를 골라 주세요.`); return; }
  let ym = `${y}-${satMonth}`; if (ym === "2016-02") ym = "2016-01";
  satLayer = new SatLayer({ time: ym + "-01", maxNativeZoom: 6, maxZoom: 9, opacity: 1, pane: "overlayPane", attribution: "NASA GIBS / MODIS" }).addTo(satMap);
  if (places[0] && places[0].out) { note.textContent = T(`${ym.replace("-", "年")}月の NASA MODIS 月平均の雪（白いほど一か月ずっと雪）。`, `${ym}: NASA MODIS monthly snow cover (whiter = snow all month).`, `${ym}: NASA MODIS 월평균 눈 덮임 (하얄수록 한 달 내내 눈).`); return; }
  const k = satMonth === "04" ? "cov_apr" : "cov_feb", i = D.winters.indexOf(y), v = D.hokkaido.series[k][i], last = D.hokkaido.series[k][D.winters.length - 1];
  const m0 = D.hokkaido.series[k].slice(D.winters.indexOf(2001), D.winters.indexOf(2001) + 10);
  note.textContent = T(`${ym.replace("-", "年")}月：北海道の陸地の${fmt(v, 0)}%が雪（白いほど一か月ずっと雪）。2000年代（2001〜2010年）平均${fmt(mean(m0), 0)}%、最新（2026年）${fmt(last, 0)}%。`,
    `${ym}: ${fmt(v, 0)}% of Hokkaido's land under snow (whiter = snow all month). 2000s average (2001–2010) ${fmt(mean(m0), 0)}%, latest (2026) ${fmt(last, 0)}%.`, `${ym.replace("-", "년 ")}월: 홋카이도 땅의 ${fmt(v, 0)}%가 눈 (하얄수록 한 달 내내 눈). 2000년대(2001~2010년) 평균 ${fmt(mean(m0), 0)}%, 최신(2026년) ${fmt(last, 0)}%.`) + (ym === "2016-01" ? T("（2016年2月は衛星データがないため1月）", " (Feb 2016 missing, January shown)", " (2016년 2월은 위성 자료가 없어 1월로 표시)") : "");
}

function tipsHTML(p) {
  const who = [
    ["🏠", T("住む人", "Residents", "주민"), T("7日予報の⚠️の前日に、滑り止めの靴と屋根の雪下ろし。重い雪の日が増えた街ほど早めに。", "On the day before a ⚠️ in the 7-day forecast: anti-slip shoes and roof clearing — earlier in towns where heavy-snow days rose.", "7일 예보에 ⚠️가 뜨기 전날, 미끄럼 방지 신발과 지붕 눈 치우기. 무거운 눈의 날이 늘어난 동네일수록 일찍.")],
    ["🏛️", T("市・除雪", "City & snow crews", "시청·제설"), T("札幌市は2026年度、過去最大の約286億円を雪対策に使います。「まちの地図」と下の「データ」で重い雪とつるつる路面が増えた地域を見て、砂まき・排雪・ロードヒーティングの優先順位に。転倒が多い日は⚠️の条件と同じです。", "Sapporo spends a record ~28.6 billion yen on snow in FY2026. Use the City view map and the open data to rank grit, snow hauling and road heating where heavy snow and icy days rose; Sapporo's worst fall days match the ⚠️ conditions.", "삿포로시는 2026년도 역대 최대인 약 286억 엔을 눈 대책에 씁니다. 「동네 지도」와 아래 「데이터」에서 무거운 눈·빙판길이 늘어난 지역을 보고 모래·배설·도로 열선 우선순위를. 낙상이 많은 날은 ⚠️ 조건과 같습니다.")],
    ["🤝", T("地域の雪かき支援", "Community snow help", "지역 눈 치우기 지원"), T("重い雪や⚠️の日は、高齢の方や一人では雪かきが難しい家の前に雪が残りやすい日。支援の人手を前の日に手配する目安に。", "Heavy-snow and ⚠️ days are when snow piles up at the doors of older residents and households who cannot clear it alone — a cue to arrange helpers the day before.", "무거운 눈이나 ⚠️인 날은 고령자나 혼자 눈을 치우기 어려운 집 앞에 눈이 남기 쉬운 날. 도울 사람을 전날 준비하는 기준으로.")],
    ["⛷️", T("スキー場・観光", "Ski areas & tourism", "스키장·관광"), T("4月の雪が10年で約13ポイント減。春シーズンの終わり方と軽い雪の見せ方を、毎年このカルテで確かめる。", "April snow cover is down ~13 points a decade: re-plan the end of the spring season and how light snow is promoted, checking this chart every winter.", "4월 눈 덮임이 10년에 약 13%p 감소. 봄 시즌 마무리와 가벼운 눈 홍보 방식을 해마다 이 카르테로 확인.")],
  ];
  return `<ul class="who">${who.map(([i, w, t]) => `<li><span class="wi">${i}</span><div><b>${w}</b><p>${t}</p></div></li>`).join("")}</ul>`;
}
function trustHTML(p) {
  const pc = p.cell.precip_check || {}, n = pc.nasa, j = pc.jaxa;
  const agree = n && j && Math.sign(n.slope10) === Math.sign(j.slope10);
  return `<ul>
  <li>${T("NASA POWER（MERRA-2再解析）：", "NASA POWER (MERRA-2 reanalysis): ", "NASA POWER (MERRA-2 재분석): ")}${T(`約50kmのマス（北緯${p.cell.lat}°・東経${p.cell.lon}°）の日別データ`, `daily data for the ~50 km cell at ${p.cell.lat}°N ${p.cell.lon}°E`, `약 50km 칸(북위 ${p.cell.lat}°·동경 ${p.cell.lon}°)의 일별 자료`)}</li>
  <li>${T("気象庁の地上観測：", "JMA ground observations: ", "기상청 지상 관측: ")}${T(`${p.st.ja}（${fmt(p.dist, 0)}km）の日別の降雪・気温・積雪`, `daily snowfall, temperature and snow depth at ${p.st.en} (${fmt(p.dist, 0)} km)`, `${STKO[p.st.en] || p.st.en}(${fmt(p.dist, 0)}km)의 일별 강설·기온·적설`)}</li>
  <li>${T("JAXA GSMaP（衛星降水）：", "JAXA GSMaP (satellite precipitation): ", "JAXA GSMaP (위성 강수): ")}${T(`冬の降水量の傾き（2001〜2026年）は、NASAとJAXAで${D.cells.filter(c => c.precip_check && c.precip_check.nasa && c.precip_check.jaxa && Math.sign(c.precip_check.nasa.slope10) === Math.sign(c.precip_check.jaxa.slope10)).length}/${D.cells.length}マスが同じ向き。別々の衛星・モデルで、雪の材料（降水）の変化を確かめています。`,
  `Winter precipitation trends (2001–2026) point the same way in NASA and JAXA data in ${D.cells.filter(c => c.precip_check && c.precip_check.nasa && c.precip_check.jaxa && Math.sign(c.precip_check.nasa.slope10) === Math.sign(c.precip_check.jaxa.slope10)).length} of ${D.cells.length} cells — an independent satellite check on the raw material of snow.`,
  `겨울 강수량 기울기(2001~2026년)는 NASA와 JAXA에서 ${D.cells.length}칸 중 ${D.cells.filter(c => c.precip_check && c.precip_check.nasa && c.precip_check.jaxa && Math.sign(c.precip_check.nasa.slope10) === Math.sign(c.precip_check.jaxa.slope10)).length}칸이 같은 방향. 서로 다른 위성·모델로 눈의 재료(강수)의 변화를 확인합니다.`)}</li>
  <li>${T("JAXA GSMaP（毎日の衛星降水）：", "JAXA GSMaP (daily satellite rain): ", "JAXA GSMaP (매일의 위성 강수): ")}${T(`1日10mm以上の「重い大雪・大雨の日」は、10観測所中${stormUp()}か所で2000年代より2020年代に増加`, `wet heavy-storm days (≥ 10 mm/day) rose from the 2000s to the 2020s at ${stormUp()} of 10 stations`, `하루 10mm 이상의 「무거운 폭설·폭우 날」은 관측소 10곳 중 ${stormUp()}곳에서 2000년대보다 2020년대에 증가`)}</li>
  <li>${T("検定：季節を絞った冬ごとの値にマン・ケンドール検定（p<0.05で有意）とセン傾き。", "Test: Mann–Kendall on one value per winter (significant at p < 0.05) with Sen's slope.", "검정: 겨울마다 값 하나씩으로 맨-켄달 검정(p<0.05면 유의)과 센 기울기.")}</li></ul>`;
}

function placeCard(q, i) {
  const away = fmt(km(q.la, q.lo, q.cell.lat, q.cell.lon), 0);
  return `<div class="card place ${i ? "b" : ""}"><h3>${placeLabel(q)}</h3>
    ${q.out ? `<p class="out">${T("🌍 世界モード：NASA POWERの35年分を、この場所で直接計算しています。", "🌍 World mode: 35 years of NASA POWER data computed for this exact spot.", "🌍 세계 모드: NASA POWER 35년 치를 이 장소에서 직접 계산합니다.")}</p><p>${T(`北緯${q.la.toFixed(2)}° 東経${q.lo.toFixed(2)}° · 地上観測なし`, `${q.la.toFixed(2)}°, ${q.lo.toFixed(2)}° · no ground station`, `위도 ${q.la.toFixed(2)}° 경도 ${q.lo.toFixed(2)}° · 지상 관측 없음`)}</p></div>` : ""}
    ${q.out ? "" : `<p>${T(`最寄りの地上観測：気象庁${q.st.ja}（${fmt(q.dist, 0)}km）・NASAのマス：北緯${q.cell.lat}° 東経${q.cell.lon}°`, `Nearest ground station: JMA ${q.st.en} (${fmt(q.dist, 0)} km) · NASA cell ${q.cell.lat}°N ${q.cell.lon}°E`, `가장 가까운 지상 관측소: 기상청 ${STKO[q.st.en] || q.st.en} (${fmt(q.dist, 0)}km) · NASA 칸: 북위 ${q.cell.lat}° 동경 ${q.cell.lon}°`)}</p></div>`}`;
}
function renderPlaces() {
  document.getElementById("places").innerHTML = places.map(placeCard).join("");
  document.querySelectorAll(".pbar").forEach(el => {
    el.innerHTML = `<div class="pb-places">${places.map(placeCard).join("")}</div>
      <div class="row chips">${QUICK.map((q, i) => `<button class="chip ${places[0].q === i ? "on" : ""}" data-qi="${i}">${T(q[0], q[1], q[4])}</button>`).join("")}<a class="chip ghost" href="#/" data-go="pick">${T("地図でえらぶ →", "Pick on map →", "지도에서 고르기 →")}</a></div>`;
    el.querySelectorAll("[data-qi]").forEach(b => (b.onclick = () => { const q = QUICK[+b.dataset.qi]; choose(q[2], q[3], null, { q: +b.dataset.qi }); }));
  });
}
function renderEntries(p) {
  const near = p.dist <= 40, src = near ? p.st : p.cell, h = src.series.heavy, f = senFit(h, D.winters[0]);
  const s = p.st.series, j = D.winters.length - 1, i24 = D.winters.indexOf(2024);
  const E = [["karte", T("雪質カルテ", "Snow chart", "눈 품질 카르테"), T("重い雪の日", "Heavy-snow days", "무거운 눈의 날"), `${fmt(mean(h.slice(0, 10)), 0)} → ${fmt(mean(h.slice(-10)), 0)}${T("日", " days", "일")}`, T("1990年代 → 2020年代", "1990s → 2020s", "1990년대 → 2020년대")],
    ["time", T("雪の年表", "Snow timeline", "눈의 연표"), T("重い雪の日 · 2050年（推定）", "Heavy-snow days · 2050 (trend)", "무거운 눈의 날 · 2050년 (추정)"), `${f ? fmt(Math.max(0, f.at(2050)), 0) : "–"}${T("日", " days", "일")}`, T("1992 → 明日 → 2050、今の傾きのまま（予報ではない）", "1992 → tomorrow → 2050, today's trend (not a forecast)", "1992 → 내일 → 2050, 지금 기울기 그대로 (예보 아님)")],
    ["why", T("なぜ・どこで", "Why & where", "왜·어디서"), T("気温と水分で説明できる割合", "Explained by warming + moisture", "기온·수분으로 설명되는 비율"), `${fmt(D.cause.explained_share_tp * 100, 0)}%`, T("次に変わりやすい場所も", "and where it changes next", "다음에 바뀔 곳도")]];
  document.getElementById("entries").innerHTML = E.map(([v, t, k, n, sub]) => `<a class="entry" href="#/${v}"><div class="et"><h3>${t}</h3><p class="note">${placeLabel(p)}</p></div>
    <div class="estat"><span class="k mono">${k}</span><b class="mono">${n}</b><span class="note">${sub}</span></div><span class="go mono">→</span></a>`).join("");
}

// Indicators that are robust across Hokkaido (shuffle test p < 0.05 or 10/10 stations) lead everywhere.
const ROBUST = ["dens", "heavy", "storm", "icy", "spring"];
function notYetHTML(p) {
  const F = D.field, sp = indicatorStat("powder", p), sh = indicatorStat("share", p);
  return `<div class="card notyet"><p class="lbl mono">${T("まだ言えないこと", "Not yet certain", "아직 말할 수 없는 것")}</p>
    <h3>${T("軽い雪が消えている、とはまだ言えない。", "Light snow is not (yet) disappearing.", "가벼운 눈이 사라지고 있다고는 아직 말할 수 없다.")}</h3>
    <p>${T(`軽い雪の日は北海道全体で${F.powder.of}マス中${F.powder.cells_sig}マスが有意に減少していますが、偶然の確率が${fmt(F.powder.p_field * 100, 1)}%で、まだ「確か」の基準（5%）に届きません。${placeLabel(p)}では ${fmt(sp.a, 0)}→${fmt(sp.b, 0)}日、軽い雪の割合は ${fmt(sh.a, 0)}→${fmt(sh.b, 0)}%。`,
      `Light-snow days fell significantly in ${F.powder.cells_sig} of ${F.powder.of} cells, but the chance level is ${fmt(F.powder.p_field * 100, 1)}%, above our 5% bar for “certain”. In ${placeLabel(p)}: ${fmt(sp.a, 0)}→${fmt(sp.b, 0)} days; light-snow share ${fmt(sh.a, 0)}→${fmt(sh.b, 0)}%.`,
      `가벼운 눈의 날은 홋카이도 전체 ${F.powder.of}칸 중 ${F.powder.cells_sig}칸에서 유의하게 줄었지만, 우연일 확률이 ${fmt(F.powder.p_field * 100, 1)}%로 「확실」 기준(5%)에 못 미칩니다. ${placeLabel(p)}: ${fmt(sp.a, 0)}→${fmt(sp.b, 0)}일, 가벼운 눈 비율 ${fmt(sh.a, 0)}→${fmt(sh.b, 0)}%.`)}</p>
    <p class="act"><b>${T("つまり", "In short", "즉")}</b> ${T("今起きているのは「軽い雪が消える」ことより先に「重く湿った雪が増える」こと。北海道の軽い雪を守るには、この変化を毎年見ていくことが大切です。", "What is happening first is not light snow vanishing but wet, heavy snow increasing — the change to watch every winter to protect Hokkaido's light snow.", "지금 먼저 일어나는 건 '가벼운 눈이 사라지는 것'보다 '무겁고 젖은 눈이 늘어나는 것'. 홋카이도의 가벼운 눈을 지키려면 이 변화를 해마다 지켜봐야 합니다.")}</p></div>`;
}


// ---------- snow timeline: one slider from 1992 to tomorrow to 2050 ----------
const PY = () => (TL >= 36 ? TL_FUT[TL - 36] : 2050);
function tlFrame() {
  const kind = TL <= 34 ? "past" : TL === 35 ? "fc" : "fut";
  const sl = document.getElementById("tmSlider"); if (!sl) return;
  sl.value = TL;
  document.getElementById("tlKind").textContent = { past: T("観測 · その冬", "Observed · winter", "관측 · 그 겨울"), fc: T("予報 · ", "Forecast · ", "예보 · "), fut: T("推定 · 今の傾きのまま", "Estimate · today's trend", "추정 · 지금 기울기 그대로") }[kind];
  document.getElementById("tmYear").textContent = kind === "past" ? tmYear : kind === "fc" ? T("この先7日", "next 7 days", "앞으로 7일") : PY();
  document.getElementById("tm").hidden = kind !== "past"; document.getElementById("tlSat").hidden = kind !== "past";
  document.getElementById("tlFc").hidden = kind !== "fc"; document.getElementById("proj").hidden = kind !== "fut";
  document.querySelectorAll(".tm-ctl .chip").forEach(b => b.classList.toggle("on", +b.dataset.t === TL));
  if (kind === "fc") {
    const fc = document.getElementById("fc");
    document.getElementById("tlFc").innerHTML = `<h2>${T("明日からの7日間。", "The next 7 days.", "내일부터 7일.")}</h2><div class="fcrow">${fc ? fc.innerHTML : ""}</div>
      <p class="note">${T("35年の分析と同じ決まりで、この先の天気予報を雪の質に読みかえています。⚠️は、雨やぬれた雪のあとに凍る、転倒が多い日の条件です。", "The forecast read with the same rules as the 35-year analysis. ⚠️ marks rain or wet snow followed by a freeze — the conditions of the worst fall days.", "35년 분석과 같은 규칙으로 앞으로의 예보를 눈의 질로 바꿔 읽습니다. ⚠️는 비나 젖은 눈 뒤에 얼어붙는, 낙상이 많은 날의 조건입니다.")}</p>`;
  }
}

// ---------- at-a-glance summary (rule-based from the same numbers, no AI) ----------
function indicatorStat(k, p) {
  const K = KEYS[k];
  if (K.sat) {
    const near = K.stOnly || p.dist <= 40, src = near ? p.st : p.cell, ser = src.series[K.sat], tr = src.trend[K.sat];
    const v = ser.filter(x => x != null), a = mean(v.slice(0, 10)), b = mean(ser.slice(-10));
    const good = K.down ? b < a : b > a;
    const mark = tr && tr.p < 0.05 ? "ok" : (tr && tr.p < 0.1) || (K.stOnly && good) ? "mid" : "no";
    return { a, b, dir: Math.sign((b ?? 0) - (a ?? 0)), mark, unit: K.stOnly ? T(K.unit, K.unit_en, K.unit_ko) : "%", from: T("2000年代", "2000s", "2000년대"), d: K.d ?? (K.stOnly ? 1 : 0) };
  }
  const near = p.dist <= 40, ser = near ? p.st.series[k] : p.cell.series[k], a = mean(ser.slice(0, 10)), b = mean(ser.slice(-10));
  const [cls] = verdict(near ? p.st.trend[k] : null, p.cell.trend[k]);
  return { a, b, dir: Math.sign(Math.round(b) - Math.round(a)), mark: cls, unit: T(K.unit, K.unit_en, K.unit_ko), from: T("1990年代", "1990s", "1990년대"), d: 0 };
}
function summaryHTML(p) {
  const S = Object.fromEntries([...ROBUST, "powder"].map(k => [k, indicatorStat(k, p)]));
  const regDir = { dens: -1, heavy: 1, storm: 1, icy: 1, spring: -1 };
  const same = ROBUST.filter(k => S[k].dir === regDir[k]).length, arrow = d => (d > 0 ? "↑" : d < 0 ? "↓" : "→");
  let fcLine = "";
  if (FC && !FC.error && FC.time) {
    const cls = FC.time.map((t, i) => fcClass(FC, i).map(x => x[0])), warn = cls.filter(c => c.includes("warn")).length, pw = cls.filter(c => c.includes("powder")).length, hv = cls.filter(c => c.includes("heavy")).length;
    fcLine = `<p class="sum-fc">${T(`この先7日：⚠️ 転倒注意 ${warn}日 · ❄️ 軽い雪 ${pw}日 · 💧 重い雪 ${hv}日`, `Next 7 days: ⚠️ fall risk ${warn} · ❄️ light snow ${pw} · 💧 heavy snow ${hv}`, `앞으로 7일: ⚠️ 낙상 주의 ${warn}일 · ❄️ 가벼운 눈 ${pw}일 · 💧 무거운 눈 ${hv}일`)}</p>`;
  }
  return `<p class="lbl mono">${T("ひとことで", "In a nutshell", "한눈에 요약")}</p>
    <h2 class="sum-h">${T("北海道の雪は、重く湿り、春は早く消えている。", "Hokkaido's snow is getting wetter and heavier, and leaving earlier in spring.", "홋카이도의 눈은 무겁고 젖어 가고, 봄에는 빨리 사라지고 있다.")}</h2>
    <p class="sum-sub">${T(`${placeLabel(p)}でも、${ROBUST.length}つのうち${same}つが同じ向きです。`, `In ${placeLabel(p)}, ${same} of ${ROBUST.length} point the same way.`, `${placeLabel(p)}에서도 ${ROBUST.length}가지 중 ${same}가지가 같은 방향입니다.`)}</p>
    <ul class="sum">${ROBUST.map(k => { const r = S[k], K = KEYS[k], ok = r.dir === regDir[k]; return `<li class="${ok ? "ok" : "no"}"><span class="m">✅</span><span class="n">${K.icon} ${T(K.ja, K.en, K.ko)}<small>${T("北海道全体で確か", "certain across Hokkaido", "홋카이도 전체에서 확실")}</small></span><b class="mono">${arrow(r.dir)} ${fmt(r.a, r.d)} → ${fmt(r.b, r.d)}${r.unit}</b></li>`; }).join("")}
      <li class="no"><span class="m">⚪</span><span class="n">❄️ ${T("軽い雪の日", "Light-snow days", "가벼운 눈의 날")}<small>${T("減る傾向、まだ確かではない", "leaning down, not yet certain", "줄어드는 경향, 아직 확실하지 않음")}</small></span><b class="mono">${arrow(S.powder.dir)} ${fmt(S.powder.a, 0)} → ${fmt(S.powder.b, 0)}${S.powder.unit}</b></li></ul>
    ${fcLine}<p class="note">${T("✅＝北海道全体で偶然とは言えない変化。数字はこの街の古い10年 → 最近10年の平均。", "✅ = change across Hokkaido that chance cannot explain. Numbers: this town, older 10 years → latest 10 years.", "✅ = 홋카이도 전체에서 우연으로 설명되지 않는 변화. 숫자는 이 동네의 앞 10년 → 최근 10년 평균.")}
    <a class="link-in" href="#/karte">${T("雪質カルテを見る →", "Open the snow chart →", "눈 품질 카르테 보기 →")}</a></p>`;
}
function renderSummary() { if (places.length && !places[0].out) document.querySelectorAll(".summary").forEach(el => (el.innerHTML = summaryHTML(places[0]))); }


// =====================================================================
// World mode: any point on Earth, 35 winters computed live in the browser
// from NASA POWER daily data (MERRA-2). Same rules as the Hokkaido chart.
// Northern hemisphere winter = Dec–Mar (labelled by January), southern = Jun–Sep.
// =====================================================================
const WORLD_CACHE = {};
function erfc(x) { const z = Math.abs(x), t = 1 / (1 + 0.5 * z), r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277))))))))); return x >= 0 ? r : 2 - r; }
function mkJS(x) {
  const v = x.map((a, i) => [i, a]).filter(q => q[1] != null), n = v.length; if (n < 10) return null;
  let S = 0; const sl = [], ties = {};
  for (let i = 0; i < n - 1; i++) for (let j = i + 1; j < n; j++) { const d = v[j][1] - v[i][1]; S += Math.sign(d); sl.push(d / (v[j][0] - v[i][0])); }
  v.forEach(q => (ties[q[1]] = (ties[q[1]] || 0) + 1));
  const varS = (n * (n - 1) * (2 * n + 5) - Object.values(ties).reduce((a, t) => a + t * (t - 1) * (2 * t + 5), 0)) / 18;
  const z = S === 0 ? 0 : (S - Math.sign(S)) / Math.sqrt(varS);
  sl.sort((a, b) => a - b); const m = sl.length, sen = m % 2 ? sl[(m - 1) / 2] : (sl[m / 2 - 1] + sl[m / 2]) / 2;
  return { p: erfc(Math.abs(z) / Math.SQRT2), slope10: sen * 10, n };
}
async function loadWorld(p) {
  const key = `${p.la.toFixed(2)},${p.lo.toFixed(2)}`;
  if (WORLD_CACHE[key]) return WORLD_CACHE[key];
  const u = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M,T2M_MAX,T2M_MIN,PRECSNOLAND,WS2M&community=AG&latitude=${p.la.toFixed(3)}&longitude=${p.lo.toFixed(3)}&start=19910501&end=20260430&format=JSON`;
  const j = await (await fetch(u)).json();
  const P = j.properties.parameter, south = p.la < 0, ok = v => (v == null || v <= -900 ? null : v);
  const months = south ? ["06", "07", "08", "09"] : ["12", "01", "02", "03"];
  const W = south ? Array.from({ length: 35 }, (_, i) => 1991 + i) : Array.from({ length: 35 }, (_, i) => 1992 + i);
  const inWinter = (k, w) => (south ? k.slice(0, 4) === String(w) && months.includes(k.slice(4, 6)) : (k.slice(0, 4) === String(w - 1) && k.slice(4, 6) === "12") || (k.slice(0, 4) === String(w) && ["01", "02", "03"].includes(k.slice(4, 6))));
  const S = { snow_days: [], powder: [], heavy: [], icy: [], share: [], tmean: [], cold_t: [], cold_wc: [], cold_date: [] };
  for (const w of W) {
    const ks = Object.keys(P.T2M).filter(k => inWinter(k, w));
    if (ks.length < 100) { Object.keys(S).forEach(k => S[k].push(null)); continue; }
    let sd = 0, pw = 0, hv = 0, ic = 0, tsum = 0, tn = 0, cold = null;
    for (const k of ks) {
      const tm = ok(P.T2M[k]), tx = ok(P.T2M_MAX[k]), tl = ok(P.T2M_MIN[k]), sn = ok(P.PRECSNOLAND[k]), ws = ok(P.WS2M[k]);
      if (tm != null) { tsum += tm; tn++; }
      if (sn != null && sn >= 1) { sd++; if (tm != null && tm <= -5) pw++; if (tm != null && tm > -2) hv++; }
      if (tx != null && tl != null && tx > 0 && tl < 0) ic++;
      if (tl != null && (!cold || tl < cold[0])) cold = [tl, ws, k];
    }
    S.snow_days.push(sd); S.powder.push(pw); S.heavy.push(hv); S.icy.push(ic); S.share.push(sd ? Math.round(1000 * pw / sd) / 10 : null); S.tmean.push(tn ? tsum / tn : null);
    if (cold) { const [t, v, k] = cold, kmh = Math.max((v || 0) * 3.6, 4.8); S.cold_t.push(t); S.cold_wc.push(Math.round(10 * (13.12 + 0.6215 * t - 11.37 * kmh ** 0.16 + 0.3965 * t * kmh ** 0.16)) / 10); S.cold_date.push(`${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6)}`); }
    else { S.cold_t.push(null); S.cold_wc.push(null); S.cold_date.push(null); }
  }
  const T = {}; ["snow_days", "powder", "heavy", "icy", "share", "tmean"].forEach(k => (T[k] = mkJS(S[k])));
  const snowy = mean(S.snow_days) ?? 0;
  return (WORLD_CACHE[key] = { winters: W, series: S, trend: T, south, snowy, elev: j.geometry && j.geometry.coordinates ? j.geometry.coordinates[2] : null });
}
const WKEYS = ["heavy", "powder", "icy", "share"];
const wMark = t => (t && t.p < 0.05 ? "ok" : t && t.p < 0.1 ? "mid" : "no");
const wBadge = t => ({ ok: T("✅ NASAデータで有意", "✅ Significant in NASA data", "✅ NASA 자료에서 유의"), mid: T("🟡 傾向あり（p<0.1）", "🟡 Likely (p < 0.1)", "🟡 경향 있음 (p < 0.1)"), no: T("⚪ まだ言えない", "⚪ Not yet clear", "⚪ 아직 말할 수 없음") }[wMark(t)]);
function worldNote(p) {
  return T(`世界モード：この場所はNASA POWER（約50kmの格子、MERRA-2）だけで計算しています。気象庁の観測・衛星の確かめは北海道だけです。${p.world.south ? "南半球なので6〜9月を冬としています。" : ""}`,
    `World mode: computed from NASA POWER only (~50 km grid, MERRA-2). Ground-station and satellite checks exist for Hokkaido only.${p.world.south ? " Southern hemisphere: winter = Jun–Sep." : ""}`,
    `세계 모드: 이 장소는 NASA POWER(약 50km 격자, MERRA-2)만으로 계산했습니다. 기상청 관측·위성 확인은 홋카이도만 있습니다.${p.world.south ? " 남반구라서 6~9월을 겨울로 봅니다." : ""}`);
}
function worldLoadingHTML() { return `<div class="card loading"><span class="spin"></span>${T("NASAの35年分のデータを取得中…（10秒ほど）", "Fetching 35 years of NASA data… (about 10 s)", "NASA 35년 치 데이터를 받는 중… (10초쯤)")}</div>`; }
function worldCardHTML(k, p, idx) {
  const K = k === "tmean" ? { icon: "🌡️", ja: "冬の平均気温", en: "Winter mean temperature", ko: "겨울 평균기온", sub_ja: "冬（雪の季節）の毎日の平均気温の平均", sub_en: "Average of daily mean temperatures in winter", sub_ko: "겨울 매일 평균기온의 평균", unit: "℃", unit_en: " °C", unit_ko: "℃" } : KEYS[k];
  const ser = p.world.series[k], tr = p.world.trend[k], a = mean(ser.slice(0, 10)), b = mean(ser.slice(-10)), unit = T(K.unit, K.unit_en, K.unit_ko), dg = k === "tmean" ? 1 : 0;
  const arrow = tr ? (tr.slope10 > 0 ? "↑" : tr.slope10 < 0 ? "↓" : "→") : "";
  return `<div class="card kc"><h3>${K.icon} ${T(K.ja, K.en, K.ko)}</h3><div class="sub">${T(K.sub_ja, K.sub_en, K.sub_ko)}</div><div class="here mono">${T("この場所", "This place", "이 장소")} · ${placeLabel(p)}</div>
  <div class="nums"><span>${T("1990年代", "1990s", "1990년대")} <b class="big">${fmt(a, dg)}</b>${unit}</span><span>→ ${T("2020年代", "2020s", "2020년대")} <b class="big">${fmt(b, dg)}</b>${unit}</span>
  <span class="arrow">${arrow} ${tr ? fmt(tr.slope10, k === "tmean" ? 2 : 1) : "–"}${unit}/${T("10年", "decade", "10년")}</span></div>
  <div class="cbox"><canvas id="c${idx}"></canvas></div><span class="badge ${wMark(tr)} small">${wBadge(tr)}</span>
  <div class="cmpline">NASA POWER · ${tr ? "p=" + fmt(tr.p, 2) : "–"}</div></div>`;
}
function renderWorld(p) {
  const cards = document.getElementById("cards"), tm = document.getElementById("tm"), sum = document.querySelectorAll(".summary");
  if (!p.world) {
    cards.innerHTML = worldLoadingHTML(); tm.innerHTML = worldLoadingHTML(); sum.forEach(el => (el.innerHTML = worldLoadingHTML()));
    document.getElementById("proj").innerHTML = worldLoadingHTML(); document.getElementById("entries").innerHTML = ""; return;
  }
  if (p.world.error) { const m = `<div class="card">${T("NASAのデータを取得できませんでした。少し待ってからもう一度選んでください。", "Could not fetch NASA data. Please try again in a moment.", "NASA 데이터를 가져오지 못했습니다. 잠시 후 다시 골라 주세요.")}</div>`; cards.innerHTML = m; sum.forEach(el => (el.innerHTML = m)); return; }
  const W = p.world, keys = W.snowy >= 3 ? [...WKEYS, "tmean"] : ["tmean"];
  // summary
  const tt = W.trend.tmean, hv = W.trend.heavy, pw = W.trend.powder;
  const head = W.snowy < 3 ? T("ここは、雪がほとんど降らない場所です。", "Snow is rare here.", "여기는 눈이 거의 내리지 않는 곳입니다.")
    : hv && hv.slope10 > 0 && wMark(hv) !== "no" ? T("ここでも、雪は重くなる方向です。", "Here too, snow is turning heavier.", "여기서도 눈은 무거워지는 방향입니다.")
    : pw && pw.slope10 < 0 && wMark(pw) !== "no" ? T("ここでは、軽い雪が減る方向です。", "Here, light-snow days are falling.", "여기서는 가벼운 눈이 줄어드는 방향입니다.")
    : T("ここでは、雪の質の変化はまだはっきりしません。", "Here, no clear change in snow quality yet.", "여기서는 눈 품질 변화가 아직 뚜렷하지 않습니다.");
  const mk = { ok: "✅", mid: "🟡", no: "⚪" }, arrow = d => (d > 0 ? "↑" : d < 0 ? "↓" : "→");
  const row = k => { const K = k === "tmean" ? { icon: "🌡️", ja: "冬の平均気温", en: "Winter mean temperature", ko: "겨울 평균기온", unit: "℃", unit_en: " °C", unit_ko: "℃" } : KEYS[k], s = W.series[k], a = mean(s.slice(0, 10)), b = mean(s.slice(-10)), t = W.trend[k];
    return `<li class="${wMark(t)}"><span class="m">${mk[wMark(t)]}</span><span class="n">${K.icon} ${T(K.ja, K.en, K.ko)}</span><b class="mono">${arrow(Math.sign((b ?? 0) - (a ?? 0)))} ${fmt(a, k === "tmean" ? 1 : 0)} → ${fmt(b, k === "tmean" ? 1 : 0)}${T(K.unit, K.unit_en, K.unit_ko)}</b></li>`; };
  sum.forEach(el => (el.innerHTML = `<p class="lbl mono">${T("ひとことで · 世界モード", "In a nutshell · world mode", "한눈에 요약 · 세계 모드")}</p><h2 class="sum-h">${head}</h2>
    <p class="sum-sub">${placeLabel(p)} · ${T("冬の気温", "winter temperature", "겨울 기온")} ${tt ? (tt.slope10 >= 0 ? "+" : "") + fmt(tt.slope10, 2) + T("℃/10年", " °C/decade", "℃/10년") : "–"}</p>
    <ul class="sum">${keys.map(row).join("")}</ul><p class="note">${worldNote(p)}</p>`));
  cards.innerHTML = keys.map((k, i) => worldCardHTML(k, p, i)).join("") + `<div class="card notyet"><p class="note">${worldNote(p)}</p></div>`;
  if (VIEW === "karte") keys.forEach((k, i) => {
    chartRefs.push(new Chart(document.getElementById("c" + i), { type: "line", data: { labels: W.winters, datasets: [{ label: "NASA POWER", data: W.series[k], borderColor: css(k === "tmean" ? "--heavy" : (KEYS[k] || {}).color || "--blue"), pointRadius: 0, borderWidth: 2, tension: .25 }] },
      options: { animation: false, maintainAspectRatio: false, plugins: { legend: { labels: { boxWidth: 10, font: { size: 11 }, color: css("--muted") } } }, scales: { x: { ticks: { maxTicksLimit: 6, color: css("--muted") }, grid: { display: false } }, y: { beginAtZero: k !== "tmean", ticks: { color: css("--muted"), maxTicksLimit: 4 }, grid: { color: css("--line") } } } } }));
  });
  // entries
  const hs = W.series.heavy, f = senFit(hs, W.winters[0]), ts = W.series.tmean;
  document.getElementById("entries").innerHTML = [["karte", T("雪質カルテ", "Snow chart", "눈 품질 카르테"), T("重い雪の日", "Heavy-snow days", "무거운 눈의 날"), `${fmt(mean(hs.slice(0, 10)), 0)} → ${fmt(mean(hs.slice(-10)), 0)}${T("日", " days", "일")}`, T("1990年代 → 2020年代", "1990s → 2020s", "1990년대 → 2020년대")],
    ["time", T("雪の年表", "Snow timeline", "눈의 연표"), T("冬の平均気温", "Winter mean temperature", "겨울 평균기온"), `${fmt(mean(ts.slice(0, 10)), 1)} → ${fmt(mean(ts.slice(-10)), 1)}℃`, T("1990年代 → 2020年代 → 2050", "1990s → 2020s → 2050", "1990년대 → 2020년대 → 2050")],
    ["why", T("なぜ・どこで", "Why & where", "왜·어디서"), T("北海道と世界の研究", "Research: Hokkaido & world", "홋카이도와 세계 연구"), `${fmt(D.cause.explained_share_tp * 100, 0)}%`, T("北海道で気温＋水分が説明する割合", "of Hokkaido's change explained by warming + moisture", "홋카이도 변화 중 기온+수분으로 설명")]]
    .map(([v, t, k, n, sub]) => `<a class="entry" href="#/${v}"><div class="et"><h3>${t}</h3><p class="note">${placeLabel(p)}</p></div><div class="estat"><span class="k mono">${k}</span><b class="mono">${n}</b><span class="note">${sub}</span></div><span class="go mono">→</span></a>`).join("");
  // 2050
  const pj = [["heavy", hs], ["tmean", ts]].map(([k, ser]) => {
    const g = senFit(ser, W.winters[0]); if (!g) return "";
    const isT = k === "tmean", unit = isT ? T("℃", " °C", "℃") : T("日", " days", "일"), now = mean(ser.slice(-10)), mid = isT ? g.at(PY()) : Math.max(0, g.at(PY()));
    const lo = g.ym + g.lo * (PY() - g.xm), hi = g.ym + g.hi * (PY() - g.xm);
    return `<div class="pj"><div class="k">${isT ? "🌡️ " + T("冬の平均気温", "Winter mean temperature", "겨울 평균기온") : KEYS.heavy.icon + " " + T(KEYS.heavy.ja, KEYS.heavy.en, KEYS.heavy.ko)}</div><div class="v">${fmt(mid, isT ? 1 : 0)}${unit}</div>
      <div class="note">${T("2020年代", "2020s", "2020년대")} ${fmt(now, isT ? 1 : 0)}${unit} → ${PY()} ${fmt(isT ? lo : Math.max(0, lo), isT ? 1 : 0)}–${fmt(isT ? hi : Math.max(0, hi), isT ? 1 : 0)}${unit}</div></div>`;
  }).join("");
  document.getElementById("proj").innerHTML = `<h2>${T(`${PY()}年、このままの傾きなら。`, `${PY()}, if the trend simply continues.`, `${PY()}년, 지금 기울기 그대로라면.`)}</h2><div class="proj-grid">${pj}</div><p class="note">${worldNote(p)} ${T("予報ではなく、今の傾きをのばした目安です。", "Not a forecast — today's trend extended.", "예보가 아니라 지금 기울기를 늘린 기준입니다.")}</p>`;
  // time machine (no snow-depth record outside Hokkaido: coldest morning + winter temperature)
  const i = Math.max(0, W.winters.indexOf(tmYear)), j = W.winters.length - 1, S = W.series;
  const one = (k, lab) => `<div class="tmc"><div class="t"><p>${lab}</p><b>${fmt(S.tmean[k], 1)}℃</b><p>${T("冬の平均気温", "Winter mean temperature", "겨울 평균기온")}</p>
    <p>${T("いちばん寒い朝", "Coldest morning", "가장 추운 아침")} (${S.cold_date[k] || "–"})：${fmt(S.cold_t[k])}℃ → ${T("体感", "feels like", "체감")} <b style="display:inline;font-size:18px">${fmt(S.cold_wc[k])}℃</b></p></div></div>`;
  tm.innerHTML = one(i, T(`${W.winters[i]}年の冬`, `Winter ${W.winters[i]}`, `${W.winters[i]}년 겨울`)) + (i !== j ? one(j, T(`${W.winters[j]}年の冬（最新）`, `Winter ${W.winters[j]} (latest)`, `${W.winters[j]}년 겨울 (최신)`)) : "")
    + `<p class="note">${T("北海道の外は積雪の深さの記録がないため、気温と体感温度を見せています。", "Outside Hokkaido there is no snow-depth record here, so temperature and wind chill are shown.", "홋카이도 밖은 적설 기록이 없어 기온과 체감 온도를 보여 줍니다.")}</p>`;
  if (VIEW === "time" && satMap && TL <= 34) { satMap.setView([p.la, p.lo], 5); renderSat(); }
  tlFrame();
  document.getElementById("tips").innerHTML = `<p class="note">${worldNote(p)}</p>`;
  document.getElementById("trust").innerHTML = `<ul><li>${T("NASA POWER（MERRA-2再解析）の日別データを、このページで直接取得して計算", "NASA POWER (MERRA-2) daily data fetched and computed in this page", "NASA POWER(MERRA-2) 일별 자료를 이 페이지에서 직접 받아 계산")}</li><li>${T("検定：冬ごとの値にマン・ケンドール検定とセン傾き（北海道と同じ）", "Test: Mann–Kendall and Sen's slope on one value per winter (same as Hokkaido)", "검정: 겨울마다 값 하나로 맨-켄달 검정과 센 기울기 (홋카이도와 같음)")}</li></ul>`;
}

function render() {
  chartRefs.forEach(c => c.destroy()); chartRefs = [];
  const [p, p2] = places;
  if (p.out) { renderPlaces(); return renderWorld(p); }
  renderPlaces(); renderEntries(p); renderSummary();
  const keys = ROBUST;
  document.getElementById("cards").innerHTML = keys.map((k, i) => cardHTML(k, p, i)).join("") + notYetHTML(p);
  if (VIEW === "karte") keys.forEach((k, i) => drawChart("c" + i, p, k, p2));
  document.getElementById("tm").innerHTML = tmHTML(p, tmYear) + (p2 ? tmHTML(p2, tmYear).split('<div class="tmc">').slice(0, 2).join('<div class="tmc">') : "");
  if (VIEW === "time" && TL <= 34) renderSat();
  renderProj(p, PY());
  tlFrame();
  if (VIEW === "why") renderWhy();
  document.getElementById("tips").innerHTML = tipsHTML(p);
  document.getElementById("trust").innerHTML = trustHTML(p);
}

function renderLayerChips() {
  const el = document.getElementById("layerChips");
  el.innerHTML = ["heavy", "icy", "spring", "powder"].map(k => `<button class="chip ${k === layerKey ? "on" : ""}" data-k="${k}">${KEYS[k].icon} ${T(KEYS[k].ja, KEYS[k].en, KEYS[k].ko)}</button>`).join("");
  el.querySelectorAll(".chip").forEach(b => (b.onclick = () => { layerKey = b.dataset.k; renderLayerChips(); drawMap2(); }));
}

function color(v, max) {
  const t = Math.max(-1, Math.min(1, v / max));
  return t >= 0 ? `rgba(179,157,255,${0.15 + 0.75 * t})` : `rgba(154,215,255,${0.15 + 0.75 * -t})`;
}

function drawMap2() {
  if (!map2 || !D) return;
  if (layer2) map2.removeLayer(layer2);
  layer2 = L.layerGroup().addTo(map2);
  const tk = KEYS[layerKey].sat || layerKey, max = layerKey === "spring" ? 15 : layerKey === "share" ? 6 : 4;
  D.cells.forEach(c => {
    const t = c.trend[tk]; if (!t) return;
    L.rectangle([[c.lat - .25, c.lon - .25], [c.lat + .25, c.lon + .25]], { weight: t.p < 0.05 ? 2.5 : 0.5, color: t.p < 0.05 ? css("--ink") : "#ffffff", fillColor: color(t.slope10, max), fillOpacity: 1 })
      .bindTooltip(`NASA ${c.lat}°N ${c.lon}°E<br>${T(KEYS[layerKey].ja, KEYS[layerKey].en, KEYS[layerKey].ko)}: ${fmt(t.slope10)}${(KEYS[layerKey].sat ? T("ポイント", " pts", "%p") : T(KEYS[layerKey].unit, KEYS[layerKey].unit_en, KEYS[layerKey].unit_ko))}/${T("10年", "decade", "10년")} (p=${fmt(t.p, 2)})`).addTo(layer2)
      .on("click", () => choose(c.lat, c.lon, T(`北緯${c.lat}° 東経${c.lon}°`, `${c.lat}°N ${c.lon}°E`, `북위 ${c.lat}° 동경 ${c.lon}°`)));
  });
  D.stations.forEach(s => {
    const t = s.trend[tk]; if (!t || KEYS[layerKey].sat) return;
    L.circleMarker([s.lat, s.lon], { radius: 9, weight: t.p < 0.05 ? 3 : 1.5, color: css("--ink"), fillColor: color(t.slope10, max), fillOpacity: 1 })
      .bindTooltip(`${T("気象庁", "JMA", "기상청")} ${T(s.ja, s.en, STKO[s.en])}<br>${fmt(t.slope10)}${T(KEYS[layerKey].unit, KEYS[layerKey].unit_en, KEYS[layerKey].unit_ko)}/${T("10年", "decade", "10년")} (p=${fmt(t.p, 2)})`).addTo(layer2)
      .on("click", () => choose(s.lat, s.lon, T(s.ja, s.en, STKO[s.en])));
  });
  document.getElementById("legend").textContent = (KEYS[layerKey].sat ? T("4月に雪が残る割合の変化（NASA MODIS衛星、2001〜2026年）。", "Change in April snow cover (NASA MODIS satellite, 2001–2026). ", "4월에 눈이 남은 비율의 변화 (NASA MODIS 위성, 2001~2026년). ") : "") + T("色：紫＝増えた、青＝減った（濃いほど大きい）。太い枠＝統計的に有意（p<0.05）。四角＝NASAの約50kmマス、丸＝気象庁の観測所。", "Colour: violet = increased, blue = decreased (darker = larger). Thick outline = significant (p < 0.05). Squares = NASA ~50 km cells, circles = JMA stations.", "색: 보라 = 늘어남, 파랑 = 줄어듦 (진할수록 큼). 굵은 테두리 = 통계적으로 유의 (p < 0.05). 네모 = NASA 약 50km 칸, 동그라미 = 기상청 관측소.");
}

function renderFacts() {
  const st = D.stations.map(s => s.trend.heavy).filter(Boolean), ce = D.cells.map(c => c.trend.heavy).filter(Boolean);
  const cp = D.cells.map(c => c.trend.powder).filter(Boolean);
  const stUp = st.filter(t => t.slope10 > 0).length, stSig = st.filter(t => t.slope10 > 0 && t.p < 0.05).length;
  const ceSig = ce.filter(t => t.slope10 > 0 && t.p < 0.05).length, ceDown = ce.filter(t => t.slope10 < 0 && t.p < 0.05).length;
  const pUp = cp.filter(t => t.slope10 > 0).length, pDown = cp.filter(t => t.slope10 < 0 && t.p < 0.05).length;
  document.getElementById("facts").innerHTML = [
    ["", `${stUp}/${st.length}`, T(`気象庁の観測所で「重い雪の日」が増える方向（うち${stSig}か所は統計的に有意）`, `JMA stations where heavy-snow days rose (${stSig} significant)`, `기상청 관측소에서 「무거운 눈의 날」이 늘어나는 방향 (그중 ${stSig}곳은 통계적으로 유의)`)],
    ["", `${ceSig}/${ce.length}`, T(`NASAの約50kmマスで「重い雪の日」が有意に増加（有意に減ったマスは${ceDown}）`, `NASA ~50 km cells with a significant rise in heavy-snow days (${ceDown} significant falls)`, `NASA 약 50km 칸에서 「무거운 눈의 날」이 유의하게 증가 (유의하게 줄어든 칸은 ${ceDown})`)],
    ["s", `${D.cells.filter(c => c.trend.cov_apr && c.trend.cov_apr.slope10 < 0).length}/${D.cells.filter(c => c.trend.cov_apr).length}`, T(`NASA衛星（MODIS）で「4月に残る雪」が減ったマス（うち${D.cells.filter(c => c.trend.cov_apr && c.trend.cov_apr.slope10 < 0 && c.trend.cov_apr.p < 0.05).length}は有意）。北海道全体で10年に${fmt(-D.hokkaido.trend.cov_apr.slope10, 0)}ポイント減`, `NASA cells where April snow cover fell, seen by the MODIS satellite (${D.cells.filter(c => c.trend.cov_apr && c.trend.cov_apr.slope10 < 0 && c.trend.cov_apr.p < 0.05).length} significant). All Hokkaido: −${fmt(-D.hokkaido.trend.cov_apr.slope10, 0)} points per decade`, `NASA 위성(MODIS)에서 「4월에 남는 눈」이 줄어든 칸 (그중 ${D.cells.filter(c => c.trend.cov_apr && c.trend.cov_apr.slope10 < 0 && c.trend.cov_apr.p < 0.05).length}칸은 유의). 홋카이도 전체로 10년마다 ${fmt(-D.hokkaido.trend.cov_apr.slope10, 0)}%p 감소`)],
    ["", `${D.stations.filter(x => x.trend.slr && x.trend.slr.slope10 < 0).length}/${D.stations.filter(x => x.trend.slr).length}`, T(`気象庁の観測所で「同じ水の量で積もる雪」が減少＝雪そのものが重くなった（${D.stations.filter(x => x.trend.slr && x.trend.slr.slope10 < 0 && x.trend.slr.p < 0.05).length}か所で有意、JAXA衛星×気象庁）`, `JMA stations where snow per mm of water fell — the snow itself got heavier (${D.stations.filter(x => x.trend.slr && x.trend.slr.slope10 < 0 && x.trend.slr.p < 0.05).length} significant; JAXA satellite × JMA)`, `기상청 관측소에서 「같은 물로 쌓이는 눈」이 감소 = 눈 자체가 무거워짐 (${D.stations.filter(x => x.trend.slr && x.trend.slr.slope10 < 0 && x.trend.slr.p < 0.05).length}곳 유의, JAXA 위성×기상청)`)],
    ["p", `${pUp}/${cp.length}`, T(`NASAのマスで「軽い雪の日」が増えた数（有意に減ったマスは${pDown}）`, `NASA cells where light-snow days rose (${pDown} significant falls)`, `NASA 칸에서 「가벼운 눈의 날」이 늘어난 수 (유의하게 줄어든 칸은 ${pDown})`)],
  ].filter(([c]) => c !== "p").map(([c, b, t]) => `<div class="fact ${c}"><b>${b}</b><span>${t}</span></div>`).join("");
  const C = D.cause, sap = C.stations.find(x => x.en === "Sapporo");
  document.getElementById("why").innerHTML = `<p class="lbl mono">${T("なぜ？", "Why?", "왜?")}</p>
    <p>${T(`北海道の冬（12〜3月）は10年で${fmt(C.hok_trend.slope10, 2)}℃ずつ暖かくなりました（NASAの${C.n_cells}マスすべてで上昇・うち${C.cells_sig_up}マスで有意、気象庁は${C.stations_warm_sig}/${C.stations.length}か所で有意）。暖かい冬ほど重い雪の日が多く（${C.stations_positive_link}/${C.stations.length}か所）、<b>増えた分のおよそ${fmt(C.explained_share * 100, 0)}%はこの気温の上昇だけで説明できます</b>（札幌は${fmt(100 * sap.explained_change / sap.observed_change, 0)}%）。ニセコや稚内のような小さな町も同じように暖かくなっており、都市の熱だけではありません。`,
      `Hokkaido winters (Dec–Mar) warmed by ${fmt(C.hok_trend.slope10, 2)} °C per decade (NASA: up in ${C.cells_up} of ${C.n_cells} cells, ${C.cells_sig_up} significant; JMA: significant at ${C.stations_warm_sig}/${C.stations.length} stations). Warmer winters bring more heavy-snow days (${C.stations_positive_link}/${C.stations.length} stations), and <b>warming alone explains about ${fmt(C.explained_share * 100, 0)}% of the increase</b> (Sapporo ${fmt(100 * sap.explained_change / sap.observed_change, 0)}%). Small towns such as Niseko and Wakkanai warmed as much as Sapporo, so this is not just city heat.`,
      `홋카이도 겨울(12~3월)은 10년에 ${fmt(C.hok_trend.slope10, 2)}℃씩 따뜻해졌습니다 (NASA ${C.n_cells}칸 모두 상승·그중 ${C.cells_sig_up}칸 유의, 기상청 ${C.stations_warm_sig}/${C.stations.length}곳 유의). 따뜻한 겨울일수록 무거운 눈의 날이 많고 (${C.stations_positive_link}/${C.stations.length}곳), <b>늘어난 양의 약 ${fmt(C.explained_share * 100, 0)}%는 이 기온 상승만으로 설명됩니다</b> (삿포로 ${fmt(100 * sap.explained_change / sap.observed_change, 0)}%). 니세코·왓카나이 같은 작은 마을도 똑같이 따뜻해져서, 도시 열섬만은 아닙니다.`)}</p>
    <p class="note">${T("残りは、水蒸気の増加（JAXAの冬の降水は43マスすべてで増える向き）や年ごとの自然の変動などが考えられます。地球温暖化そのものを私たちが証明したわけではありませんが、国の報告書「日本の気候変動2025」（文部科学省・気象庁）が示す方向と同じです。",
      "The rest may come from more water vapour (JAXA winter precipitation leans up in all 43 cells) and natural year-to-year variability. We do not prove global warming ourselves, but the direction matches Japan's national assessment, Climate Change in Japan 2025 (MEXT & JMA).",
      "나머지는 수증기 증가(JAXA 겨울 강수는 43칸 모두 증가 방향)나 해마다의 자연 변동 등으로 생각됩니다. 지구 온난화 자체를 저희가 증명한 건 아니지만, 나라의 보고서 「日本の気候変動2025」(문부과학성·기상청)가 보여 주는 방향과 같습니다.")}</p>`;
  const F = D.field, mark = p => (p < 0.05 ? "✅" : p < 0.1 ? "🟡" : "⚪");
  const row = (k, ja, en, ko) => `<li>${mark(F[k].p_field)} ${T(ja, en, ko)}：${T(`${F[k].of}マス中${F[k].cells_sig}マスが有意に${F[k].direction === "up" ? "増加" : "減少"}`, `${F[k].cells_sig} of ${F[k].of} cells significantly ${F[k].direction === "up" ? "up" : "down"}`, `${F[k].of}칸 중 ${F[k].cells_sig}칸이 유의하게 ${F[k].direction === "up" ? "증가" : "감소"}`)} → ${T("偶然の確率", "chance", "우연일 확률")} p=${fmt(F[k].p_field, 3)}${T(`（多重比較の補正後も${F[k].cells_fdr}マス）`, ` (${F[k].cells_fdr} cells survive FDR correction)`, ` (다중 비교 보정 후에도 ${F[k].cells_fdr}칸)`)}</li>`;
  document.getElementById("field").innerHTML = `<details><summary>${T("🔍 偶然ではないの？（北海道全体での確かめ）", "🔍 Could this be chance? (Hokkaido-wide check)", "🔍 우연은 아닐까? (홋카이도 전체로 확인)")}</summary>
  <p class="note">${T("43マスも調べると、偶然に「有意」になるマスも出ます。そこで冬の順番を500回シャッフルし、同じくらい多くのマスが偶然そろう確率を計算しました（となりのマスどうしの似かたはそのまま）。", "With 43 cells, some can look significant by chance. We shuffled the order of winters 500 times (same shuffle for every cell, so neighbouring cells stay alike) and counted how often this many cells line up by chance.", "43칸이나 조사하면 우연히 「유의」가 되는 칸도 나옵니다. 그래서 겨울 순서를 500번 섞어서, 이만큼 많은 칸이 우연히 맞아떨어질 확률을 계산했습니다 (이웃 칸끼리 닮은 점은 그대로 유지).")}</p><ul>
  ${row("cov_apr", "4月に残る雪（衛星）", "April snow cover (satellite)", "4월에 남는 눈 (위성)")}${row("heavy", "重い雪の日", "Heavy-snow days", "무거운 눈의 날")}${row("icy", "つるつる路面の日", "Icy-road days", "빙판길 날")}${row("powder", "軽い雪の日", "Light-snow days", "가벼운 눈의 날")}${row("cov_dec", "12月の雪（衛星）", "December snow cover (satellite)", "12월의 눈 (위성)")}</ul>
  <p class="note">${(() => { const H = D.sensitivity.heavy; return T(`決まりを変えても同じ？ 「重い雪」の基準を${H.map(h => h.t + "℃").join("・")}に変えても、気象庁は${H.map(h => h.jma_up + "/" + h.n_jma).join("・")}か所で増加、NASAで有意に減ったマスはどれも${Math.max(...H.map(h => h.nasa_sig_down))}。結果は基準の選び方に左右されません。`,
    `Does the rule matter? With the heavy-snow cut-off at ${H.map(h => h.t + " °C").join(", ")}, JMA stations rising: ${H.map(h => h.jma_up + "/" + h.n_jma).join(", ")}; NASA cells with a significant fall: ${Math.max(...H.map(h => h.nasa_sig_down))} in every case. The result does not hinge on the cut-off.`,
    `기준을 바꿔도 같을까? 「무거운 눈」 기준을 ${H.map(h => h.t + "℃").join("·")}로 바꿔도 기상청은 ${H.map(h => h.jma_up + "/" + h.n_jma).join("·")}곳에서 증가, NASA에서 유의하게 줄어든 칸은 모두 ${Math.max(...H.map(h => h.nasa_sig_down))}. 결과가 기준 선택에 좌우되지 않습니다.`); })()}</p>
  <p class="note">${T("✅ 偶然の確率5%未満　🟡 10%未満　多重比較の補正：ベンジャミニ・ホッホベルグ法（FDR 5%）", "✅ chance < 5%  🟡 < 10%  Multiple-testing correction: Benjamini–Hochberg (FDR 5%)", "✅ 우연일 확률 5% 미만  🟡 10% 미만  다중 비교 보정: 벤야미니-호흐베르크 방법 (FDR 5%)")}</p></details>`;
}

async function shareCard() {
  const p = places[0], near = p.dist <= 40, s = near ? p.st.series : p.cell.series;
  const a = k => mean(s[k].slice(0, 10)), b = k => mean(s[k].slice(-10));
  const W = 1080, H = 1080, cv = document.createElement("canvas"); cv.width = W; cv.height = H; const g = cv.getContext("2d");
  g.fillStyle = "#f5f8fc"; g.fillRect(0, 0, W, H); g.fillStyle = "#2c74d4"; g.fillRect(0, 0, 36, H);
  g.fillStyle = "#10233f"; g.font = "900 64px 'Noto Sans JP'"; g.fillText(placeLabel(p), 90, 150);
  g.font = "700 34px 'Noto Sans JP'"; g.fillStyle = "#2c74d4"; g.fillText(T("わが街の雪質カルテ　1990年代 → 2020年代", "My Town Snow-Quality Chart · 1990s → 2020s", "우리 동네 눈 품질 카르테 · 1990년대 → 2020년대"), 90, 215);
  const rows = [["💧", T("重い雪の日", "Heavy-snow days", "무거운 눈의 날"), "heavy", "#c2410c"], ["❄️", T("軽い雪の日", "Light-snow days", "가벼운 눈의 날"), "powder", "#2c74d4"], ["🧊", T("つるつる路面の日", "Icy-road days", "빙판길 날"), "icy", "#0e7490"]];
  rows.forEach(([ic, lab, k, col], i) => {
    const y = 360 + i * 190; g.fillStyle = "#ffffff"; g.fillRect(90, y - 90, 900, 160); g.strokeStyle = "#d6e2f1"; g.strokeRect(90, y - 90, 900, 160);
    g.fillStyle = "#10233f"; g.font = "700 40px 'Noto Sans JP'"; g.fillText(`${ic} ${lab}`, 120, y - 25);
    g.font = "900 64px 'Noto Sans JP'"; g.fillStyle = col; g.fillText(`${fmt(a(k), 0)} → ${fmt(b(k), 0)}${T("日", " days", "일")}`, 120, y + 50);
  });
  g.fillStyle = "#4b6385"; g.font = "400 28px 'Noto Sans JP'";
  g.fillText(T(`データ：NASA POWER・JAXA GSMaP・気象庁${near ? p.st.ja : ""}（冬＝12〜3月）`, `Data: NASA POWER, JAXA GSMaP, JMA ${near ? p.st.en : ""} (winter = Dec–Mar)`, `자료: NASA POWER · JAXA GSMaP · 기상청 ${near ? (STKO[p.st.en] || p.st.en) : ""} (겨울 = 12~3월)`), 90, 960);
  g.fillText("Snow Trend Detective · NASA Space Apps 2026", 90, 1010);
  const blob = await new Promise(r => cv.toBlob(r, "image/png")); const file = new File([blob], "snow-karte.png", { type: "image/png" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: "わが街の雪質カルテ" }); return; } catch (e) {} }
  const u = URL.createObjectURL(blob), l = document.createElement("a"); l.href = u; l.download = "snow-karte.png"; l.click(); setTimeout(() => URL.revokeObjectURL(u), 2000);
}

// 7-day forecast (Open-Meteo), classified with the same rules as the 35-year chart
async function loadForecast(p) {
  const key = `${p.la.toFixed(2)},${p.lo.toFixed(2)}`; if (key === fcKey && FC) return renderForecast(); fcKey = key; FC = null; renderForecast();
  try {
    const u = `https://api.open-meteo.com/v1/forecast?latitude=${p.la.toFixed(3)}&longitude=${p.lo.toFixed(3)}&daily=temperature_2m_mean,temperature_2m_max,temperature_2m_min,snowfall_sum,rain_sum&timezone=auto&forecast_days=7`;
    let j = null;
    for (let k = 0; k < 4 && !j; k++) {
      const ac = new AbortController(), tm = setTimeout(() => ac.abort(), 9000);
      try { const r = await fetch(u, { signal: ac.signal, cache: "no-store" }); if (r.ok) { const x = await r.json(); if (x && x.daily) j = x; } } catch (e) {}
      clearTimeout(tm); if (!j) await new Promise(r => setTimeout(r, 1200 * (k + 1)));
    }
    if (key !== fcKey) return;
    // keep the last good forecast so a live demo still works if the forecast server is unreachable
    if (j && j.daily) { FC = j.daily; try { localStorage.setItem("fc:" + key, JSON.stringify({ t: Date.now(), d: j.daily })); } catch (e) {} }
    else { let c = null; try { c = JSON.parse(localStorage.getItem("fc:" + key)); } catch (e) {} FC = c ? Object.assign(c.d, { cachedAt: c.t }) : { error: true }; }
  } catch (e) { FC = { error: true }; }
  renderForecast();
}
function fcClass(d, i) {
  const tm = d.temperature_2m_mean[i], tx = d.temperature_2m_max[i], tn = d.temperature_2m_min[i], sn = d.snowfall_sum[i], rn = d.rain_sum[i];
  const wet = rn >= 1 || (sn >= 1 && tm > -2);           // rain or wet, heavy snow today
  const freezeNext = i + 1 < d.time.length ? d.temperature_2m_min[i + 1] <= -2 : false;   // a clear refreeze, not just a frosty morning
  const out = [];
  if (sn >= 1) out.push(tm <= -5 ? ["powder", "❄️", T("軽い雪", "Light snow", "가벼운 눈")] : tm > -2 ? ["heavy", "💧", T("重い雪", "Heavy snow", "무거운 눈")] : ["mid", "🌨️", T("ふつうの雪", "Snow", "보통 눈")]);
  if (wet && (tn <= -2 || freezeNext)) out.push(["warn", "⚠️", T("転倒注意：ぬれた雪・雨が凍る", "Fall risk: wet snow/rain freezes", "낙상 주의: 젖은 눈·비가 얼어요")]);
  else if (tx > 0 && tn < 0) out.push(["icy", "🧊", T("つるつる路面", "Icy roads", "빙판길")]);
  if (!out.length) out.push(["none", "·", sn > 0 ? T("雪わずか", "Light snow", "눈 조금") : T("雪なし", "No snow", "눈 없음")]);
  return out;
}
function renderForecast() {
  renderSummary(); setTimeout(() => { if (TL === 35) tlFrame(); }, 0);
  const el = document.getElementById("fc"), note = document.getElementById("fcNote");
  if (!FC) { el.innerHTML = `<p class="note">${T("予報を読みこみ中…", "Loading forecast…", "예보 불러오는 중…")}</p>`; note.textContent = ""; return; }
  if (FC.error) { el.innerHTML = `<p class="note">${T("予報を読みこめませんでした", "Could not load the forecast", "예보를 불러오지 못했습니다")} <button class="chip" id="fcRetry">${T("もう一度", "Try again", "다시 불러오기")}</button></p>`;
    document.getElementById("fcRetry").onclick = () => { fcKey = ""; loadForecast(places[0]); }; return; }
  const wd = T(["日", "月", "火", "水", "木", "金", "土"], ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], ["일", "월", "화", "수", "목", "금", "토"]);
  el.innerHTML = FC.time.map((t, i) => {
    const dt = new Date(t + "T00:00:00"), c = fcClass(FC, i);
    return `<div class="fcd ${c.some(x => x[0] === "warn") ? "warn" : c[0][0]}"><div class="dd">${i === 0 ? T("今日", "Today", "오늘") : `${dt.getMonth() + 1}/${dt.getDate()}(${wd[dt.getDay()]})`}</div>
      <div class="ic">${c.map(x => x[1]).join("")}</div><div class="lb">${c.map(x => x[2]).join("<br>")}</div>
      <div class="tt">${fmt(FC.temperature_2m_min[i], 0)}${T("〜", "–", "~")}${fmt(FC.temperature_2m_max[i], 0)}℃${FC.snowfall_sum[i] > 0 ? ` · ❄${fmt(FC.snowfall_sum[i], 0)}cm` : ""}</div></div>`;
  }).join("");
  note.innerHTML = (FC.cachedAt ? `<b>${T("予報サーバーにつながらないため、前回読みこんだ予報を表示しています", "Forecast server unreachable — showing the last forecast loaded", "예보 서버에 연결되지 않아 지난번에 불러온 예보를 보여 줍니다")} (${new Date(FC.cachedAt).toLocaleString()})</b><br>` : "") + T("35年のカルテと同じ決まり（雪の日の平均気温 −5℃以下＝軽い雪、−2℃より暖かい＝重い雪、最高0℃超・最低0℃未満＝つるつる）で判定。⚠️は「雨やぬれた雪のあと、−2℃以下まで冷えて凍る」日で、札幌で転倒が特に多かった日の条件です。予報：Open-Meteo（気象機関の数値予報モデル）。",
    "Same rules as the 35-year chart (snow day mean ≤ −5 °C = light snow, > −2 °C = heavy, max > 0 °C and min < 0 °C = icy). ⚠️ marks rain or wet snow followed by a freeze to −2 °C or below — the conditions of Sapporo's worst fall days. Forecast: Open-Meteo (national weather service models).", "35년 카르테와 같은 규칙(눈 온 날 평균 기온 −5℃ 이하 = 가벼운 눈, −2℃보다 따뜻함 = 무거운 눈, 최고 0℃ 초과·최저 0℃ 미만 = 빙판길)으로 판정. ⚠️는 「비나 젖은 눈 뒤에 −2℃ 이하로 얼어붙는」 날로, 삿포로에서 낙상이 특히 많았던 날의 조건입니다. 예보: Open-Meteo (기상기관 수치예보 모델).");
}

// Left panel: grainy noise landscape. Top = snowy sky (white/grey), then light snow blue, teal, wet-snow orange, dark ground.
function drawGrain() {
  const cv = document.getElementById("grain"); if (!cv) return;
  const w = Math.max(2, Math.round(cv.clientWidth / 2)), h = Math.max(2, Math.round(cv.clientHeight / 2));
  cv.width = w; cv.height = h; const g = cv.getContext("2d"), im = g.createImageData(w, h), a = im.data;
  const stops = [[0, [196, 200, 204]], [.22, [168, 176, 190]], [.38, [96, 128, 186]], [.5, [70, 150, 150]], [.6, [208, 132, 78]], [.7, [150, 96, 60]], [.82, [72, 78, 52]], [1, [40, 44, 30]]];
  const col = t => { let i = 0; while (i < stops.length - 2 && t > stops[i + 1][0]) i++; const [t0, c0] = stops[i], [t1, c1] = stops[i + 1], f = Math.min(1, Math.max(0, (t - t0) / (t1 - t0))); return c0.map((v, k) => v + (c1[k] - v) * f); };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = y / h + (Math.random() - .5) * .07 + Math.sin(x / w * 6 + y / h * 3) * .012, c = col(t), n = (Math.random() - .5) * 64, sp = Math.random();
      const o = (y * w + x) * 4;
      if (sp < .025) { a[o] = 245; a[o + 1] = 246; a[o + 2] = 250; }            // snow flecks
      else if (sp < .05) { a[o] = 40; a[o + 1] = 70 + 60 * Math.random(); a[o + 2] = 200; }
      else { a[o] = c[0] + n; a[o + 1] = c[1] + n; a[o + 2] = c[2] + n; }
      a[o + 3] = 255;
    }
  }
  g.putImageData(im, 0, 0);
}

// 2050 preview: extend the Sen's-slope trend line; range = 95 % confidence interval of the slope (not a forecast)
function senFit(ser, x0) {
  const v = ser.map((y, i) => [x0 + i, y]).filter(p => p[1] != null), n = v.length; if (n < 10) return null;
  const sl = []; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) sl.push((v[j][1] - v[i][1]) / (v[j][0] - v[i][0]));
  sl.sort((a, b) => a - b); const N = sl.length, med = x => { const a = [...x].sort((p, q) => p - q); return a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2; };
  const b = med(sl), c = 1.96 * Math.sqrt(n * (n - 1) * (2 * n + 5) / 18), lo = sl[Math.max(0, Math.floor((N - c) / 2))], hi = sl[Math.min(N - 1, Math.ceil((N + c) / 2))];
  const a0 = med(v.map(([x, y]) => y - b * x));
  return { b, lo, hi, at: x => a0 + b * x, xm: med(v.map(p => p[0])), ym: a0 + b * med(v.map(p => p[0])) };
}
function renderProj(p, Y = 2050) {
  const near = p.dist <= 40, src = near ? p.st : p.cell;
  const i01 = D.winters.indexOf(2001);
  const items = [["heavy", src.series.heavy, D.winters[0], (near ? p.st : p.cell).trend.heavy], ["storm", p.st.series.storm_wet.slice(i01), 2001, p.st.trend.storm_wet]];
  const html = items.map(([k, ser, x0, tr]) => {
    const f = senFit(ser, x0); if (!f) return "";
    const K = KEYS[k], unit = T(K.unit, K.unit_en, K.unit_ko), cap = k === "spring" ? 100 : Infinity, clip = v => Math.max(0, Math.min(cap, v));
    const now = mean(ser.slice(-10)), mid = clip(f.at(Y)), lo = clip(f.ym + f.lo * (Y - f.xm)), hi = clip(f.ym + f.hi * (Y - f.xm));
    const top = Math.max(hi, now, ...ser.filter(x => x != null)) * 1.1 || 1, pc = v => (100 * v / top).toFixed(1) + "%";
    const color = css(K.color);
    return `<div class="pj"><div class="k">${K.icon} ${T(K.ja, K.en, K.ko)}</div>
      <div class="v">${fmt(mid, 0)}${unit}</div>
      <div class="note">${T(`2020年代 ${fmt(now, 0)}${unit} → ${Y}年 ${fmt(lo, 0)}〜${fmt(hi, 0)}${unit}`, `2020s ${fmt(now, 0)}${unit} → ${Y} range ${fmt(lo, 0)}–${fmt(hi, 0)}${unit}`, `2020년대 ${fmt(now, 0)}${unit} → ${Y}년 ${fmt(lo, 0)}~${fmt(hi, 0)}${unit}`)}</div>
      <div class="bar"><i style="left:${pc(Math.min(lo, hi))};width:calc(${pc(Math.abs(hi - lo))} + 2px);background:${color}"></i><u style="left:${pc(now)}"></u><s style="left:${pc(mid)};background:${color}"></s></div>
      <div class="ax"><span>0</span><span>${T("縦線＝2020年代", "line = 2020s", "선 = 2020년대")}</span><span>${fmt(top, 0)}</span></div>
      ${tr && tr.p >= 0.1 ? `<p class="note">${T("この街だけの傾きはまだ有意でないため、参考程度に。", "This town's own trend is not yet significant — treat as a rough hint.", "이 동네만의 기울기는 아직 유의하지 않아 참고 정도로.")}</p>` : ""}</div>`;
  }).join("");
  document.getElementById("proj").innerHTML = `<h2>${T(`${Y}年、このままの傾きなら。`, `${Y}, if the trend simply continues.`, `${Y}년, 지금 기울기 그대로라면.`)}</h2>
    <div class="proj-grid">${html}</div>
    <p class="note">${T("35年（JAXAの大雪は26年）の傾き（セン傾き）をそのまま2050年までのばした値です。4月の雪のような割合（％）は0より下がらず直線でのばせないため、ここには入れていません。幅は傾きの95%信頼区間。気候は一直線には変わらないので、<b>予報ではなく「今の傾きの意味」を感じるための目安</b>です。",
      "The 35-year (JAXA storms: 26-year) Sen's slope simply extended to 2050 (percentages such as April snow cover cannot go below 0, so they are not extended); the range is the slope's 95 % confidence interval. Climate does not change in a straight line, so this is <b>not a forecast</b> — just a way to feel what today's trend means.",
      "35년(JAXA 폭설은 26년)의 기울기(센 기울기)를 2050년까지 그대로 늘린 값입니다. 4월 눈 같은 비율(%)은 0 아래로 내려갈 수 없어 직선으로 늘릴 수 없으므로 넣지 않았습니다. 범위는 기울기의 95% 신뢰구간입니다. 기후는 일직선으로 바뀌지 않으므로 <b>예보가 아니라 「지금 기울기의 의미」를 느끼기 위한 기준</b>입니다.")}</p>`;
}


// ---------- research page: cause decomposition, where it changes, worldwide, limits ----------
function renderWhy() {
  whyCharts.forEach(c => c.destroy()); whyCharts = [];
  const C = D.cause, st = C.stations, tOnly = C.explained_share * 100, tp = C.explained_share_tp * 100;
  document.getElementById("why1").innerHTML = `<h2>${T("暖かさで約半分、水分でさらに2割。", "Warming explains about half; more moisture adds a fifth.", "따뜻해짐이 약 절반, 수분이 2할 더.")}</h2>
    <div class="stack"><i style="width:${tOnly}%;background:var(--heavy)">${T("気温", "warming", "기온")} ${fmt(tOnly, 0)}%</i><i style="width:${tp - tOnly}%;background:var(--blue)">${T("水分", "moisture", "수분")} +${fmt(tp - tOnly, 0)}%</i><i style="width:${100 - tp}%;background:var(--line)">${T("その他", "other", "기타")} ${fmt(100 - tp, 0)}%</i></div>
    <p>${T(`気象庁10観測所の35回の冬で、重い雪の日の増加のうち、冬の気温の上昇だけで約${fmt(tOnly, 0)}%、冬の降水（NASA POWER）の増加を加えると約${fmt(tp, 0)}%を説明できます。冬の降水は${C.stations_precip_up}/${st.length}か所で増えていました。残りは年ごとの自然の変動などです。`,
      `Across 35 winters at 10 JMA stations, winter warming alone explains about ${fmt(tOnly, 0)}% of the rise in heavy-snow days; adding the rise in winter precipitation (NASA POWER) explains about ${fmt(tp, 0)}%. Winter precipitation rose at ${C.stations_precip_up}/${st.length} stations. The rest is year-to-year natural variability and other factors.`,
      `기상청 관측소 10곳의 35번 겨울에서, 무거운 눈의 날 증가 중 겨울 기온 상승만으로 약 ${fmt(tOnly, 0)}%, 겨울 강수(NASA POWER) 증가를 더하면 약 ${fmt(tp, 0)}%가 설명됩니다. 겨울 강수는 ${C.stations_precip_up}/${st.length}곳에서 늘었습니다. 나머지는 해마다의 자연 변동 등입니다.`)}</p>
    <div class="wchart"><canvas id="wc1"></canvas></div>
    <p class="note">${T("方法：観測所ごとに、長期の傾きを取りのぞいた年ごとの値で「重い雪の日」を気温と降水に回帰し、35年の気温・降水の変化をかけて説明できる量を出しました。", "Method: at each station, heavy-snow days were regressed on detrended winter temperature and precipitation; multiplying by their 35-year changes gives the explained part.", "방법: 관측소마다 장기 추세를 뺀 해마다 값으로 무거운 눈의 날을 기온과 강수에 회귀하고, 35년 동안의 기온·강수 변화를 곱해 설명되는 양을 구했습니다.")}</p>`;
  whyCharts.push(new Chart(document.getElementById("wc1"), { type: "bar", data: { labels: st.map(x => T(D.stations.find(y => y.id === x.id).ja, x.en, STKO[x.en] || x.en)),
    datasets: [{ label: T("実際の増加（日）", "Observed rise (days)", "실제 증가 (일)"), data: st.map(x => x.observed_change), backgroundColor: css("--ink") + "cc" },
      { label: T("気温で説明", "Explained by warming", "기온으로 설명"), data: st.map(x => x.explained_change), backgroundColor: css("--heavy") },
      { label: T("気温＋水分で説明", "Warming + moisture", "기온+수분으로 설명"), data: st.map(x => x.explained_change_tp), backgroundColor: css("--blue") }] },
    options: { animation: false, maintainAspectRatio: false, plugins: { legend: { labels: { boxWidth: 10, font: { size: 11 } } } }, scales: { x: { ticks: { font: { size: 10 } } }, y: { beginAtZero: true } } } }));

  // where in Hokkaido
  const Z = C.zones, pts = D.cells.filter(c => c.trend.heavy).map(c => ({ x: c.tmean, y: c.trend.heavy.slope10, sig: c.trend.heavy.p < 0.05 }));
  const hot = D.cells.filter(c => c.tmean >= -5 && c.tmean < -3).length;
  document.getElementById("why2").innerHTML = `<h2>${T("暖かい場所ほど、もう変わった。次は −5〜−3℃の街。", "The warmer the place, the more it has changed. Next: towns at −5 to −3 °C.", "따뜻한 곳일수록 이미 바뀌었다. 다음은 −5~−3℃인 동네.")}</h2>
    <div class="wchart"><canvas id="wc2"></canvas></div>
    <table class="zt"><tr><th>${T("冬の平均気温", "Winter mean", "겨울 평균기온")}</th><th>${T("マス", "cells", "칸")}</th><th>${T("重い雪の日（10年あたり）", "Heavy-snow days per decade", "무거운 눈의 날 (10년당)")}</th><th>${T("有意に増加", "significant rise", "유의 증가")}</th></tr>
    ${Z.map(z => `<tr><td>${z.lo < -50 ? "< " + z.hi : z.hi > 50 ? "≥ " + z.lo : z.lo + " … " + z.hi} ℃</td><td>${z.n}</td><td><b>${z.heavy_slope > 0 ? "+" : ""}${fmt(z.heavy_slope, 2)}</b></td><td>${z.sig_up}</td></tr>`).join("")}</table>
    <p>${T(`北海道の43マスを冬の平均気温で分けると、すでに −3℃より暖かいマスでは重い雪の日が10年に約${fmt(Z[Z.length - 1].heavy_slope, 1)}日ずつ増え、−7℃より寒い内陸ではほとんど変わっていません。暖かくなるにつれて、いま −5〜−3℃の${hot}マスが次に変わると考えられます。市は、このような場所の砂まき・除雪の備えを先に考えられます。`,
      `Splitting Hokkaido's 43 cells by winter mean temperature: cells already warmer than −3 °C gained about ${fmt(Z[Z.length - 1].heavy_slope, 1)} heavy-snow days per decade, while the cold interior below −7 °C barely changed. As winters warm, the ${hot} cells now at −5 to −3 °C are likely next — places where the city can plan grit and snow removal first.`,
      `홋카이도 43칸을 겨울 평균기온으로 나누면, 이미 −3℃보다 따뜻한 칸은 무거운 눈의 날이 10년에 약 ${fmt(Z[Z.length - 1].heavy_slope, 1)}일씩 늘었고, −7℃보다 추운 내륙은 거의 그대로입니다. 따뜻해짐에 따라 지금 −5~−3℃인 ${hot}칸이 다음 차례로 보입니다. 시는 이런 곳의 모래·제설 대비를 먼저 생각할 수 있습니다.`)}</p>`;
  whyCharts.push(new Chart(document.getElementById("wc2"), { type: "scatter", data: { datasets: [
    { label: T("有意（p<0.05）", "significant (p < 0.05)", "유의 (p<0.05)"), data: pts.filter(q => q.sig), backgroundColor: css("--heavy"), pointRadius: 5 },
    { label: T("有意でない", "not significant", "유의하지 않음"), data: pts.filter(q => !q.sig), backgroundColor: css("--gray"), pointRadius: 4 }] },
    options: { animation: false, maintainAspectRatio: false, scales: { x: { title: { display: true, text: T("冬の平均気温（℃）", "Winter mean temperature (°C)", "겨울 평균기온 (℃)") } }, y: { title: { display: true, text: T("重い雪の日 / 10年", "Heavy-snow days / decade", "무거운 눈의 날 / 10년") } } } } }));

  // worldwide
  const WZ = C.world_zones || [], tot = WZ.reduce((a, z) => a + z.n, 0);
  document.getElementById("why3").innerHTML = WZ.length ? `<h2>${T("世界でも、−10〜−2℃の地域で雪が重くなる向き。", "Worldwide, too, snow turns heavier where winters average −10 to −2 °C.", "세계에서도 −10~−2℃ 지역에서 눈이 무거워지는 쪽.")}</h2>
    <div class="wchart"><canvas id="wc3"></canvas></div>
    <p>${T(`雪の降る世界の陸地${tot}地点（5度ごと、NASA POWER、1992〜2026年）で同じ計算をしました。−10℃より寒い地域では重い雪はほぼ変わらず、軽い雪はむしろ増える向きです。−10〜−2℃では重い雪が増え、軽い雪が減る向きで、北海道（冬の平均 約${fmt(mean(C.hok_temp), 0)}℃）はちょうどこの温度帯にあります。地点が少ないので、ここは「傾向」として見てください。`,
      `We ran the same analysis at ${tot} snowy land points worldwide (5° grid, NASA POWER, 1992–2026). Below −10 °C heavy snow barely changes and light snow even leans up; between −10 and −2 °C heavy snow rises and light snow falls — and Hokkaido (winter mean about ${fmt(mean(C.hok_temp), 0)} °C) sits right in that band. The grid is coarse, so treat this as a tendency.`,
      `눈이 오는 세계 육지 ${tot}지점(5도 간격, NASA POWER, 1992~2026년)에서 같은 계산을 했습니다. −10℃보다 추운 곳은 무거운 눈이 거의 그대로이고 가벼운 눈은 오히려 늘어나는 쪽입니다. −10~−2℃에서는 무거운 눈이 늘고 가벼운 눈이 줄어드는 쪽이며, 홋카이도(겨울 평균 약 ${fmt(mean(C.hok_temp), 0)}℃)는 바로 이 온도대에 있습니다. 지점이 적으니 "경향"으로 봐 주세요.`)}</p>
    <p class="note">${T("地球儀のどこでもクリックすると、その場所の35年をこのページと同じ決まりで計算します。", "Click anywhere on the home globe to compute that place with the same rules.", "홈 지구본에서 아무 곳이나 누르면 그 장소의 35년을 같은 규칙으로 계산합니다.")}</p>` : "";
  if (WZ.length) whyCharts.push(new Chart(document.getElementById("wc3"), { type: "bar", data: { labels: WZ.map(z => (z.lo < -50 ? "< " + z.hi : z.hi > 50 ? "≥ " + z.lo : z.lo + "…" + z.hi) + "℃ (n=" + z.n + ")"),
    datasets: [{ label: T("重い雪の日 / 10年", "Heavy-snow days / decade", "무거운 눈의 날 / 10년"), data: WZ.map(z => z.heavy_slope), backgroundColor: css("--heavy") },
      { label: T("軽い雪の日 / 10年", "Light-snow days / decade", "가벼운 눈의 날 / 10년"), data: WZ.map(z => z.light_slope), backgroundColor: css("--blue") }] },
    options: { animation: false, maintainAspectRatio: false, plugins: { legend: { labels: { boxWidth: 10, font: { size: 11 } } } } } }));

  // limits
  const F = D.field, H = D.sensitivity.heavy;
  document.getElementById("why4").innerHTML = `<ul class="dots">
    <li>${T(`偶然ではないか：冬の順番を500回シャッフル → 重い雪 ${fmt(F.heavy.p_field * 100, 1)}%、4月の雪 ${fmt(F.cov_apr.p_field * 100, 1)}%。多重比較の補正後も重い雪 ${F.heavy.cells_fdr}マス、4月の雪 ${F.cov_apr.cells_fdr}マスが有意。`, `Chance? 500 shuffles of winter order: heavy snow ${fmt(F.heavy.p_field * 100, 1)}%, April snow ${fmt(F.cov_apr.p_field * 100, 1)}%. After FDR correction ${F.heavy.cells_fdr} and ${F.cov_apr.cells_fdr} cells remain significant.`, `우연일까: 겨울 순서를 500번 섞음 → 무거운 눈 ${fmt(F.heavy.p_field * 100, 1)}%, 4월 눈 ${fmt(F.cov_apr.p_field * 100, 1)}%. 다중 비교 보정 후에도 무거운 눈 ${F.heavy.cells_fdr}칸, 4월 눈 ${F.cov_apr.cells_fdr}칸 유의.`)}</li>
    <li>${T(`決まりを変えても：重い雪の基準を ${H.map(x => x.t).join("・")}℃ にしても、気象庁は ${H.map(x => x.jma_up).join("・")}/10か所で増加、有意に減ったNASAマスは0。`, `Rule changed: heavy-snow cut-off at ${H.map(x => x.t).join(", ")} °C → JMA stations rising ${H.map(x => x.jma_up).join(", ")}/10; NASA cells with a significant fall: 0.`, `기준을 바꿔도: 무거운 눈 기준 ${H.map(x => x.t).join("·")}℃ → 기상청 ${H.map(x => x.jma_up).join("·")}/10곳 증가, 유의하게 줄어든 NASA 칸 0.`)}</li>
    <li>${T("国の報告書との比較：「日本の気候変動2025」（文部科学省・気象庁）も、北海道内陸の極端な大雪の増加の可能性、水蒸気の増加、ざらめ雪の割合の増加を示しています。同じ向きです。", "National assessment: Climate Change in Japan 2025 (MEXT & JMA) also points to possible increases in extreme snowfall in inland Hokkaido, more water vapour and more coarse, refrozen snow — the same direction.", "나라의 보고서: 「日本の気候変動2025」(문부과학성·기상청)도 홋카이도 내륙 극단적 폭설 증가 가능성, 수증기 증가, ざらめ雪 비율 증가를 보여 줍니다. 같은 방향입니다.")}</li>
    <li>${T("まだ言えないこと：軽い雪の日の減少（偶然の確率6%）、原因の残り約3割、⚠️予報の効果（1日ごとの事故データがないため）、北海道の外の地上観測による確かめ。", "Not yet certain: the fall in light-snow days (chance 6%), the remaining ~30% of the cause, the value of the ⚠️ forecast (no daily accident data), and ground checks outside Hokkaido.", "아직 말할 수 없는 것: 가벼운 눈의 날 감소(우연 확률 6%), 원인의 나머지 약 3할, ⚠️ 예보의 효과(하루 단위 사고 자료 없음), 홋카이도 밖의 지상 관측 확인.")}</li>
    <li>${T("データの限界：NASAのマスは約50km、衛星は雪の降水を少なめに見る傾向、気象庁の降雪は積雪計から計算した値。", "Data limits: NASA cells are ~50 km wide, satellites under-catch snowfall, JMA snowfall is derived from depth sensors.", "데이터의 한계: NASA 칸은 약 50km, 위성은 눈 강수를 적게 잡는 경향, 기상청 강설은 적설계로 계산한 값.")}</li></ul>`;
}

function renderFalls() {
  const F = D.falls, sap = D.stations.find(s => s.en === "Sapporo"), last = F.transports.length - 1, lk = F.link.heavy;
  const heavy = F.winters.map(w => { const i = D.winters.indexOf(w); return i < 0 ? null : sap.series.heavy[i]; });
  if (fallChart) fallChart.destroy();
  fallChart = new Chart(document.getElementById("fallChart"), { data: { labels: F.winters, datasets: [
    { type: "bar", label: T("転倒による救急搬送（12〜3月、人）", "Fall-injury ambulance transports (Dec–Mar)", "낙상 구급 이송 (12~3월, 명)"), data: F.transports, backgroundColor: css("--gray") + "88", yAxisID: "y" },
    { type: "line", label: T("札幌の重い雪の日（日）", "Heavy-snow days in Sapporo", "삿포로 무거운 눈의 날 (일)"), data: heavy, borderColor: css("--heavy"), pointRadius: 0, borderWidth: 2, tension: .25, yAxisID: "y2" }] },
    options: { animation: false, maintainAspectRatio: false, plugins: { legend: { labels: { boxWidth: 10, font: { size: 11 }, color: css("--muted") } } },
      scales: { x: { ticks: { maxTicksLimit: 6, color: css("--muted") }, grid: { display: false } }, y: { beginAtZero: true, ticks: { color: css("--muted"), maxTicksLimit: 4 } },
        y2: { position: "right", beginAtZero: true, grid: { display: false }, ticks: { color: css("--heavy"), maxTicksLimit: 4 } } } } });
  document.getElementById("fallText").innerHTML = [
    T(`札幌では、雪道で転んで救急車で運ばれた人が${F.winters[last]}年の冬（12〜3月）に<b>${F.transports[last].toLocaleString()}人</b>で、記録のある中で最多でした。35年で10年あたり約${fmt(F.trend.slope10, 0)}人のペースで増えています（高齢化も理由の一つと考えられます）。`,
      `In Sapporo, <b>${F.transports[last].toLocaleString()} people</b> were taken to hospital by ambulance after falling on winter roads in winter ${F.winters[last]} (Dec–Mar), the most on record — up about ${fmt(F.trend.slope10, 0)} per decade over 35 years (an ageing population is likely one reason).`, `삿포로에서 눈길에 넘어져 구급차로 이송된 사람은 ${F.winters[last]}년 겨울(12~3월)에 <b>${F.transports[last].toLocaleString()}명</b>으로 기록상 가장 많았습니다. 35년 동안 10년마다 약 ${fmt(F.trend.slope10, 0)}명씩 늘었습니다 (고령화도 이유 중 하나로 보입니다).`),
    T("転倒が特に多かった日（35冬の上位6日、例：2014年12月21日は1日163人）の多くは、<b>水を多く含んだ湿った雪や雨が、そのあと凍った日</b>でした。これは、このアプリの「重い雪の日」と同じ条件です。",
      "The worst days (top 6 in 35 winters, e.g. 163 people on 21 Dec 2014) mostly came when <b>wet, heavy snow or rain froze afterwards</b> — the same conditions as this app's “heavy-snow days”.", "낙상이 특히 많았던 날(35겨울 중 상위 6일, 예: 2014년 12월 21일 하루 163명)은 대부분 <b>물기 많은 젖은 눈이나 비가 내린 뒤 얼어붙은 날</b>이었습니다. 이 앱의 「무거운 눈의 날」과 같은 조건입니다."),
    T(`前の冬より重い雪の日が増えた冬は、搬送も増えていました（年ごとの増減の相関 r=${fmt(lk.r_change, 2)}、p=${fmt(lk.p_change, 3)}、${lk.n}冬）。統計的に有意な関係です（高齢化など、ほかの理由も重なっています）。`,
      `Winters with more heavy-snow days than the year before had more transports (correlation of year-to-year changes r = ${fmt(lk.r_change, 2)}, p = ${fmt(lk.p_change, 3)}, ${lk.n} winters). A statistically significant link (ageing and other factors also play a part).`, `전년보다 무거운 눈의 날이 늘어난 겨울에는 이송도 늘었습니다 (해마다 증감의 상관 r=${fmt(lk.r_change, 2)}, p=${fmt(lk.p_change, 3)}, ${lk.n}겨울). 통계적으로 유의한 관계입니다 (고령화 등 다른 이유도 겹쳐 있습니다).`),
    T("例：163人が運ばれた2014年12月21日の前日は、最高7.2℃で雨が降り、翌朝はマイナス6.3℃まで冷え込みました。このアプリの⚠️の条件そのものです（1日の例で、統計的な確かめではありません）。",
      "Example: the day before 21 Dec 2014 (163 people taken to hospital) reached 7.2 °C with rain, then fell to −6.3 °C the next morning — exactly this app's ⚠️ condition (one example, not a statistical test).",
      "예: 163명이 이송된 2014년 12월 21일의 전날은 최고 7.2℃에 비가 왔고, 다음 날 아침 영하 6.3℃까지 떨어졌습니다. 이 앱의 ⚠️ 조건 그대로입니다 (하루의 예이며 통계적 확인은 아닙니다)."),
  ].map(x => `<li>${x}</li>`).join("");
}

function renderAbout() {
  document.getElementById("about").innerHTML = [
    T("期間：1992〜2026年の冬（前年12月〜3月、1月の年で表示）", "Period: winters 1992–2026 (Dec–Mar, labelled by January)", "기간: 1992~2026년 겨울 (전년 12월~3월, 1월이 속한 해로 표시)"),
    T("雪質の目安：雪の日（気象庁は降雪1cm以上、NASAは降雪1mm（水換算）以上）の日平均気温が−5℃以下なら軽い雪、−2℃より暖かければ重い雪", "Snow quality rule of thumb: on a snow day (JMA ≥ 1 cm snowfall, NASA ≥ 1 mm water equivalent), daily mean ≤ −5 °C = light snow, > −2 °C = heavy", "눈 품질 기준: 눈 온 날(기상청 강설 1cm 이상, NASA 강설 1mm(물 환산) 이상)의 일평균 기온이 −5℃ 이하면 가벼운 눈, −2℃보다 따뜻하면 무거운 눈"),
    T("基準の根拠：新しく積もる雪の密度は気温が上がると急に大きくなることが知られています（Hedstrom & Pomeroy 1998 などの経験式、比較はHelfricht et al. 2018, HESS）。−5℃・−2℃はその目安で、基準を−3〜0℃に変えても結論は同じでした（感度チェック）。さらに「水1mmで積もる雪」で重さを直接確かめています。",
      "Why these cut-offs: new-snow density rises steeply with air temperature (empirical fits such as Hedstrom & Pomeroy 1998; compared in Helfricht et al. 2018, HESS). −5 °C and −2 °C are rules of thumb; moving the heavy cut-off between −3 and 0 °C gives the same conclusion (sensitivity check), and the snow-per-mm-of-water ratio checks the weight directly.",
      "기준의 근거: 새로 쌓이는 눈의 밀도는 기온이 오르면 급격히 커진다고 알려져 있습니다 (Hedstrom & Pomeroy 1998 등의 경험식, 비교는 Helfricht et al. 2018, HESS). −5℃·−2℃는 그 기준이며, 기준을 −3~0℃로 바꿔도 결론은 같았습니다 (민감도 확인). 또 「물 1mm로 쌓이는 눈」으로 무게를 직접 확인합니다."),
    T("NASA POWER 日別データ（MERRA-2）：気温・降雪・降水・風", "NASA POWER daily (MERRA-2): temperature, snowfall, precipitation, wind", "NASA POWER 일별 자료 (MERRA-2): 기온·강설·강수·바람"),
    T("NASA MODIS（Terra）月平均の雪のおおわれ方（NASA GIBS地図タイルを公式カラーマップで％に戻して集計）：12月・2月・4月、2001〜2026年", "NASA MODIS (Terra) monthly snow cover (NASA GIBS tiles turned back into % with the official colour map): Dec, Feb, Apr, 2001–2026", "NASA MODIS (Terra) 월평균 눈 덮임 (NASA GIBS 지도 타일을 공식 색표로 %로 되돌려 집계): 12월·2월·4월, 2001~2026년"),
    T("JAXA GSMaP 日別衛星降水（JAXA Earth API、2001〜2026年、10観測所の地点）：1日10mm以上の日を気象庁の気温で「重い大雪・大雨」「軽い雪の大雪」に分類", "JAXA GSMaP daily satellite precipitation (JAXA Earth API, 2001–2026, at 10 stations): days ≥ 10 mm split by JMA temperature into wet heavy storms and big light-snow days", "JAXA GSMaP 일별 위성 강수 (JAXA Earth API, 2001~2026년, 관측소 10곳 지점): 하루 10mm 이상인 날을 기상청 기온으로 「무거운 폭설·폭우」와 「가벼운 눈 대설」로 분류"),
    T("JAXA GSMaP 月別衛星降水（JAXA Earth API）：冬の降水量の傾向を確認", "JAXA GSMaP monthly satellite precipitation (JAXA Earth API): cross-check of winter precipitation", "JAXA GSMaP 월별 위성 강수 (JAXA Earth API): 겨울 강수량 경향 교차 확인"),
    T("気象庁 過去の気象データ：北海道10観測所の日別値（降雪・最深積雪・気温・風速）", "JMA historical data: daily values at 10 Hokkaido stations (snowfall, snow depth, temperature, wind)", "기상청 과거 기상 자료: 홋카이도 10개 관측소 일별 값 (강설·최심적설·기온·풍속)"),
    T("体感温度：気温と平均風速から風冷指数（カナダ気象局の式）で計算した目安", "Feels-like: wind-chill index (Environment Canada formula) from temperature and mean wind, as a rough guide", "체감 온도: 기온과 평균 풍속으로 계산한 풍랭 지수 (캐나다 기상청 식), 대략적인 기준"),
    T("雪道の転倒による救急搬送：札幌市消防局のデータ（ウインターライフ推進協議会 tsurutsuru.jp）", "Fall-injury ambulance transports: Sapporo City Fire Bureau data (Winter Life Promotion Council, tsurutsuru.jp)", "눈길 낙상 구급 이송: 삿포로시 소방국 자료 (윈터라이프 추진협의회 tsurutsuru.jp)"),
    T("確かめ：多くのマスを同時に検定するため、ベンジャミニ・ホッホベルグ法（FDR）と、冬の順番をシャッフルする検定（500回）で偶然かどうかを確認", "Checks: many cells are tested at once, so we use Benjamini–Hochberg FDR and a 500-run shuffle test of winter order", "확인: 많은 칸을 한꺼번에 검정하므로 벤야미니-호흐베르크 FDR 보정과 겨울 순서를 섞는 검정(500회)으로 우연인지 확인"),
    T("雪質予報：Open-Meteo の7日間予報（気温・降雪・降雨）を同じ決まりで判定", "Snow-quality forecast: Open-Meteo 7-day forecast (temperature, snowfall, rain) classified with the same rules", "눈 품질 예보: Open-Meteo 7일 예보(기온·강설·강우)를 같은 규칙으로 판정"),
    T("比べた国の報告書：文部科学省・気象庁「日本の気候変動2025」第6章（降雪・積雪）。北海道内陸の極端な大雪の増加の可能性、ざらめ雪の割合の増加などと同じ向きです。", "National assessment compared: MEXT & JMA, Climate Change in Japan 2025, Chapter 6 (snowfall and snow cover) — our results point the same way as its possible rise in extreme snowfall in inland Hokkaido and in coarse, refrozen snow.", "비교한 나라의 보고서: 문부과학성·기상청 「日本の気候変動2025」 6장(강설·적설). 홋카이도 내륙 극단적 폭설 증가 가능성, ざらめ雪 비율 증가 등과 같은 방향입니다."),
    T("住所検索：国土地理院 / 地図：国土地理院タイル", "Address search and map tiles: Geospatial Information Authority of Japan", "주소 검색·지도: 일본 국토지리원"),
  ].map(x => `<li>${x}</li>`).join("");
}

async function geocode(q) {
  const box = document.getElementById("cands"); box.innerHTML = `<span class="note">${T("検索中…", "Searching…", "검색 중…")}</span>`;
  const lang = /[가-힣]/.test(q) ? "ko" : /[぀-ヿ一-鿿]/.test(q) ? "ja" : "en";
  const ul = LANG, enc = encodeURIComponent(q), J = async (u, o) => { try { const r = await fetch(u, o); return r.ok ? await r.json() : null; } catch (e) { return null; } };
  const wd = (async () => {   // Wikidata: names and aliases in every language -> coordinates (P625)
    const a = await J(`https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${enc}&language=${lang}&uselang=${ul}&type=item&limit=7&format=json&origin=*`);
    const ids = ((a && a.search) || []).map(x => x.id); if (!ids.length) return [];
    const b = await J(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids.join("|")}&props=claims|labels|descriptions&languages=${ul}|en|ja|ko&format=json&origin=*`);
    return ids.map(id => (b && b.entities && b.entities[id]) || null).filter(e => e && e.claims && e.claims.P625).map(e => {
      const v = e.claims.P625[0].mainsnak.datavalue.value, lb = e.labels[ul] || e.labels.en || Object.values(e.labels)[0] || {}, ds = e.descriptions[ul] || e.descriptions.en || {};
      return { la: v.latitude, lo: v.longitude, label: lb.value || q, sub: ds.value || "" };
    });
  })();
  const ph = (async () => {   // Photon (OpenStreetMap): local names and addresses
    const a = await J(`https://photon.komoot.io/api/?q=${enc}&limit=5`);
    return ((a && a.features) || []).map(f => ({ la: f.geometry.coordinates[1], lo: f.geometry.coordinates[0], label: f.properties.name || q, sub: [f.properties.city, f.properties.state, f.properties.country].filter(Boolean).join(" · ") }));
  })();
  const gs = lang === "ja" ? (async () => { const a = await J("https://msearch.gsi.go.jp/address-search/AddressSearch?q=" + enc); return (a || []).slice(0, 3).map(x => ({ la: x.geometry.coordinates[1], lo: x.geometry.coordinates[0], label: x.properties.title, sub: "日本" })); })() : Promise.resolve([]);
  const all = [...(await wd), ...(await gs), ...(await ph)], out = [];
  for (const c of all) if (!out.some(o => km(o.la, o.lo, c.la, c.lo) < 3)) out.push(c);
  if (!out.length) { box.innerHTML = `<span class="note">${T("見つかりませんでした。別の書き方でも試してください。", "Not found. Try another spelling.", "찾지 못했습니다. 다른 표기로도 해 보세요.")}</span>`; return; }
  choose(out[0].la, out[0].lo, out[0].label);
  box.innerHTML = out.length > 1 ? `<span class="note">${T("ほかの候補：", "Other matches:", "다른 후보:")}</span>` + out.slice(1, 6).map((c, i) => `<button class="chip" data-c="${i + 1}" title="${c.sub}">${c.label}<small> ${c.sub ? "· " + c.sub.slice(0, 28) : ""}</small></button>`).join("") : "";
  box.querySelectorAll("[data-c]").forEach(b => (b.onclick = () => { const c = out[+b.dataset.c]; choose(c.la, c.lo, c.label); }));
}

async function init() {
  D = await (await fetch("data.json")).json();
  Chart.defaults.color = "#a9b8d0"; Chart.defaults.borderColor = "rgba(160,190,255,.14)";
  tickClock(); setInterval(tickClock, 1000);
  const tiles = () => L.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png", { maxZoom: 14, attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>' });
  map = L.map("map", { scrollWheelZoom: false }).setView([43.4, 142.6], 6); tiles().addTo(map);
  map.on("click", e => choose(e.latlng.lat, e.latlng.lng));
  SATLUT = new Map(D.modis_lut.map(([r, g, b, v]) => [(r << 16) | (g << 8) | b, v]));
  satMap = L.map("satmap", { scrollWheelZoom: false }).setView([43.4, 142.8], 6); tiles().addTo(satMap);
  document.querySelectorAll("#satChips .chip").forEach(b => (b.onclick = () => { satMonth = b.dataset.m; document.querySelectorAll("#satChips .chip").forEach(x => x.classList.toggle("on", x === b)); renderSat(); }));
  map2 = L.map("map2", { scrollWheelZoom: false }).setView([43.4, 142.8], 6); tiles().addTo(map2);
  document.getElementById("shareBtn").onclick = shareCard;
  document.querySelectorAll("#lang button").forEach(b => (b.onclick = () => { LANG = b.dataset.l; applyLang(); }));
  try { const l = localStorage.getItem("lang"); if (["ja", "en", "ko"].includes(l)) LANG = l; } catch (e) {}

  document.getElementById("search").onsubmit = e => { e.preventDefault(); const q = document.getElementById("q").value.trim(); if (q) geocode(q); };
  document.getElementById("gps").onclick = () => navigator.geolocation ? navigator.geolocation.getCurrentPosition(
    p => { const { latitude: la, longitude: lo } = p.coords; choose(la, lo); },
    () => alert(T("位置情報を取得できませんでした", "Could not get your location", "위치를 가져오지 못했습니다"))) : null;
  const sl = document.getElementById("tmSlider");
  const setTL = v => { TL = v; if (TL <= 34) tmYear = 1992 + TL; if (places.length) render(); };
  sl.oninput = () => setTL(+sl.value);
  document.querySelectorAll(".tm-ctl .chip").forEach(b => (b.onclick = () => setTL(+b.dataset.t)));
  applyLang();
  // a place can be given in the link: #/karte?p=lat,lon  (handy for sharing a town or a judge's home)
  const qp = (location.hash.match(/[?&]p=(-?[\d.]+),(-?[\d.]+)/) || []);
  if (qp.length) choose(+qp[1], +qp[2], null, { quiet: true }); else choose(QUICK[0][2], QUICK[0][3], null, { q: 0, quiet: true });
  initGlobe(); renderHud();
  window.addEventListener("hashchange", route);
  document.addEventListener("click", e => { const a = e.target.closest("[data-go]"); if (!a) return; e.preventDefault(); route.go = a.dataset.go; if (VIEW === "home") route(); else location.hash = "#/"; });
  route();
}
init();
// Installable web app: cache the app shell and last data so it opens offline (see sw.js)
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
