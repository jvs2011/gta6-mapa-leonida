/* Mapa Leonida — app pessoal de mapa do GTA VI, com cara e uso de Google Maps.
 * Dados e geometria: "Open GTA 6 Map" (github.com/fbritoferreira/gta6), CC BY 4.0.
 * Nomes dos lugares: mapa impresso oficial de Leonida (Rockstar Games).
 * Roda igual no Safari (PWA na tela de início) e dentro do app nativo (WKWebView).
 */
(() => {
  "use strict";

  // ================================================================ constantes
  const BOUNDS = L.latLngBounds([-800, 160], [-160, 832]); // área com tiles (y do mapa = -lat)
  const LAND = L.latLngBounds([-772, 205], [-218, 611]);   // onde fica Leonida: visão inicial
  const KEY = "leonida:v1";
  const MEDIA_CACHE = "leonida-media-v3";
  const METERS_PER_UNIT = 32;                               // 1 unidade do mapa = 32 unidades do jogo (m)
  const MW = window.webkit && window.webkit.messageHandlers;
  const NATIVE = !!(MW && MW.store);
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const FONT = "Roboto, -apple-system, 'Helvetica Neue', sans-serif";

  // ================================================================ estado salvo
  const DEFAULTS = { v: 3, style: "padrao", kinds: null, chip: null, hideFound: false, found: {}, mine: [], view: null, offline: {} };
  const S = (() => {
    let raw = window.__NATIVE_STATE__ || null;
    if (!raw) { try { raw = localStorage.getItem(KEY); } catch (e) { /* modo privado */ } }
    let s = {};
    try { s = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : {}; } catch (e) { s = {}; }
    const out = Object.assign({}, DEFAULTS, s, { found: s.found || {}, mine: s.mine || [], offline: s.offline || {} });
    if ((s.v || 0) < 3) { out.v = 3; out.style = "padrao"; out.kinds = null; out.chip = null; out.offline = {}; }
    if (!["padrao", "escuro"].includes(out.style)) out.style = "padrao";
    return out;
  })();
  let saveTimer = 0;
  function persist() {
    clearTimeout(saveTimer);
    const j = JSON.stringify(S);
    try { localStorage.setItem(KEY, j); } catch (e) { /* ignore */ }
    if (NATIVE) MW.store.postMessage(j);
  }
  const save = () => { clearTimeout(saveTimer); saveTimer = setTimeout(persist, 300); };
  addEventListener("pagehide", persist);
  document.addEventListener("visibilitychange", () => document.hidden && persist());

  // ================================================================ mapa
  document.body.classList.toggle("escuro", S.style === "escuro");
  const map = L.map("map", {
    crs: L.CRS.Simple, minZoom: -1, maxZoom: 7, zoomSnap: 0, zoomDelta: 1, wheelPxPerZoomLevel: 110,
    preferCanvas: true, maxBounds: BOUNDS.pad(0.25), maxBoundsViscosity: 0.85, zoomControl: false,
    bounceAtZoomLimits: false, doubleClickZoom: false, tapTolerance: 12, inertiaDeceleration: 2600,
  });
  map.attributionControl.setPrefix(false);
  map.attributionControl.addAttribution('<a href="https://github.com/fbritoferreira/gta6" target="_blank" rel="noopener">Open GTA 6 Map</a> · CC BY 4.0');
  const fitLand = (animate) => {
    const top = $(".top").getBoundingClientRect().bottom + 4;
    const opts = { paddingTopLeft: [12, top], paddingBottomRight: [12, 12] };
    if (animate) map.flyToBounds(LAND, Object.assign({ duration: 0.8 }, opts));
    else map.fitBounds(LAND, Object.assign({ animate: false }, opts));
  };
  if (S.view) map.setView([S.view[1], S.view[0]], S.view[2], { animate: false });
  else fitLand(false);
  map.on("moveend", () => {
    const c = map.getCenter();
    S.view = [+c.lng.toFixed(2), +c.lat.toFixed(2), +map.getZoom().toFixed(3)];
    save();
  });

  let TILES = null; // {z: Set("y,x")}
  const Tiles = L.TileLayer.extend({
    createTile(coords, done) {
      const have = TILES && TILES[coords.z];
      if (have && !have.has(coords.y + "," + coords.x)) {
        const d = document.createElement("div");
        setTimeout(() => done(null, d), 0);
        return d;
      }
      return L.TileLayer.prototype.createTile.call(this, coords, done);
    },
  });
  const tileLayer = (style) => new Tiles(`tiles/${style}/{z}/{y}/{x}.webp`, {
    tileSize: 256, minZoom: -1, minNativeZoom: 0, maxNativeZoom: 5, noWrap: true, bounds: BOUNDS,
    keepBuffer: 4, updateWhenZooming: false, className: "base",
  });
  let base = null;
  function setStyle(style) {
    S.style = style;
    document.body.classList.toggle("escuro", style === "escuro");
    document.querySelector('meta[name="theme-color"]').content = style === "escuro" ? "#202124" : "#ffffff";
    if (base) map.removeLayer(base);
    base = tileLayer(style).addTo(map);
    base.bringToBack();
    repaint();
    save();
  }

  // ================================================================ dados
  let KINDS = {}, GROUPS = [], ITEMS = [], BY_ID = {}, ROT = [], ROTAS = [], ICONS = {}, META = {};
  const MINE_KIND = { key: "mine", name: "Meus pontos", colour: "#f9ab00", group: "Mine", trackable: false, minz: -1 };
  const POI_KIND = { key: "poi", name: "Ponto de referência", colour: "#12a4af", group: "Poi", trackable: false };
  const TMP_KIND = { key: "tmp", name: "Pino marcado", colour: "#ea4335", group: "Tmp", trackable: false };
  const kindOf = (it) => KINDS[it.k] || (it.k === "mine" ? MINE_KIND : it.k === "poi" ? POI_KIND : TMP_KIND);

  // glifos extras (Lucide, ISC)
  const EXTRA = {
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    airport: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
    landmark: '<path d="M3 22h18"/><path d="M6 18v-7"/><path d="M10 18v-7"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="M12 2 20 7H4z"/>',
    prison: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    other: '<circle cx="12" cy="12" r="3"/>',
  };
  const glyphSVG = (key, stroke = "#fff", sw = 2.4) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${ICONS[key] || EXTRA[key] || EXTRA.pin}</svg>`;
  const glyphImg = {};
  function glyph(key) {
    let im = glyphImg[key];
    if (!im) {
      im = glyphImg[key] = new Image();
      im.onload = () => { clearTimeout(glyph.t); glyph.t = setTimeout(repaint, 30); };
      im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(glyphSVG(key));
    }
    return im.complete && im.naturalWidth ? im : null;
  }
  const glyphKey = (it) => (it.k === "mine" ? "star" : it.k === "poi" ? it.icon : ICONS[it.k] ? it.k : "pin");
  // cor do texto: versão mais escura da cor do ícone (no escuro, mais clara)
  const shadeCache = {};
  function textColour(hex) {
    const key = hex + S.style;
    if (shadeCache[key]) return shadeCache[key];
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const f = S.style === "escuro" ? 0.55 : -0.22;
    const mix = (c) => Math.round(f > 0 ? c + (255 - c) * f : c * (1 + f));
    r = mix(r); g = mix(g); b = mix(b);
    return (shadeCache[key] = `rgb(${r},${g},${b})`);
  }

  // ================================================================ camada de nomes e pontos (canvas, com colisão)
  // Hierarquia como no Google Maps: o mais importante aparece primeiro e o resto entra conforme o zoom.
  // tam: tamanho da fonte em px (interpola de [0] no minZ a [1] três níveis depois)
  const LBL = {
    city:   { prio: 10, minZ: -1,  maxZ: 6,  tam: [13.5, 17], peso: 500, cor: "#202124", corE: "#e8eaed" },
    ocean:  { prio: 12, minZ: -1,  maxZ: 2.2, tam: [13, 14], peso: 400, cor: "#3f84b5", corE: "#7fb1d1", esp: 1.5 },
    town:   { prio: 20, minZ: 0.2, maxZ: 7,  tam: [12, 14.5], peso: 500, cor: "#3c4043", corE: "#bdc1c6" },
    region: { prio: 28, minZ: 0.3, maxZ: 2.4, tam: [10.5, 11.5], peso: 500, cor: "#8a8f95", corE: "#8f959c", esp: 1.8, caps: true },
    park:   { prio: 40, minZ: 1.3, maxZ: 7,  tam: [11, 13], peso: 500, cor: "#188038", corE: "#81c995" },
    water:  { prio: 44, minZ: 1.0, maxZ: 7,  tam: [11, 13], peso: 400, cor: "#3f84b5", corE: "#7fb1d1" },
    hood:   { prio: 50, minZ: 1.9, maxZ: 7,  tam: [11, 13], peso: 500, cor: "#6b7075", corE: "#9aa0a6" },
  };
  const POI_PRIO = { Collectibles: 60, Activities: 62, Crime: 64, Other: 75 };
  const PLACE_PRIO = { building: 66, nature: 66, safehouse: 66, hotel: 68, leisure: 68, civic: 70, food: 72, shop: 72, transport: 74 };
  let FEATURES = [];
  let resultMode = false; // poucos pontos filtrados: aparecem desde longe, como resultados de busca

  function buildFeatures() {
    const F = [];
    for (const r of ROT) {
      if (r.c === "poi") {
        const it = { i: "poi-" + norm(r.n).replace(/\s+/g, "-"), k: "poi", n: r.n, x: r.x, y: r.y, icon: r.i };
        F.push({ t: "item", it, prio: r.i === "airport" ? 26 : 36, minZ: r.i === "airport" ? 0.9 : 1.6 });
        BY_ID[it.i] = it;
      } else {
        const c = LBL[r.c];
        F.push({ t: "label", cls: r.c, n: r.n, x: r.x, y: r.y, prio: c.prio, minZ: c.minZ, maxZ: c.maxZ });
      }
    }
    for (const s of ROTAS) F.push({ t: "shield", ref: s.ref, kind: s.kind, x: s.x, y: s.y, prio: 24, minZ: 0.4, maxZ: 7 });
    for (const it of ITEMS) {
      const k = KINDS[it.k];
      const prio = k.group === "Places" ? PLACE_PRIO[it.k] || 76 : POI_PRIO[k.group] || 76;
      F.push({ t: "item", it, prio: prio + (it.s ? 0 : 0.5), minZ: k.minz });
    }
    for (const it of S.mine) F.push({ t: "item", it, prio: 5, minZ: -1 });
    F.sort((a, b) => a.prio - b.prio);
    FEATURES = F;
  }

  const measureCache = new Map();
  function measure(ctx, font, text) {
    const key = font + "|" + text;
    let w = measureCache.get(key);
    if (w == null) { ctx.font = font; w = ctx.measureText(text).width; measureCache.set(key, w); }
    return w;
  }
  // quebra em até 2 linhas, como os nomes longos do Google
  function lines(text, max = 18) {
    if (text.length <= max) return [text];
    const words = text.split(" ");
    let best = [text], bestScore = Infinity;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(" "), b = words.slice(i).join(" ");
      const score = Math.max(a.length, b.length);
      if (score < bestScore) { bestScore = score; best = [a, b]; }
    }
    if (best.length === 2 && best[1].length > max + 6) best[1] = best[1].slice(0, max + 4) + "…";
    return best;
  }
  const shortName = (it) => {
    let n = it.n;
    const k = KINDS[it.k];
    if (k && k.group === "Collectibles" && n.includes(": ")) n = n.split(": ").pop(); // "Card: Fulano" -> "Fulano"
    return n.length > 34 ? n.slice(0, 32) + "…" : n;
  };

  // grade espacial para colisão
  class Grid {
    constructor() { this.cells = new Map(); }
    key(x, y) { return (x >> 6) + "," + (y >> 6); }
    hits(r) {
      for (let x = r[0] >> 6; x <= r[2] >> 6; x++) for (let y = r[1] >> 6; y <= r[3] >> 6; y++) {
        const c = this.cells.get(x + "," + y);
        if (c) for (const o of c) if (r[0] < o[2] && r[2] > o[0] && r[1] < o[3] && r[3] > o[1]) return true;
      }
      return false;
    }
    add(r) {
      for (let x = r[0] >> 6; x <= r[2] >> 6; x++) for (let y = r[1] >> 6; y <= r[3] >> 6; y++) {
        const k = x + "," + y;
        if (!this.cells.has(k)) this.cells.set(k, []);
        this.cells.get(k).push(r);
      }
    }
  }

  function halo(ctx) {
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.strokeStyle = S.style === "escuro" ? "rgba(29,35,48,.92)" : "rgba(255,255,255,.95)";
  }
  function drawText(ctx, ls, x, y, font, colour, align, lh) {
    ctx.font = font;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    halo(ctx);
    const y0 = y - ((ls.length - 1) * lh) / 2;
    ls.forEach((l, i) => ctx.strokeText(l, x, y0 + i * lh));
    ctx.fillStyle = colour;
    ls.forEach((l, i) => ctx.fillText(l, x, y0 + i * lh));
  }

  // marcador de POI no estilo Google: gota pequena com ícone branco
  function drawPoiPin(ctx, x, y, colour, gkey, found) {
    const r = 9, cy = y - 12;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x - 3, y - 4, x - r, cy + 5, x - r, cy);
    ctx.arc(x, cy, r, Math.PI, 0);
    ctx.bezierCurveTo(x + r, cy + 5, x + 3, y - 4, x, y);
    ctx.closePath();
    ctx.fillStyle = found ? "#9aa0a6" : colour;
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = S.style === "escuro" ? "rgba(0,0,0,.45)" : "rgba(255,255,255,.95)";
    ctx.stroke();
    const g = glyph(found ? "check" : gkey);
    if (g) ctx.drawImage(g, x - 6, cy - 6, 12, 12);
  }
  function drawDot(ctx, x, y, colour, found) {
    ctx.beginPath(); ctx.arc(x, y, 4.5, 0, 6.2832);
    ctx.fillStyle = found ? "#9aa0a6" : colour; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = S.style === "escuro" ? "#1d2330" : "#fff"; ctx.stroke();
  }
  // pino vermelho grande do lugar selecionado
  function drawRedPin(ctx, x, y) {
    const r = 13, cy = y - 20;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.3)"; ctx.shadowBlur = 4; ctx.shadowOffsetY = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x - 4, y - 7, x - r, cy + 8, x - r, cy);
    ctx.arc(x, cy, r, Math.PI, 0);
    ctx.bezierCurveTo(x + r, cy + 8, x + 4, y - 7, x, y);
    ctx.closePath();
    ctx.fillStyle = "#ea4335"; ctx.fill();
    ctx.restore();
    ctx.lineWidth = 1; ctx.strokeStyle = "#b31412"; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, cy, 4.6, 0, 6.2832); ctx.fillStyle = "#b31412"; ctx.fill();
  }
  // placas de rodovia (EUA, como no Google)
  function drawShield(ctx, x, y, ref, kind) {
    const num = ref.replace(/^[A-Z]+-/, "");
    const w = 16 + Math.max(0, num.length - 2) * 5, h = 16;
    const x0 = x - w / 2, y0 = y - h / 2;
    ctx.save();
    ctx.lineWidth = 1;
    if (kind === "interstate") {
      ctx.beginPath();
      ctx.moveTo(x0, y0 + 1); ctx.quadraticCurveTo(x, y0 - 2, x0 + w, y0 + 1);
      ctx.lineTo(x0 + w, y0 + 8); ctx.quadraticCurveTo(x0 + w, y0 + h, x, y0 + h + 2);
      ctx.quadraticCurveTo(x0, y0 + h, x0, y0 + 8); ctx.closePath();
      ctx.fillStyle = "#1c58b5"; ctx.fill(); ctx.strokeStyle = "#fff"; ctx.stroke();
      ctx.save(); ctx.clip(); ctx.fillStyle = "#d32f2f"; ctx.fillRect(x0, y0 - 2, w, 6); ctx.restore();
      ctx.fillStyle = "#fff";
    } else if (kind === "us") {
      ctx.beginPath();
      ctx.moveTo(x0 + 1, y0); ctx.lineTo(x0 + w - 1, y0); ctx.quadraticCurveTo(x0 + w, y0 + 3, x0 + w + 1, y0 + 4);
      ctx.quadraticCurveTo(x0 + w, y0 + h, x, y0 + h + 1.5); ctx.quadraticCurveTo(x0, y0 + h, x0 - 1, y0 + 4);
      ctx.quadraticCurveTo(x0, y0 + 3, x0 + 1, y0); ctx.closePath();
      ctx.fillStyle = "#fff"; ctx.fill(); ctx.strokeStyle = "#3c4043"; ctx.stroke();
      ctx.fillStyle = "#202124";
    } else {
      const col = kind === "toll" ? "#fbc02d" : kind === "county" ? "#1a3d7c" : "#fff";
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x0, y0, w, h, 3) : ctx.rect(x0, y0, w, h);
      ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = kind === "county" ? "#fff" : "#3c4043"; ctx.stroke();
      ctx.fillStyle = kind === "county" ? "#fbc02d" : "#202124";
    }
    ctx.font = `700 ${num.length > 2 ? 8.5 : 9.5}px ${FONT}`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(num, x, y + (kind === "interstate" ? 2 : 0.5));
    ctx.restore();
    return [x0 - 2, y0 - 3, x0 + w + 2, y0 + h + 3];
  }

  let placedHits = [];
  // animações do mapa: pontos novos entram com fade; o pino selecionado cai com quique
  const REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FADE_MS = 220, DROP_MS = 520;
  let seen = new Map(), selectedAt = 0, animFrame = 0;
  const easeOutBounce = (t) => {
    const n = 7.5625, d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
    return n * (t -= 2.625 / d) * t + 0.984375;
  };
  function drawOverlay(layer) {
    const r = layer._renderer;
    if (!r._drawing || !FEATURES.length) return;
    const ctx = r._ctx, z = map.getZoom(), dark = S.style === "escuro";
    const b = r._bounds;
    const grid = new Grid();
    const hits = [];
    const pinMode = z >= 2.4;
    // o selecionado e o pino marcado reservam espaço primeiro
    const selP = selected ? map.latLngToLayerPoint([-selected.y, selected.x]) : null;
    if (selP) grid.add([selP.x - 14, selP.y - 36, selP.x + 14, selP.y + 2]);
    ctx.save();
    const now = performance.now(), nextSeen = new Map();
    let animating = false;
    const fade = (key) => {
      let t0 = seen.get(key);
      if (t0 == null) t0 = now;
      nextSeen.set(key, t0);
      const a = REDUCED ? 1 : Math.min(1, (now - t0) / FADE_MS);
      if (a < 1) animating = true;
      ctx.globalAlpha = a * a * (3 - 2 * a);
    };
    for (const f of FEATURES) {
      let minZ = f.minZ;
      if (f.t === "item") {
        const it = f.it;
        if (it === selected) continue;
        if (it.k !== "poi" && !isVisible(it)) continue;
        if (resultMode && it.k !== "poi") minZ = -1;
      } else if (z > f.maxZ) continue;
      if (z < minZ) continue;
      const src = f.t === "item" ? f.it : f;
      const p = map.latLngToLayerPoint([-src.y, src.x]);
      if (p.x < b.min.x - 40 || p.x > b.max.x + 40 || p.y < b.min.y - 40 || p.y > b.max.y + 40) continue;

      if (f.t === "label") {
        const c = LBL[f.cls];
        const t = clamp((z - c.minZ) / 3, 0, 1);
        const size = c.tam[0] + (c.tam[1] - c.tam[0]) * t;
        const font = `${c.peso} ${size.toFixed(1)}px ${FONT}`;
        const text = c.caps ? f.n.toUpperCase() : f.n;
        const ls = lines(text, c.caps ? 16 : 18);
        ctx.letterSpacing = c.esp ? c.esp + "px" : "0px";
        const w = Math.max(...ls.map((l) => measure(ctx, font + (c.esp || ""), l) + (c.esp || 0) * l.length));
        const lh = size * 1.15;
        const h = lh * ls.length;
        const rect = [p.x - w / 2 - 3, p.y - h / 2 - 2, p.x + w / 2 + 3, p.y + h / 2 + 2];
        if (grid.hits(rect)) { ctx.letterSpacing = "0px"; continue; }
        grid.add(rect);
        fade("L" + f.n);
        drawText(ctx, ls, p.x, p.y, font, dark ? c.corE : c.cor, "center", lh);
        ctx.letterSpacing = "0px";
      } else if (f.t === "shield") {
        const rect = [p.x - 14, p.y - 11, p.x + 14, p.y + 11];
        if (grid.hits(rect)) continue;
        grid.add(rect);
        fade("S" + f.ref + f.x);
        drawShield(ctx, p.x, p.y, f.ref, f.kind);
      } else {
        const it = f.it, k = kindOf(it), found = !!S.found[it.i];
        const colour = k.colour;
        if (!pinMode && it.k !== "mine" && it.k !== "poi") {
          // de longe: só bolinhas (resultados filtrados)
          const rect = [p.x - 6, p.y - 6, p.x + 6, p.y + 6];
          if (grid.hits(rect)) continue;
          grid.add(rect);
          fade("D" + it.i);
          drawDot(ctx, p.x, p.y, colour, found);
          hits.push([p.x - 9, p.y - 9, p.x + 9, p.y + 9, it]);
          continue;
        }
        const icon = [p.x - 10, p.y - 22, p.x + 10, p.y + 1];
        const iconPad = [icon[0] - 5, icon[1] - 5, icon[2] + 5, icon[3] + 5];
        if (grid.hits(iconPad)) continue;
        // nome à direita (ou à esquerda), como no Google
        const showLabel = z >= minZ + 0.45 || it.k === "mine" || it.k === "poi" || resultMode;
        let lab = null;
        if (showLabel) {
          const size = 12;
          const font = `500 ${size}px ${FONT}`;
          const ls = lines(shortName(it), 16);
          const w = Math.max(...ls.map((l) => measure(ctx, font, l)));
          const lh = 14, h = lh * ls.length, cy = p.y - 12;
          const right = [p.x + 12, cy - h / 2 - 3, p.x + 18 + w, cy + h / 2 + 3];
          const left = [p.x - 18 - w, cy - h / 2 - 3, p.x - 12, cy + h / 2 + 3];
          if (!grid.hits(right)) lab = { rect: right, x: p.x + 13, align: "left", ls, font, cy, lh };
          else if (!grid.hits(left)) lab = { rect: left, x: p.x - 13, align: "right", ls, font, cy, lh };
        }
        // lugares comuns sem espaço para o nome somem (discreto como o Google); jogo e pontos seus ficam só com o ícone
        if (!lab && k.group === "Places" && !resultMode) continue;
        grid.add(iconPad);
        fade("P" + it.i);
        drawPoiPin(ctx, p.x, p.y, colour, glyphKey(it), found);
        hits.push([icon[0] - 4, icon[1] - 4, icon[2] + 4, icon[3] + 4, it]);
        if (lab) {
          grid.add(lab.rect);
          drawText(ctx, lab.ls, lab.x, lab.cy, lab.font, found ? (dark ? "#9aa0a6" : "#80868b") : textColour(colour), lab.align, lab.lh);
          hits.push([lab.rect[0], lab.rect[1], lab.rect[2], lab.rect[3], it]);
        }
      }
    }
    ctx.globalAlpha = 1;
    // selecionado por cima de tudo, caindo com um quique
    if (selP) {
      const tp = REDUCED ? 1 : Math.min(1, (now - selectedAt) / DROP_MS);
      if (tp < 1) animating = true;
      const dy = -(1 - easeOutBounce(tp)) * 38;
      // sombra no chão, que cresce enquanto o pino desce
      ctx.beginPath(); ctx.ellipse(selP.x, selP.y, 3 + 4 * tp, 1.5 + 1.5 * tp, 0, 0, 6.2832);
      ctx.fillStyle = "rgba(0,0,0," + (0.12 + 0.13 * tp) + ")"; ctx.fill();
      ctx.globalAlpha = Math.min(1, tp * 2.5);
      drawRedPin(ctx, selP.x, selP.y + dy);
      ctx.globalAlpha = Math.min(1, Math.max(0, (tp - 0.35) / 0.4));
      const ls = lines(selected.k === "tmp" ? "Pino marcado" : shortName(selected), 18);
      drawText(ctx, ls, selP.x + 16, selP.y - 20, `700 13px ${FONT}`, dark ? "#f28b82" : "#c5221f", "left", 15);
      ctx.globalAlpha = 1;
      hits.push([selP.x - 14, selP.y - 36, selP.x + 14, selP.y + 2, selected]);
    }
    ctx.restore();
    placedHits = hits;
    seen = nextSeen;
    if (animating && !animFrame) animFrame = requestAnimationFrame(() => { animFrame = 0; repaint(); });
  }

  const renderer = L.canvas({ padding: 0.5, tolerance: 0 });
  const Overlay = L.Path.extend({
    options: { interactive: true, bubblingMouseEvents: false },
    initialize(options) { L.setOptions(this, options); },
    _project() { this._pxBounds = L.bounds([-1e9, -1e9], [1e9, 1e9]); },
    _update() {},
    _updatePath() { drawOverlay(this); },
    _containsPoint(p) {
      for (let i = placedHits.length - 1; i >= 0; i--) {
        const h = placedHits[i];
        if (p.x >= h[0] && p.x <= h[2] && p.y >= h[1] && p.y <= h[3]) { this._hit = h[4]; return true; }
      }
      this._hit = null;
      return false;
    },
  });
  const overlay = new Overlay({ renderer });
  overlay.on("click", (e) => { L.DomEvent.stop(e); if (overlay._hit) select(overlay._hit); });

  function repaint() {
    if (!renderer._map) return;
    renderer._redrawBounds = null;
    renderer._redraw();
  }
  const allItems = () => ITEMS.concat(S.mine);
  const isVisible = (it) => (it.k === "mine" ? S.kinds.includes("mine") : it.k === "tmp" || S.kinds.includes(it.k)) && !(S.hideFound && S.found[it.i]);
  function refresh() {
    const n = ITEMS.reduce((a, it) => a + (isVisible(it) ? 1 : 0), 0);
    resultMode = n > 0 && (n <= 320 || S.chip != null);
    repaint();
    renderChips();
    updateRing();
  }

  // ================================================================ ficha do lugar (como a do Google)
  const sheet = $("#sheet"), sheetBody = $("#sheetBody");
  const ICON_SVG = {
    place: '<svg viewBox="0 0 24 24"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
    real: '<svg viewBox="0 0 24 24"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"/></svg>',
    info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
    prog: '<svg viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    share: '<svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    save: '<svg viewBox="0 0 24 24"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  };
  let selected = null;

  function nearestPlace(x, y) {
    let best = null, bd = Infinity;
    for (const r of ROT) {
      if (!["hood", "town", "city", "park"].includes(r.c)) continue;
      const d = Math.hypot(r.x - x, r.y - y) * (r.c === "hood" ? 1 : r.c === "town" ? 1.3 : 1.8);
      if (d < bd) { bd = d; best = r; }
    }
    return best ? best.n : "";
  }

  function select(it, opts = {}) {
    hideLayers();
    if (selected !== it) selectedAt = performance.now();
    selected = it;
    const k = kindOf(it);
    const found = !!S.found[it.i];
    const typeTxt = it.k === "poi" ? (it.icon === "airport" ? "Aeroporto" : it.icon === "prison" ? "Penitenciária" : "Ponto de referência")
      : it.t && norm(it.t) !== norm(k.name) && norm(it.t) !== norm(k.en) ? it.t : k.name;
    const where = it.a || it.z || nearestPlace(it.x, it.y);
    const left = k.trackable ? ITEMS.filter((o) => o.k === it.k && !S.found[o.i]).length : 0;
    const total = k.trackable ? ITEMS.filter((o) => o.k === it.k).length : 0;
    let actions = "";
    if (it.k === "tmp") {
      actions = `<button class="pill primary" data-act="savepin">${ICON_SVG.save}Salvar</button>`;
    } else {
      if (k.trackable) actions += found
        ? `<button class="pill done" data-act="found">${ICON_SVG.check}Encontrado</button>`
        : `<button class="pill primary" data-act="found">${ICON_SVG.check}Marcar como encontrado</button>`;
      if (k.trackable && left - (found ? 0 : 1) > 0) actions += `<button class="pill" data-act="next">${ICON_SVG.next}Próximo perto</button>`;
      if (it.k === "mine") actions += `<button class="pill" data-act="rename">${ICON_SVG.edit}Renomear</button><button class="pill danger" data-act="delete">${ICON_SVG.trash}Apagar</button>`;
      actions += `<button class="pill" data-act="share">${ICON_SVG.share}Compartilhar</button>`;
    }
    sheetBody.innerHTML = `
      <div class="d-title"><h3>${esc(it.k === "tmp" ? "Pino marcado" : it.n)}</h3>
        <button class="icon-btn" type="button" aria-label="Fechar" data-act="close">${ICON_SVG.close}</button></div>
      <p class="d-sub">${esc(typeTxt)}${where ? " · " + esc(where) : ""}${found ? ' · <span class="found">Encontrado</span>' : ""}</p>
      <div class="d-actions">${actions}</div>
      ${it.s ? `<div class="d-photos" data-act="zoom"><img src="screenshots/${esc(it.s)}" alt="" loading="lazy"></div>` : ""}
      <div class="d-rows">
        ${it.d ? descRow(it.d) : ""}
        ${where ? `<div class="d-row">${ICON_SVG.place}<span>${esc(where)}${it.z && it.a && !it.a.includes(it.z) ? ", " + esc(it.z) : ""}</span></div>` : ""}
        ${it.r ? `<div class="d-row">${ICON_SVG.real}<span>Na vida real: ${esc(it.r)}</span></div>` : ""}
        ${k.trackable ? `<div class="d-row">${ICON_SVG.prog}<span>${total - left} de ${total} encontrados em ${esc(k.name)}</span></div>` : ""}
        ${it.k === "tmp" ? `<div class="d-row">${ICON_SVG.place}<span>${it.x.toFixed(1)}, ${it.y.toFixed(1)}</span></div>` : ""}
      </div>`;
    sheetBody.classList.remove("in"); void sheetBody.offsetWidth; sheetBody.classList.add("in");
    sheet.classList.add("open");
    sheet.setAttribute("aria-hidden", "false");
    sheet.scrollTop = 0;
    document.body.classList.add("sheet-open");
    repaint();
    const ll = L.latLng(-it.y, it.x);
    if (opts.fly) {
      map.flyTo(ll, Math.max(map.getZoom(), opts.zoom || 4.2), { duration: 0.8 });
      map.once("moveend", () => keepAboveSheet(ll));
    } else requestAnimationFrame(() => keepAboveSheet(ll));
  }
  // ---- spoilers: descrições que citam um capítulo ficam escondidas até você liberar
  const FINAL = 100;
  function spoilerChapter(d) {
    let ch = 0;
    if (/cap[ií]tulo final/i.test(d)) ch = FINAL;
    for (const m of d.matchAll(/[Cc]ap[ií]tulo (\d+)/g)) ch = Math.max(ch, +m[1]);
    return ch;
  }
  const chName = (ch) => (ch >= FINAL ? "capítulo final" : `Capítulo ${ch}`);
  function descRow(d) {
    const ch = spoilerChapter(d);
    if (ch > (S.chapter || 0)) {
      return `<div class="d-row spoiler">${ICON_SVG.info}<span><b>Pode ter spoiler do ${esc(chName(ch))}.</b>
        <button class="pill" type="button" data-act="spoiler" data-ch="${ch}">${ch >= FINAL ? "Clique se você já chegou ao capítulo final" : `Clique se você já passou do Capítulo ${ch}`}</button></span></div>`;
    }
    return `<div class="d-row">${ICON_SVG.info}<span>${esc(d)}</span></div>`;
  }
  function keepAboveSheet(ll) {
    const pt = map.latLngToContainerPoint(ll);
    const sheetTop = window.innerHeight - sheet.offsetHeight;
    const top = $(".top").getBoundingClientRect().bottom + 50;
    if (pt.y > sheetTop - 20 || pt.y < top) {
      const target = Math.max(top + 10, (top + sheetTop) / 2);
      map.panBy([0, pt.y - target], { duration: 0.35 });
    }
  }
  function closeSheet() {
    sheet.classList.remove("open");
    sheet.setAttribute("aria-hidden", "true");
    document.body.classList.remove("sheet-open");
    selected = null;
    repaint();
  }
  sheet.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-act]");
    if (!b || !selected) return;
    const it = selected, act = b.dataset.act;
    if (act === "close") closeSheet();
    else if (act === "zoom") openViewer(`screenshots/${it.s}`);
    else if (act === "spoiler") {
      S.chapter = Math.max(S.chapter || 0, +b.dataset.ch);
      save();
      toast(S.chapter >= FINAL ? "Tudo liberado" : `Descrições liberadas até o Capítulo ${S.chapter}`);
      select(it);
    }
    else if (act === "found") {
      if (S.found[it.i]) delete S.found[it.i]; else S.found[it.i] = Date.now();
      save();
      toast(S.found[it.i] ? "Marcado como encontrado" : "Marcação removida");
      select(it); updateRing(); renderCats();
    } else if (act === "next") {
      const c = ITEMS.filter((o) => o.k === it.k && !S.found[o.i] && o !== it)
        .sort((a, b) => Math.hypot(a.x - it.x, a.y - it.y) - Math.hypot(b.x - it.x, b.y - it.y))[0];
      if (c) select(c, { fly: true, zoom: 4.2 });
    } else if (act === "delete") {
      if (!confirm(`Apagar "${it.n}"?`)) return;
      S.mine = S.mine.filter((m) => m !== it);
      save(); buildFeatures(); closeSheet(); renderCats();
    } else if (act === "rename") {
      const n = prompt("Nome do ponto", it.n);
      if (n && n.trim()) { it.n = n.trim().slice(0, 60); it._s = null; save(); select(it); }
    } else if (act === "savepin") {
      const n = prompt("Nome do ponto", nearestPlace(it.x, it.y) || "Meu ponto");
      if (n == null) return;
      const m = { i: "mine-" + Date.now().toString(36), k: "mine", x: it.x, y: it.y, n: (n.trim() || "Meu ponto").slice(0, 60) };
      S.mine.push(m);
      if (!S.kinds.includes("mine")) S.kinds.push("mine");
      save(); buildFeatures(); renderCats();
      toast("Salvo em Meus pontos");
      select(m);
    } else if (act === "share") {
      const text = `${it.n} — ${typeTxtOf(it)}${it.a ? ", " + it.a : ""} (Leonida, GTA VI)`;
      if (navigator.share) navigator.share({ title: it.n, text }).catch(() => {});
      else { try { await navigator.clipboard.writeText(text); toast("Copiado"); } catch (err) { toast(text, 4000); } }
    }
  });
  const typeTxtOf = (it) => kindOf(it).name;
  // arrastar a ficha para baixo fecha
  function dragToClose(el, close) {
    let y0 = null, dy = 0;
    el.addEventListener("touchstart", (e) => { y0 = el.scrollTop <= 0 ? e.touches[0].clientY : null; dy = 0; }, { passive: true });
    el.addEventListener("touchmove", (e) => {
      if (y0 == null) return;
      dy = e.touches[0].clientY - y0;
      if (dy > 0) { el.style.transition = "none"; el.style.transform = `translateY(${dy}px)`; }
    }, { passive: true });
    el.addEventListener("touchend", () => {
      el.style.transition = ""; el.style.transform = "";
      if (y0 != null && dy > 80) close();
      y0 = null;
    });
  }
  dragToClose(sheet, closeSheet);
  map.on("click", () => { if (selected) closeSheet(); hideResults(); hideLayers(); });

  function openViewer(src) { const v = $("#viewer"); v.querySelector("img").src = src; v.hidden = false; }
  $("#viewer").addEventListener("click", () => { $("#viewer").hidden = true; });

  let toastT = 0;
  function toast(msg, ms = 2000) {
    const t = $("#toast");
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, ms);
  }

  // ================================================================ chips (atalhos de categoria)
  const CHIPS = [
    { key: "colecionaveis", name: "Colecionáveis", group: "Collectibles", icon: "card", colour: "#9334e6" },
    { key: "atividades", name: "Atividades", group: "Activities", icon: "stunt", colour: "#c5221f" },
    { key: "crime", name: "Crime", group: "Crime", icon: "bank", colour: "#3c4043" },
    { key: "comida", name: "Restaurantes", kinds: ["food"], icon: "food", colour: "#f29900" },
    { key: "lojas", name: "Lojas", kinds: ["shop"], icon: "shop", colour: "#1a73e8" },
    { key: "hoteis", name: "Hotéis", kinds: ["hotel"], icon: "hotel", colour: "#d81b60" },
    { key: "turismo", name: "Pontos turísticos", kinds: ["building", "leisure", "nature"], icon: "building", colour: "#12a4af" },
    { key: "transporte", name: "Transporte", kinds: ["transport"], icon: "transport", colour: "#1a73e8" },
  ];
  const chipKinds = (c) => (c.kinds || Object.values(KINDS).filter((k) => k.group === c.group).map((k) => k.key)).filter((k) => KINDS[k]);
  const defaultKinds = () => Object.keys(KINDS).concat("mine");
  function renderChips() {
    $("#chips").innerHTML = CHIPS.map((c) => `<button class="chip ${S.chip === c.key ? "on" : ""}" type="button" data-chip="${c.key}">
      <i style="background:${c.colour}">${glyphSVG(c.icon, "#fff", 2.6).replace("<svg ", '<svg width="12" height="12" ')}</i>${esc(c.name)}</button>`).join("");
  }
  $("#chips").addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    const c = CHIPS.find((x) => x.key === b.dataset.chip);
    if (S.chip === c.key) {
      S.chip = null; S.kinds = defaultKinds();
    } else {
      S.chip = c.key; S.kinds = chipKinds(c).concat("mine");
      const pts = ITEMS.filter((o) => S.kinds.includes(o.k)).map((o) => [-o.y, o.x]);
      if (pts.length) map.flyToBounds(L.latLngBounds(pts).pad(0.05), { duration: 0.8, paddingTopLeft: [10, 120], paddingBottomRight: [10, 10] });
    }
    if (selected) closeSheet();
    save(); refresh(); renderCats();
  });

  // ================================================================ busca
  const q = $("#q"), results = $("#results");
  function searchText(it) {
    if (!it._s) {
      const k = kindOf(it);
      it._s = norm([it.n, it.o, it.t, k.name, k.en, it.a, it.z, it.r, it.i].join(" "));
    }
    return it._s;
  }
  function hideResults() { results.hidden = true; }
  const resIcon = (k, key) => `<span class="ic col" style="background:${k.colour}">${glyphSVG(key, "#fff", 2.4)}</span>`;
  const LBL_NAME = { city: "Cidade", town: "Cidade", hood: "Bairro", park: "Parque", water: "Água", ocean: "Oceano", region: "Condado" };
  function runSearch() {
    const raw = q.value.trim();
    $("#qClear").hidden = !raw;
    if (!raw) { hideResults(); return; }
    const words = norm(raw).split(/\s+/).filter(Boolean);
    const nq = norm(raw);
    const startsWord = (txt, w) => norm(txt).split(/[^a-z0-9]+/).some((x) => x.startsWith(w));
    const cats = Object.values(KINDS).filter((k) => words.every((w) => startsWord(k.name + " " + k.en, w))).slice(0, 4);
    const regs = ROT.filter((l) => l.c !== "poi" && words.every((w) => norm(l.n + " " + (l.o || "")).includes(w))).slice(0, 5);
    const hits = [];
    const pois = FEATURES.filter((f) => f.t === "item" && f.it.k === "poi").map((f) => f.it);
    for (const it of allItems().concat(pois)) if (words.every((w) => searchText(it).includes(w))) hits.push(it);
    hits.sort((a, b) => {
      const sa = norm(a.n).startsWith(nq) ? 0 : norm(a.n).includes(nq) ? 1 : 2;
      const sb = norm(b.n).startsWith(nq) ? 0 : norm(b.n).includes(nq) ? 1 : 2;
      return sa - sb || a.n.localeCompare(b.n);
    });
    let html = "";
    if (regs.length) html += regs.map((l, i) =>
      `<button class="res" type="button" data-reg="${i}"><span class="ic">${ICON_SVG.place}</span><span class="tx"><b>${esc(l.n)}</b><small>${LBL_NAME[l.c] || ""} · Leonida</small></span></button>`).join("");
    if (cats.length) html += cats.map((k) =>
      `<button class="res" type="button" data-cat="${esc(k.key)}">${resIcon(k, ICONS[k.key] ? k.key : "pin")}<span class="tx"><b>${esc(k.name)}</b><small>Mostrar todos no mapa · ${k.count}</small></span></button>`).join("");
    html += hits.slice(0, 80).map((it) => {
      const k = kindOf(it);
      return `<button class="res" type="button" data-id="${esc(it.i)}">${resIcon(k, glyphKey(it))}
        <span class="tx"><b>${esc(it.n)}</b><small>${esc([k.name, it.a || it.z || nearestPlace(it.x, it.y)].filter(Boolean).join(" · "))}</small></span>
        ${S.found[it.i] ? '<span class="ok">✓</span>' : ""}</button>`;
    }).join("");
    if (!html) html = `<div class="empty">Nenhum resultado para “${esc(raw)}”</div>`;
    results.innerHTML = html;
    results.hidden = false;
    results.scrollTop = 0;
    results._regs = regs;
  }
  q.addEventListener("input", runSearch);
  q.addEventListener("focus", () => { if (q.value.trim()) runSearch(); if (selected) closeSheet(); hideLayers(); });
  q.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { q.value = ""; runSearch(); q.blur(); }
    if (e.key === "Enter") { const f = results.querySelector(".res"); if (f) f.click(); }
  });
  $("#qClear").addEventListener("click", () => { q.value = ""; runSearch(); q.focus(); });
  results.addEventListener("click", (e) => {
    const b = e.target.closest(".res");
    if (!b) return;
    q.blur(); hideResults();
    if (b.dataset.id) {
      const it = BY_ID[b.dataset.id] || S.mine.find((m) => m.i === b.dataset.id);
      if (!it) return;
      if (it.k !== "mine" && it.k !== "poi" && !S.kinds.includes(it.k)) { S.kinds.push(it.k); S.chip = null; save(); refresh(); }
      select(it, { fly: true, zoom: 4.6 });
    } else if (b.dataset.cat) {
      const key = b.dataset.cat;
      S.chip = null; S.kinds = [key, "mine"];
      save(); refresh(); renderCats();
      const pts = ITEMS.filter((o) => o.k === key).map((o) => [-o.y, o.x]);
      if (pts.length) map.flyToBounds(L.latLngBounds(pts).pad(0.06), { duration: 0.8, paddingTopLeft: [10, 120], paddingBottomRight: [10, 10] });
      q.value = KINDS[key].name; $("#qClear").hidden = false;
    } else if (b.dataset.reg) {
      const l = results._regs[+b.dataset.reg];
      const zz = { region: 1.6, city: 2.6, town: 3.2, hood: 3.6, park: 2.8, water: 2.8, ocean: 0.8 }[l.c] || 3;
      map.flyTo([-l.y, l.x], zz, { duration: 0.9 });
    }
  });
  $("#qClear").addEventListener("click", () => {
    if (S.chip == null && S.kinds.length <= 2) { S.kinds = defaultKinds(); save(); refresh(); renderCats(); }
  });

  // ================================================================ camadas
  const layers = $("#layers");
  function renderLayers() {
    const thumb = (st) => `tiles/${st}/2/7/7.webp`;
    const det = (key, label, on, svg) => `<button class="l-det ${on ? "on" : ""}" type="button" data-l="${key}"><span>${svg}</span>${label}</button>`;
    $("#layersBody").innerHTML = `
      <div class="l-h"><h3>Tipo de mapa</h3><button class="icon-btn" type="button" data-l="close" aria-label="Fechar">${ICON_SVG.close}</button></div>
      <div class="l-types">
        <button class="l-type ${S.style === "padrao" ? "on" : ""}" type="button" data-l="padrao"><span style="background-image:url(${thumb("padrao")})"></span>Padrão</button>
        <button class="l-type ${S.style === "escuro" ? "on" : ""}" type="button" data-l="escuro"><span style="background-image:url(${thumb("escuro")})"></span>Escuro</button>
      </div>
      <div class="l-h"><h3>Detalhes do mapa</h3></div>
      <div class="l-details">
        ${det("places", "Lugares", ["food", "shop", "hotel"].some((k) => S.kinds.includes(k)), '<svg viewBox="0 0 24 24"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>')}
        ${det("game", "Jogo", Object.values(KINDS).filter((k) => k.group !== "Places").some((k) => S.kinds.includes(k.key)), '<svg viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="4"/><path d="M6 12h4M8 10v4M15 13h.01M18 11h.01"/></svg>')}
        ${det("hide", "Ocultar encontrados", S.hideFound, '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>')}
      </div>`;
  }
  function openLayers() { if (selected) closeSheet(); hideResults(); renderLayers(); layers.classList.add("open"); layers.setAttribute("aria-hidden", "false"); }
  function hideLayers() { layers.classList.remove("open"); layers.setAttribute("aria-hidden", "true"); }
  $("#btnLayers").addEventListener("click", () => (layers.classList.contains("open") ? hideLayers() : openLayers()));
  dragToClose(layers, hideLayers);
  layers.addEventListener("click", (e) => {
    const b = e.target.closest("[data-l]");
    if (!b) return;
    const l = b.dataset.l;
    if (l === "close") return hideLayers();
    if (l === "padrao" || l === "escuro") setStyle(l);
    else if (l === "hide") { S.hideFound = !S.hideFound; toast(S.hideFound ? "Encontrados ocultos" : "Mostrando encontrados"); }
    else if (l === "places" || l === "game") {
      const keys = Object.values(KINDS).filter((k) => (l === "places") === (k.group === "Places")).map((k) => k.key);
      const on = keys.some((k) => S.kinds.includes(k));
      S.kinds = S.kinds.filter((k) => !keys.includes(k));
      if (!on) S.kinds = S.kinds.concat(keys);
      S.chip = null;
    }
    save(); refresh(); renderLayers(); renderCats();
  });

  // ================================================================ painel "Seu progresso"
  const panel = $("#panel");
  function openPanel() { renderCats(); renderMore(); panel.classList.add("open"); panel.setAttribute("aria-hidden", "false"); hideResults(); hideLayers(); if (selected) closeSheet(); }
  function closePanel() { panel.classList.remove("open"); panel.setAttribute("aria-hidden", "true"); }
  $("#btnMe").addEventListener("click", openPanel);
  $("#panelClose").addEventListener("click", closePanel);
  panel.querySelector(".panel-tabs").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-tab]");
    if (!b) return;
    panel.querySelectorAll(".panel-tabs button").forEach((x) => x.classList.toggle("on", x === b));
    $("#tabCats").hidden = b.dataset.tab !== "cats";
    $("#tabMore").hidden = b.dataset.tab !== "more";
  });
  function progress() {
    const tr = ITEMS.filter((o) => KINDS[o.k] && KINDS[o.k].trackable);
    const f = tr.filter((o) => S.found[o.i]).length;
    return { f, t: tr.length, pct: tr.length ? (100 * f) / tr.length : 0 };
  }
  function updateRing() {
    const p = progress();
    $("#meTxt").textContent = p.pct >= 10 ? Math.round(p.pct) + "%" : p.pct.toFixed(p.pct ? 1 : 0) + "%";
    $("#ringFg").style.strokeDashoffset = (100.5 * (1 - p.pct / 100)).toFixed(1);
  }
  function catRow(k) {
    const on = S.kinds.includes(k.key);
    let info = `<small>${k.count} no mapa</small>`;
    if (k.trackable) {
      const f = ITEMS.filter((o) => o.k === k.key && S.found[o.i]).length;
      info = `<small>${f} de ${k.count} encontrados</small><div class="bar"><i style="width:${(100 * f / k.count).toFixed(1)}%"></i></div>`;
    }
    const key = k.key === "mine" ? "star" : ICONS[k.key] ? k.key : "pin";
    return `<button class="cat ${on ? "on" : "off"}" type="button" data-k="${esc(k.key)}">
      <span class="ic" style="background:${k.colour}">${glyphSVG(key, "#fff", 2.4)}</span>
      <span class="tx"><b>${esc(k.name)}</b>${info}</span><span class="sw"></span></button>`;
  }
  function renderCats() {
    const p = progress();
    const groups = GROUPS.slice();
    if (S.mine.length) groups.push({ key: "Mine", name: "Meus pontos" });
    $("#tabCats").innerHTML = `<div class="prog"><b>${p.pct.toFixed(1)}%</b><p>${p.f} de ${p.t} colecionáveis, atividades e crimes</p>
      <div class="bar"><i style="width:${p.pct.toFixed(2)}%"></i></div></div>` + groups.map((g) => {
      const ks = g.key === "Mine" ? [Object.assign({}, MINE_KIND, { count: S.mine.length })] : Object.values(KINDS).filter((k) => k.group === g.key);
      const allOn = ks.every((k) => S.kinds.includes(k.key));
      return `<div class="grp-h"><h4>${esc(g.name)}</h4>
        <button type="button" data-g="${esc(g.key)}" data-v="${allOn ? 0 : 1}">${allOn ? "Ocultar todos" : "Mostrar todos"}</button></div>
        ${ks.map(catRow).join("")}`;
    }).join("");
  }
  $("#tabCats").addEventListener("click", (e) => {
    const c = e.target.closest(".cat");
    const g = e.target.closest("button[data-g]");
    if (c) {
      const k = c.dataset.k;
      S.kinds = S.kinds.includes(k) ? S.kinds.filter((x) => x !== k) : S.kinds.concat(k);
    } else if (g) {
      const keys = g.dataset.g === "Mine" ? ["mine"] : Object.values(KINDS).filter((k) => k.group === g.dataset.g).map((k) => k.key);
      S.kinds = S.kinds.filter((x) => !keys.includes(x));
      if (g.dataset.v === "1") S.kinds = S.kinds.concat(keys);
    } else return;
    S.chip = null;
    save(); refresh(); renderCats();
  });

  function renderMore() {
    const web = !NATIVE && "caches" in window && location.protocol.startsWith("http");
    const svg = (d) => `<svg viewBox="0 0 24 24">${d}</svg>`;
    $("#tabMore").innerHTML = `
      <button class="row ${S.style === "escuro" ? "on" : ""}" type="button" data-m="style">${svg('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>')}<span class="tx">Modo escuro</span><span class="sw"></span></button>
      <button class="row ${S.hideFound ? "on" : ""}" type="button" data-m="hide">${svg('<path d="M20 6 9 17l-5-5"/>')}<span class="tx">Ocultar encontrados</span><span class="sw"></span></button>
      ${S.chapter ? `<button class="row" type="button" data-m="spoilers">${svg('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>')}<span class="tx">Spoilers liberados até o ${S.chapter >= FINAL ? "capítulo final" : "Capítulo " + S.chapter}<small>Toque para esconder de novo</small></span></button>` : ""}
      <button class="row" type="button" data-m="defaults">${svg('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>')}<span class="tx">Mostrar todas as categorias</span></button>
      <div class="sep"></div>
      <button class="row" type="button" data-m="export">${svg('<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>')}<span class="tx">Exportar progresso<small>Arquivo .json de backup</small></span></button>
      <button class="row" type="button" data-m="import">${svg('<path d="M12 21V9M7 14l5-5 5 5M5 3h14"/>')}<span class="tx">Importar progresso<small>Junta com o que já está marcado</small></span></button>
      <button class="row" type="button" data-m="reset">${svg('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>')}<span class="tx" style="color:var(--red)">Zerar progresso</span></button>
      <input id="importFile" type="file" accept="application/json,.json" hidden>
      ${web ? `<div class="sep"></div>
        <button class="row" type="button" data-m="offline">${svg('<path d="M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2M12 12v9M8 17l4 4 4-4"/>')}<span class="tx">Baixar mapa para usar sem internet
          <small id="offInfo">${S.offline[S.style] ? "Mapa " + (S.style === "escuro" ? "escuro" : "padrão") + " já baixado ✓" : "≈ 110 MB (tipo de mapa atual + fotos)"}</small></span></button>
        <div id="offProg" style="padding:0 16px 10px" hidden><progress max="1" value="0"></progress></div>` : ""}
      <div class="sep"></div>
      <p class="note">Toque e segure no mapa para marcar um pino e salvar como seu ponto. Toque duas vezes e arraste para cima ou para baixo para dar zoom com um dedo.</p>
      <p class="note">
        ${ITEMS.length} pontos em ${Object.keys(KINDS).length} categorias. Dados, contornos e fotos:
        <a href="https://github.com/fbritoferreira/gta6" target="_blank" rel="noopener">Open GTA 6 Map</a> (fbritoferreira e colaboradores),
        <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>. Nomes dos lugares conforme o mapa oficial
        impresso de Leonida (Rockstar Games). Ícones <a href="https://lucide.dev" target="_blank" rel="noopener">Lucide</a> (ISC), fonte Roboto (Apache 2.0),
        mapa com <a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>.${META.commit ? ` Dados: ${esc(META.commit)}.` : ""}
        App de fã para uso pessoal, sem vínculo com a Rockstar Games nem com o Google.
      </p>`;
  }
  $("#tabMore").addEventListener("click", (e) => {
    const b = e.target.closest("[data-m]");
    if (!b) return;
    const m = b.dataset.m;
    if (m === "style") { setStyle(S.style === "escuro" ? "padrao" : "escuro"); renderMore(); }
    else if (m === "hide") { S.hideFound = !S.hideFound; save(); refresh(); renderMore(); }
    else if (m === "defaults") { S.kinds = defaultKinds(); S.chip = null; save(); refresh(); renderCats(); toast("Todas as categorias visíveis"); }
    else if (m === "spoilers") { S.chapter = 0; save(); renderMore(); toast("Descrições com spoiler escondidas de novo"); }
    else if (m === "export") exportProgress();
    else if (m === "import") $("#importFile").click();
    else if (m === "reset") {
      if (confirm("Apagar todo o progresso marcado? Seus pontos salvos continuam.")) { S.found = {}; save(); refresh(); renderCats(); toast("Progresso zerado"); }
    } else if (m === "offline") downloadOffline();
  });
  $("#tabMore").addEventListener("change", async (e) => {
    if (e.target.id !== "importFile" || !e.target.files[0]) return;
    try {
      const d = JSON.parse(await e.target.files[0].text());
      let n = 0;
      for (const id in d.found || {}) if (!S.found[id]) { S.found[id] = d.found[id]; n++; }
      const have = new Set(S.mine.map((m) => m.i));
      for (const m of d.mine || []) if (m && m.i && !have.has(m.i)) { m.k = "mine"; S.mine.push(m); n++; }
      save(); buildFeatures(); refresh(); renderCats();
      toast(`Importado: ${n} itens novos`);
    } catch (err) { toast("Arquivo inválido"); }
    e.target.value = "";
  });

  function exportProgress() {
    const data = JSON.stringify({ app: "mapa-leonida", date: new Date().toISOString(), found: S.found, mine: S.mine }, null, 1);
    const name = `leonida-progresso-${new Date().toISOString().slice(0, 10)}.json`;
    if (NATIVE && MW.share) { MW.share.postMessage({ name, data }); return; }
    const file = new File([data], name, { type: "application/json" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: name }).catch(() => {}); return; }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(file); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  async function downloadOffline() {
    if (!TILES || downloadOffline.busy) return;
    downloadOffline.busy = true;
    const style = S.style;
    const urls = [];
    for (const z in TILES) for (const k of TILES[z]) urls.push(`tiles/${style}/${z}/${k.replace(",", "/")}.webp`);
    for (const it of ITEMS) if (it.s) urls.push(`screenshots/${it.s}`);
    const prog = $("#offProg");
    if (prog) prog.hidden = false;
    let done = 0, failed = 0;
    try {
      const cache = await caches.open(MEDIA_CACHE);
      const queue = urls.slice();
      const worker = async () => {
        while (queue.length) {
          const u = queue.shift();
          try {
            if (!(await cache.match(u))) {
              const r = await fetch(u);
              if (r.ok) await cache.put(u, r); else failed++;
            }
          } catch (e) { failed++; }
          done++;
          if (done % 25 === 0 || done === urls.length) {
            const p = $("#offProg progress"), i = $("#offInfo");
            if (p) p.value = done / urls.length;
            if (i) i.textContent = `Baixando… ${done} de ${urls.length}`;
          }
        }
      };
      await Promise.all(Array.from({ length: 8 }, worker));
      if (!failed) { S.offline[style] = true; save(); }
      toast(failed ? `Terminou com ${failed} falhas — toque de novo para tentar` : "Pronto! O mapa funciona sem internet", 3000);
    } catch (e) {
      toast("Não deu para baixar: " + e.message, 3000);
    }
    downloadOffline.busy = false;
    if (panel.classList.contains("open")) renderMore();
  }

  // ================================================================ botões e escala
  $("#btnHome").addEventListener("click", () => fitLand(true));
  const scaleEl = $("#scale");
  let scaleT = 0;
  function updateScale() {
    const mPerPx = METERS_PER_UNIT / Math.pow(2, map.getZoom());
    const maxPx = 90;
    const raw = mPerPx * maxPx;
    const steps = [5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
    const m = steps.filter((s) => s <= raw).pop() || steps[0];
    $("#scaleTxt").textContent = m >= 1000 ? `${m / 1000} km` : `${m} m`;
    $("#scaleBar").style.width = (m / mPerPx).toFixed(0) + "px";
    scaleEl.classList.add("on");
    clearTimeout(scaleT); scaleT = setTimeout(() => scaleEl.classList.remove("on"), 1600);
  }
  map.on("zoom", updateScale);

  // ================================================================ gestos do Google Maps
  // toque duplo = zoom +1 · toque duplo e arrastar = zoom com um dedo · dois dedos tocando = zoom −1
  // toque longo = marca um pino
  (() => {
    const el = map.getContainer();
    let lastTap = 0, lastXY = null, quick = null, longT = 0, startXY = null, twoStart = 0, twoMoved = false;
    const cancelLong = () => { clearTimeout(longT); longT = 0; };
    el.addEventListener("touchstart", (e) => {
      if (e.touches.length === 2) { cancelLong(); twoStart = Date.now(); twoMoved = false; return; }
      if (e.touches.length !== 1) return cancelLong();
      const t = e.touches[0], now = Date.now();
      startXY = { x: t.clientX, y: t.clientY };
      if (now - lastTap < 300 && lastXY && Math.hypot(t.clientX - lastXY.x, t.clientY - lastXY.y) < 40) {
        // segundo toque: prepara zoom com um dedo
        const r = el.getBoundingClientRect();
        quick = { y: t.clientY, z: map.getZoom(), pt: L.point(t.clientX - r.left, t.clientY - r.top), moved: false };
        map.dragging.disable();
        cancelLong();
        e.preventDefault();
        return;
      }
      longT = setTimeout(() => {
        longT = 0;
        const r = el.getBoundingClientRect();
        const ll = map.containerPointToLatLng([startXY.x - r.left, startXY.y - r.top]);
        if (navigator.vibrate) navigator.vibrate(15);
        select({ i: "tmp", k: "tmp", n: "Pino marcado", x: ll.lng, y: -ll.lat });
      }, 600);
    }, { passive: false });
    el.addEventListener("touchmove", (e) => {
      if (e.touches.length === 2) twoMoved = true;
      if (quick && e.touches.length === 1) {
        const dy = e.touches[0].clientY - quick.y;
        if (Math.abs(dy) > 4) quick.moved = true;
        map.setZoomAround(quick.pt, clamp(quick.z + dy / 110, map.getMinZoom(), map.getMaxZoom()), { animate: false });
        e.preventDefault();
        return;
      }
      if (startXY && e.touches.length === 1) {
        const t = e.touches[0];
        if (Math.hypot(t.clientX - startXY.x, t.clientY - startXY.y) > 10) cancelLong();
      } else cancelLong();
    }, { passive: false });
    el.addEventListener("touchend", (e) => {
      cancelLong();
      if (quick) {
        if (!quick.moved) map.setZoomAround(quick.pt, Math.min(map.getMaxZoom(), quick.z + 1));
        quick = null;
        map.dragging.enable();
        lastTap = 0;
        return;
      }
      if (twoStart && e.touches.length === 0) {
        if (Date.now() - twoStart < 250 && !twoMoved) map.zoomOut(1);
        twoStart = 0;
      }
      if (e.changedTouches.length === 1 && e.touches.length === 0 && startXY) {
        const t = e.changedTouches[0];
        if (Math.hypot(t.clientX - startXY.x, t.clientY - startXY.y) < 10) { lastTap = Date.now(); lastXY = { x: t.clientX, y: t.clientY }; }
      }
    });
    // computador: duplo clique aproxima, botão direito marca pino
    map.on("dblclick", (e) => { if (!("ontouchstart" in window)) map.setZoomAround(e.containerPoint, map.getZoom() + 1); });
    map.on("contextmenu", (e) => { if (!("ontouchstart" in window)) select({ i: "tmp", k: "tmp", n: "Pino marcado", x: e.latlng.lng, y: -e.latlng.lat }); });
  })();

  // ================================================================ inicialização
  setStyle(S.style);
  overlay.addTo(map);
  renderer._container.classList.add("ov");
  let zoomT = 0;
  map.on("zoomstart", () => { clearTimeout(zoomT); map.getContainer().classList.add("zooming"); });
  map.on("zoomend", () => { clearTimeout(zoomT); zoomT = setTimeout(() => map.getContainer().classList.remove("zooming"), 70); });

  const getJSON = (u) => fetch(u).then((r) => r.json());
  Promise.all([
    getJSON("data/mapa.json"),
    getJSON("data/tiles.json").catch(() => null),
    getJSON("data/rotulos.json").catch(() => []),
    getJSON("data/rotas.json").catch(() => []),
    getJSON("data/icones.json").catch(() => ({})),
  ]).then(([data, tiles, rot, rotas, icons]) => {
    if (tiles) { TILES = {}; for (const z in tiles) TILES[z] = new Set(tiles[z]); }
    META = data;
    for (const k of data.kinds) KINDS[k.key] = k;
    GROUPS = data.groups;
    ITEMS = data.items;
    for (const it of ITEMS) BY_ID[it.i] = it;
    ROT = rot; ROTAS = rotas; ICONS = icons;
    if (!Array.isArray(S.kinds)) S.kinds = defaultKinds();
    for (const m of S.mine) m.k = "mine";
    buildFeatures();
    refresh();
    // redesenha quando a Roboto terminar de carregar (canvas não troca a fonte sozinho)
    if (document.fonts) {
      Promise.all(["400 12px Roboto", "500 12px Roboto", "700 12px Roboto"].map((f) => document.fonts.load(f)))
        .then(() => { measureCache.clear(); repaint(); }).catch(() => {});
    }
  }).catch((e) => toast("Erro ao carregar dados: " + e.message, 6000));

  if (!NATIVE && "serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
  window.__leonida = { map, S, select: (id) => select(BY_ID[id], { fly: true }) };
})();
