/* Mapa Leonida — app pessoal de mapa do GTA VI.
 * Dados e mapa base: "Open GTA 6 Map" (github.com/fbritoferreira/gta6), CC BY 4.0.
 * Roda igual no Safari (PWA na tela de início) e dentro do app nativo (WKWebView).
 */
(() => {
  "use strict";

  // ---------------------------------------------------------------- constantes
  const BOUNDS = L.latLngBounds([-800, 160], [-160, 832]); // área com tiles (y vira -lat)
  const LAND = L.latLngBounds([-772, 205], [-218, 611]); // onde ficam os pontos: visão inicial
  const PIN_ZOOM = 2.75; // a partir daqui desenha pins; abaixo, bolinhas
  const LABELS_UNTIL = 3.25;
  const PIN_W = 28, PIN_H = 32;
  const KEY = "leonida:v1";
  const MEDIA_CACHE = "leonida-media-v1";
  const MW = window.webkit && window.webkit.messageHandlers;
  const NATIVE = !!(MW && MW.store);
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  // ---------------------------------------------------------------- estado salvo
  const DEFAULTS = { style: "night", kinds: null, hideFound: false, found: {}, mine: [], view: null, offline: {} };
  const S = (() => {
    let raw = window.__NATIVE_STATE__ || null;
    if (!raw) { try { raw = localStorage.getItem(KEY); } catch (e) { /* modo privado */ } }
    let s = {};
    try { s = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : {}; } catch (e) { s = {}; }
    return Object.assign({}, DEFAULTS, s, { found: s.found || {}, mine: s.mine || [], offline: s.offline || {} });
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

  // ---------------------------------------------------------------- mapa (abre na hora)
  document.body.classList.toggle("day", S.style === "day");
  const map = L.map("map", {
    crs: L.CRS.Simple, minZoom: -1, maxZoom: 7, zoomSnap: 0.25, zoomDelta: 0.5, wheelPxPerZoomLevel: 90,
    preferCanvas: true, maxBounds: BOUNDS.pad(0.3), maxBoundsViscosity: 0.9, zoomControl: false,
    bounceAtZoomLimits: false, tapTolerance: 12,
  });
  map.attributionControl.setPrefix(false);
  map.attributionControl.addAttribution('<a href="https://github.com/fbritoferreira/gta6" target="_blank" rel="noopener">Open GTA 6 Map</a> · CC BY 4.0');
  if (S.view) map.setView([S.view[1], S.view[0]], S.view[2], { animate: false });
  else map.fitBounds(LAND, { animate: false, paddingTopLeft: [8, 64], paddingBottomRight: [8, 8] });
  map.on("moveend", () => {
    const c = map.getCenter();
    S.view = [+c.lng.toFixed(2), +c.lat.toFixed(2), map.getZoom()];
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
  const tileLayer = (style) => new Tiles(`tiles/${style}/{z}/{z},{y},{x}.webp`, {
    tileSize: 256, minZoom: -1, minNativeZoom: 0, maxNativeZoom: 5, noWrap: true, bounds: BOUNDS,
    keepBuffer: 3, updateWhenZooming: false,
  });
  let base = null;
  function setStyle(style) {
    S.style = style;
    document.body.classList.toggle("day", style === "day");
    if (base) map.removeLayer(base);
    base = tileLayer(style).addTo(map);
    base.bringToBack();
    styleBtn();
    save();
  }

  // ---------------------------------------------------------------- dados
  let KINDS = {}, GROUPS = [], ITEMS = [], BY_ID = {}, LABELS = [], META = {};
  const MINE_KIND = { key: "mine", name: "Meus pontos", colour: "#ff4f9a", icon: "⭐", group: "Mine", trackable: false };

  const sprites = {};
  function sprite(slug) {
    let im = sprites[slug];
    if (!im) {
      im = sprites[slug] = new Image();
      im.onload = () => renderer && renderer._redraw && map.fire("leonida:redraw");
      im.src = `pins/${slug}.webp`;
    }
    return im.complete && im.naturalWidth ? im : null;
  }

  // ---------------------------------------------------------------- marcadores em canvas
  const renderer = L.canvas({ padding: 0.4, tolerance: 6 });
  let pinMode = map.getZoom() >= PIN_ZOOM;
  let selected = null;

  const Blip = L.CircleMarker.extend({
    _updateBounds() {
      const p = this._point;
      if (pinMode) this._pxBounds = L.bounds([p.x - PIN_W / 2 - 4, p.y - PIN_H - 4], [p.x + PIN_W / 2 + 4, p.y + 4]);
      else this._pxBounds = L.bounds([p.x - 10, p.y - 10], [p.x + 10, p.y + 10]);
    },
    _updatePath() { drawBlip(this); },
    _containsPoint(p) { return this._pxBounds.contains(p); },
  });

  function drawBlip(layer) {
    const r = layer._renderer;
    if (!r._drawing) return;
    const ctx = r._ctx, p = layer._point, it = layer.item, k = KINDS[it.k] || MINE_KIND;
    const found = !!S.found[it.i];
    ctx.save();
    if (pinMode) {
      if (found) ctx.globalAlpha = 0.4;
      const im = it.p ? sprite(it.p) : null;
      if (im) ctx.drawImage(im, p.x - PIN_W / 2, p.y - PIN_H, PIN_W, PIN_H);
      else badge(ctx, p, k);
      ctx.globalAlpha = 1;
      if (found) check(ctx, p.x + 9, p.y - PIN_H + 4);
      if (selected === it) {
        ctx.beginPath(); ctx.ellipse(p.x, p.y, 13, 5, 0, 0, 6.2832);
        ctx.lineWidth = 3; ctx.strokeStyle = "#ff4f9a"; ctx.stroke();
      }
    } else {
      const rad = map.getZoom() < 1 ? 3 : 4;
      ctx.beginPath(); ctx.arc(p.x, p.y, rad + (selected === it ? 3 : 0), 0, 6.2832);
      ctx.fillStyle = found ? "#56627a" : k.colour; ctx.fill();
      ctx.lineWidth = selected === it ? 2.5 : 1; ctx.strokeStyle = selected === it ? "#fff" : "rgba(0,0,0,.65)"; ctx.stroke();
    }
    ctx.restore();
  }
  function badge(ctx, p, k) {
    const cy = p.y - 17;
    ctx.beginPath();
    ctx.moveTo(p.x - 6, cy + 9); ctx.lineTo(p.x, p.y); ctx.lineTo(p.x + 6, cy + 9); ctx.closePath();
    ctx.fillStyle = "#fff"; ctx.fill();
    ctx.beginPath(); ctx.arc(p.x, cy, 13, 0, 6.2832);
    ctx.fillStyle = k.colour; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = "#fff"; ctx.stroke();
    ctx.font = "15px -apple-system, 'Apple Color Emoji', sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(k.icon, p.x, cy + 1);
  }
  function check(ctx, x, y) {
    ctx.beginPath(); ctx.arc(x, y, 7, 0, 6.2832); ctx.fillStyle = "#22c55e"; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = "#fff"; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 3.2, y); ctx.lineTo(x - 0.8, y + 2.4); ctx.lineTo(x + 3.4, y - 2.6);
    ctx.lineWidth = 2; ctx.stroke();
  }

  const layerGroup = L.layerGroup().addTo(map);
  const blips = new Map(); // id -> Blip

  function blipFor(it) {
    let b = blips.get(it.i);
    if (!b) {
      b = new Blip([-it.y, it.x], { renderer, radius: 6, stroke: false, fill: false, bubblingMouseEvents: false });
      b.item = it;
      b.on("click", (e) => { L.DomEvent.stop(e); select(it); });
      blips.set(it.i, b);
    }
    return b;
  }
  const allItems = () => ITEMS.concat(S.mine);
  const isVisible = (it) => (it.k === "mine" ? S.kinds.includes("mine") : S.kinds.includes(it.k)) && !(S.hideFound && S.found[it.i]);

  function refreshMarkers() {
    layerGroup.clearLayers();
    // lugares primeiro, colecionáveis por cima
    const list = allItems().filter(isVisible);
    list.sort((a, b) => rank(a) - rank(b));
    for (const it of list) layerGroup.addLayer(blipFor(it));
    if (selected && !list.includes(selected) && selected.k !== "mine") layerGroup.addLayer(blipFor(selected));
    updateBadge();
  }
  const rank = (it) => (it.k === "mine" ? 3 : KINDS[it.k] && KINDS[it.k].group === "Places" ? 0 : 1);
  // força o canvas a redesenhar tudo (ex.: marcar encontrado, imagem do pin carregou)
  function repaint() {
    if (!renderer._map) return;
    renderer._redrawBounds = null;
    for (const id in renderer._layers) { const l = renderer._layers[id]; l._project(); }
    renderer._redraw();
  }
  map.on("leonida:redraw", () => { clearTimeout(repaint.t); repaint.t = setTimeout(repaint, 60); });
  map.on("zoomend", () => {
    const pm = map.getZoom() >= PIN_ZOOM;
    if (pm !== pinMode) { pinMode = pm; repaint(); }
    else repaint();
    updateLabels();
  });

  // rótulos das regiões
  const labelLayer = L.layerGroup();
  function updateLabels() {
    const show = map.getZoom() < LABELS_UNTIL;
    if (show && !map.hasLayer(labelLayer)) labelLayer.addTo(map);
    if (!show && map.hasLayer(labelLayer)) map.removeLayer(labelLayer);
    if (!show) return;
    // esconde rótulos que encostariam em outro já mostrado (ordem do arquivo = prioridade)
    const taken = [];
    labelLayer.eachLayer((m) => {
      const el = m.getElement();
      if (!el) return;
      const p = map.latLngToContainerPoint(m.getLatLng());
      const w = m._labelW || (m._labelW = el.firstChild.offsetWidth || 80);
      const box = [p.x - w / 2 - 6, p.y - 10, p.x + w / 2 + 6, p.y + 10];
      const hit = taken.some((b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1]);
      el.style.visibility = hit ? "hidden" : "";
      if (!hit) taken.push(box);
    });
  }

  // ---------------------------------------------------------------- folha de detalhe
  const sheet = $("#sheet"), sheetBody = $("#sheetBody");
  function iconHTML(it, k) {
    return it.p ? `<img src="pins/${esc(it.p)}.webp" alt="">` : `<span>${esc(k.icon)}</span>`;
  }
  function select(it, opts = {}) {
    selected = it;
    const k = KINDS[it.k] || MINE_KIND;
    const found = !!S.found[it.i];
    const sub = [k.name, it.t && norm(it.t) !== norm(k.name) && norm(it.t) !== norm(k.en) ? it.t : ""].filter(Boolean).join(" · ");
    const where = [it.a, it.z && (!it.a || !it.a.includes(it.z)) ? it.z : ""].filter(Boolean).join(" — ");
    const trackable = k.trackable;
    const sameLeft = trackable ? ITEMS.filter((o) => o.k === it.k && !S.found[o.i] && o !== it).length : 0;
    sheetBody.innerHTML = `
      <div class="d-head">
        <div class="ic">${iconHTML(it, k)}</div>
        <div><h3>${esc(it.n)}</h3><p>${esc(sub)}</p></div>
        <button class="round flat d-close" type="button" aria-label="Fechar" data-act="close">×</button>
      </div>
      ${it.s ? `<div class="d-shot" data-act="zoom"><img src="screenshots/${esc(it.s)}" alt="" loading="lazy"></div>` : ""}
      ${it.d ? `<p class="d-desc">${esc(it.d)}</p>` : ""}
      <div class="d-meta">
        ${where ? `<div>📍 <b>${esc(where)}</b></div>` : ""}
        ${it.r ? `<div>🌴 Na vida real: ${esc(it.r)}</div>` : ""}
        ${trackable ? `<div>${progressText(it.k)}</div>` : ""}
      </div>
      <div class="d-actions">
        ${trackable ? `<button class="btn ${found ? "done" : "primary"}" type="button" data-act="found">
            <svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>${found ? "Encontrado" : "Marcar encontrado"}</button>` : ""}
        ${trackable && sameLeft ? `<button class="btn" type="button" data-act="next">
            <svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>Próximo perto</button>` : ""}
        ${it.k === "mine" ? `<button class="btn" type="button" data-act="rename">Renomear</button>
            <button class="btn danger" type="button" data-act="delete">Apagar</button>` : ""}
      </div>`;
    sheet.classList.add("open");
    sheet.setAttribute("aria-hidden", "false");
    sheet.scrollTop = 0;
    document.body.classList.add("sheet-open");
    if (!isVisible(it) && it.k !== "mine") layerGroup.addLayer(blipFor(it));
    repaint();
    const ll = L.latLng(-it.y, it.x);
    if (opts.fly) {
      const z = Math.max(map.getZoom(), opts.zoom || 4);
      map.flyTo(ll, z, { duration: 0.7 });
      map.once("moveend", () => keepAboveSheet(ll));
    } else requestAnimationFrame(() => keepAboveSheet(ll));
  }
  function keepAboveSheet(ll) {
    const pt = map.latLngToContainerPoint(ll);
    const sheetTop = window.innerHeight - sheet.offsetHeight - 16;
    const top = 70;
    if (pt.y > sheetTop - 10 || pt.y < top + PIN_H) {
      const target = Math.max(top + PIN_H + 20, (top + sheetTop) / 2 + PIN_H / 2);
      map.panBy([0, pt.y - target], { duration: 0.35 });
    }
  }
  function closeSheet() {
    sheet.classList.remove("open");
    sheet.setAttribute("aria-hidden", "true");
    document.body.classList.remove("sheet-open");
    const was = selected;
    selected = null;
    if (was && !isVisible(was)) refreshMarkers();
    else repaint();
  }
  sheet.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b || !selected) return;
    const it = selected, act = b.dataset.act;
    if (act === "close") closeSheet();
    else if (act === "zoom") openViewer(`screenshots/${it.s}`);
    else if (act === "found") {
      if (S.found[it.i]) delete S.found[it.i]; else S.found[it.i] = Date.now();
      save();
      if (S.found[it.i] && S.hideFound) toast("Marcado e ocultado");
      select(it);
      renderCats();
    } else if (act === "next") {
      const c = ITEMS.filter((o) => o.k === it.k && !S.found[o.i] && o !== it)
        .sort((a, b) => Math.hypot(a.x - it.x, a.y - it.y) - Math.hypot(b.x - it.x, b.y - it.y))[0];
      if (c) select(c, { fly: true, zoom: 4 });
    } else if (act === "delete") {
      if (!confirm(`Apagar "${it.n}"?`)) return;
      S.mine = S.mine.filter((m) => m !== it);
      blips.delete(it.i);
      save(); closeSheet(); refreshMarkers(); renderCats();
    } else if (act === "rename") {
      const n = prompt("Nome do ponto", it.n);
      if (n && n.trim()) { it.n = n.trim().slice(0, 60); it._s = null; save(); select(it); }
    }
  });
  // arrastar a folha para baixo fecha
  (() => {
    let y0 = null, dy = 0;
    sheet.addEventListener("touchstart", (e) => { y0 = sheet.scrollTop <= 0 ? e.touches[0].clientY : null; dy = 0; }, { passive: true });
    sheet.addEventListener("touchmove", (e) => {
      if (y0 == null) return;
      dy = e.touches[0].clientY - y0;
      if (dy > 0) { sheet.style.transition = "none"; sheet.style.transform = `translateY(${dy}px)`; }
    }, { passive: true });
    sheet.addEventListener("touchend", () => {
      sheet.style.transition = ""; sheet.style.transform = "";
      if (y0 != null && dy > 90) closeSheet();
      y0 = null;
    });
  })();
  map.on("click", () => { if (selected) closeSheet(); hideResults(); });

  function openViewer(src) {
    const v = $("#viewer");
    v.querySelector("img").src = src;
    v.hidden = false;
  }
  $("#viewer").addEventListener("click", () => { $("#viewer").hidden = true; });

  function progressText(kind) {
    const all = ITEMS.filter((o) => o.k === kind);
    const f = all.filter((o) => S.found[o.i]).length;
    return `✅ ${f} de ${all.length} encontrados nesta categoria`;
  }

  // ---------------------------------------------------------------- toast
  let toastT = 0;
  function toast(msg, ms = 1800) {
    const t = $("#toast");
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, ms);
  }

  // ---------------------------------------------------------------- busca
  const q = $("#q"), results = $("#results");
  function searchText(it) {
    if (!it._s) {
      const k = KINDS[it.k] || MINE_KIND;
      it._s = norm([it.n, it.t, k.name, k.en, it.a, it.z, it.r, it.i].join(" "));
    }
    return it._s;
  }
  function hideResults() { results.hidden = true; }
  function runSearch() {
    const raw = q.value.trim();
    $("#qClear").hidden = !raw;
    if (!raw) { hideResults(); return; }
    const words = norm(raw).split(/\s+/).filter(Boolean);
    const nq = norm(raw);
    const cats = Object.values(KINDS).filter((k) => words.every((w) => norm(k.name + " " + k.en).includes(w))).slice(0, 4);
    const regs = LABELS.filter((l) => norm(l.n).includes(nq)).slice(0, 3);
    const hits = [];
    for (const it of allItems()) {
      const s = searchText(it);
      if (words.every((w) => s.includes(w))) hits.push(it);
    }
    hits.sort((a, b) => {
      const sa = norm(a.n).startsWith(nq) ? 0 : norm(a.n).includes(nq) ? 1 : 2;
      const sb = norm(b.n).startsWith(nq) ? 0 : norm(b.n).includes(nq) ? 1 : 2;
      return sa - sb || a.n.localeCompare(b.n);
    });
    let html = "";
    if (regs.length) {
      html += `<div class="res-h">Regiões</div>` + regs.map((l, i) =>
        `<button class="res" type="button" data-reg="${i}"><span class="ic">🗺️</span><span class="tx"><b>${esc(l.n)}</b></span></button>`).join("");
    }
    if (cats.length) {
      html += `<div class="res-h">Categorias</div>` + cats.map((k) =>
        `<button class="res" type="button" data-cat="${esc(k.key)}"><span class="ic">${k.pin ? `<img src="pins/${esc(k.pin)}.webp" alt="">` : esc(k.icon)}</span>
         <span class="tx"><b>${esc(k.name)}</b><small>Mostrar só esta categoria · ${k.count}</small></span></button>`).join("");
    }
    if (hits.length) {
      html += `<div class="res-h">Lugares · ${hits.length}</div>` + hits.slice(0, 80).map((it) => {
        const k = KINDS[it.k] || MINE_KIND;
        return `<button class="res" type="button" data-id="${esc(it.i)}"><span class="ic">${iconHTML(it, k)}</span>
          <span class="tx"><b>${esc(it.n)}</b><small>${esc([k.name, it.z || it.a].filter(Boolean).join(" · "))}</small></span>
          ${S.found[it.i] ? '<span class="ok">✓</span>' : ""}</button>`;
      }).join("");
    }
    if (!html) html = `<div class="empty">Nada encontrado para “${esc(raw)}”</div>`;
    results.innerHTML = html;
    results.hidden = false;
    results.scrollTop = 0;
    results._regs = regs;
  }
  q.addEventListener("input", runSearch);
  q.addEventListener("focus", () => { if (q.value.trim()) runSearch(); if (selected) closeSheet(); });
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
      if (it.k !== "mine" && !S.kinds.includes(it.k)) { S.kinds.push(it.k); save(); refreshMarkers(); renderCats(); }
      select(it, { fly: true, zoom: 4.5 });
    } else if (b.dataset.cat) {
      showOnly(b.dataset.cat);
    } else if (b.dataset.reg) {
      const l = results._regs[+b.dataset.reg];
      map.flyTo([-l.y, l.x], 3, { duration: 0.8 });
    }
  });
  function showOnly(key) {
    S.kinds = [key];
    if (S.mine.length) S.kinds.push("mine");
    save(); refreshMarkers(); renderCats();
    const pts = ITEMS.filter((o) => o.k === key).map((o) => [-o.y, o.x]);
    if (pts.length) map.flyToBounds(L.latLngBounds(pts).pad(0.08), { duration: 0.8, paddingTopLeft: [10, 70] });
    toast(`Mostrando só: ${KINDS[key].name}`);
  }

  // ---------------------------------------------------------------- painel de filtros
  const panel = $("#panel");
  function openPanel() { renderCats(); renderMore(); panel.classList.add("open"); panel.setAttribute("aria-hidden", "false"); hideResults(); if (selected) closeSheet(); }
  function closePanel() { panel.classList.remove("open"); panel.setAttribute("aria-hidden", "true"); }
  $("#btnFilters").addEventListener("click", () => (panel.classList.contains("open") ? closePanel() : openPanel()));
  $("#panelClose").addEventListener("click", closePanel);
  panel.querySelector(".panel-tabs").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-tab]");
    if (!b) return;
    panel.querySelectorAll(".panel-tabs button").forEach((x) => x.classList.toggle("on", x === b));
    $("#tabCats").hidden = b.dataset.tab !== "cats";
    $("#tabMore").hidden = b.dataset.tab !== "more";
  });

  function catRow(k) {
    const on = S.kinds.includes(k.key);
    let info = `<span class="n">${k.count}</span>`;
    if (k.trackable) {
      const f = ITEMS.filter((o) => o.k === k.key && S.found[o.i]).length;
      info = `<span class="n">${f}/${k.count}</span><div class="bar"><i style="width:${(100 * f / k.count).toFixed(1)}%"></i></div>`;
    }
    return `<button class="cat ${on ? "on" : "off"}" type="button" data-k="${esc(k.key)}">
      <span class="ic">${k.pin ? `<img src="pins/${esc(k.pin)}.webp" alt="" loading="lazy">` : esc(k.icon)}</span>
      <span class="tx"><b>${esc(k.name)}</b>${info}</span><span class="sw"></span></button>`;
  }
  function renderCats() {
    const trackable = ITEMS.filter((o) => KINDS[o.k] && KINDS[o.k].trackable);
    const f = trackable.filter((o) => S.found[o.i]).length;
    $("#totalProgress").textContent = `${f} de ${trackable.length} colecionáveis e atividades (${(100 * f / Math.max(1, trackable.length)).toFixed(1)}%)`;
    const groups = GROUPS.slice();
    if (S.mine.length) groups.push({ key: "Mine", name: "Meus pontos" });
    $("#tabCats").innerHTML = groups.map((g) => {
      const ks = g.key === "Mine" ? [Object.assign({}, MINE_KIND, { count: S.mine.length })] : Object.values(KINDS).filter((k) => k.group === g.key);
      const allOn = ks.every((k) => S.kinds.includes(k.key));
      return `<div class="grp"><div class="grp-h"><h4>${esc(g.name)}</h4>
        <button type="button" data-g="${esc(g.key)}" data-v="${allOn ? 0 : 1}">${allOn ? "Nenhum" : "Todos"}</button></div>
        <div class="card-box">${ks.map(catRow).join("")}</div></div>`;
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
    save(); refreshMarkers(); renderCats();
  });
  function defaultKinds() {
    return Object.values(KINDS).filter((k) => k.group !== "Places").map((k) => k.key).concat("mine");
  }
  function updateBadge() {
    const total = Object.keys(KINDS).length;
    const on = S.kinds.filter((k) => KINDS[k]).length;
    const b = $("#filterBadge");
    const def = defaultKinds().filter((k) => KINDS[k]);
    const isDefault = on === def.length && def.every((k) => S.kinds.includes(k));
    b.hidden = isDefault || on === total;
    b.textContent = on;
  }

  function renderMore() {
    const web = !NATIVE && "caches" in window && location.protocol.startsWith("http");
    $("#tabMore").innerHTML = `
      <div class="card-box">
        <button class="row ${S.style === "day" ? "on" : ""}" type="button" data-m="style"><span class="tx">Mapa de dia<small>Água azul e terra clara</small></span><span class="sw"></span></button>
        <button class="row ${S.hideFound ? "on" : ""}" type="button" data-m="hide"><span class="tx">Ocultar encontrados<small>Esconde o que você já marcou</small></span><span class="sw"></span></button>
        <button class="row" type="button" data-m="defaults"><span class="tx">Restaurar categorias padrão<small>Tudo menos “Lugares”</small></span></button>
      </div>
      <div class="card-box">
        <button class="row" type="button" data-m="export"><span class="tx">Exportar progresso<small>Salva um arquivo .json (backup)</small></span></button>
        <button class="row" type="button" data-m="import"><span class="tx">Importar progresso<small>Junta com o que já está marcado</small></span></button>
        <button class="row" type="button" data-m="reset"><span class="tx" style="color:#ff8080">Zerar progresso</span></button>
        <input id="importFile" type="file" accept="application/json,.json" hidden>
      </div>
      ${web ? `<div class="card-box">
        <button class="row" type="button" data-m="offline"><span class="tx">Baixar mapa para usar sem internet
          <small id="offInfo">${S.offline[S.style] ? "Mapa " + (S.style === "day" ? "de dia" : "de noite") + " já baixado ✓" : "≈ 130 MB (estilo atual + fotos)"}</small></span></button>
        <div id="offProg" style="padding:0 10px 10px" hidden><progress max="1" value="0"></progress></div>
      </div>` : ""}
      <p class="note">Dica: toque e segure no mapa para criar um ponto seu.</p>
      <p class="note">
        ${ITEMS.length} pontos em ${Object.keys(KINDS).length} categorias.<br>
        Dados, mapa base e fotos: <a href="https://github.com/fbritoferreira/gta6" target="_blank" rel="noopener">Open GTA 6 Map</a>
        (fbritoferreira e colaboradores), licença <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>.
        Contorno do mapa traçado a partir do mapa oficial impresso da Rockstar.${META.commit ? ` Versão dos dados: ${esc(META.commit)}.` : ""}<br>
        Mapa com <a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>. App de fã, uso pessoal, sem vínculo com a Rockstar Games.
      </p>`;
  }
  $("#tabMore").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-m]");
    if (!b) return;
    const m = b.dataset.m;
    if (m === "style") { setStyle(S.style === "day" ? "night" : "day"); renderMore(); }
    else if (m === "hide") { toggleHide(); renderMore(); }
    else if (m === "defaults") { S.kinds = defaultKinds(); save(); refreshMarkers(); renderCats(); toast("Categorias padrão"); }
    else if (m === "export") exportProgress();
    else if (m === "import") $("#importFile").click();
    else if (m === "reset") {
      if (confirm("Apagar todo o progresso marcado? Seus pontos pessoais continuam.")) { S.found = {}; save(); repaint(); renderCats(); toast("Progresso zerado"); }
    } else if (m === "offline") downloadOffline();
  });
  $("#tabMore").addEventListener("change", async (e) => {
    if (e.target.id !== "importFile" || !e.target.files[0]) return;
    try {
      const d = JSON.parse(await e.target.files[0].text());
      const found = d.found || {};
      let n = 0;
      for (const id in found) if (!S.found[id]) { S.found[id] = found[id]; n++; }
      const have = new Set(S.mine.map((m) => m.i));
      for (const m of d.mine || []) if (m && m.i && !have.has(m.i)) { S.mine.push(m); n++; }
      save(); refreshMarkers(); renderCats();
      toast(`Importado: ${n} novos itens`);
    } catch (err) { toast("Arquivo inválido"); }
    e.target.value = "";
  });

  function exportProgress() {
    const data = JSON.stringify({ app: "mapa-leonida", date: new Date().toISOString(), found: S.found, mine: S.mine }, null, 1);
    const name = `leonida-progresso-${new Date().toISOString().slice(0, 10)}.json`;
    if (NATIVE && MW.share) { MW.share.postMessage({ name, data }); return; }
    const file = new File([data], name, { type: "application/json" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: name }).catch(() => {});
      return;
    }
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
    for (const z in TILES) for (const k of TILES[z]) urls.push(`tiles/${style}/${z}/${z},${k}.webp`);
    for (const it of ITEMS) if (it.s) urls.push(`screenshots/${it.s}`);
    for (const k of new Set(ITEMS.map((i) => i.p).filter(Boolean))) urls.push(`pins/${k}.webp`);
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

  // ---------------------------------------------------------------- botões laterais
  function styleBtn() {
    $("#btnStyle").innerHTML = S.style === "day"
      ? '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  }
  function toggleHide() {
    S.hideFound = !S.hideFound;
    $("#btnFound").classList.toggle("on", S.hideFound);
    save(); refreshMarkers();
    toast(S.hideFound ? "Ocultando encontrados" : "Mostrando encontrados");
  }
  $("#btnStyle").addEventListener("click", () => setStyle(S.style === "day" ? "night" : "day"));
  $("#btnFound").addEventListener("click", toggleHide);
  $("#btnHome").addEventListener("click", () => map.flyToBounds(LAND, { duration: 0.7, paddingTopLeft: [8, 64], paddingBottomRight: [8, 8] }));

  // ---------------------------------------------------------------- pontos pessoais (toque longo)
  function addMine(ll) {
    const n = prompt("Nome do seu ponto", "Meu ponto");
    if (n == null) return;
    const it = { i: "mine-" + Date.now().toString(36), k: "mine", x: +ll.lng.toFixed(2), y: +(-ll.lat).toFixed(2), n: (n.trim() || "Meu ponto").slice(0, 60) };
    S.mine.push(it);
    if (!S.kinds.includes("mine")) S.kinds.push("mine");
    save(); refreshMarkers(); renderCats();
    select(it);
  }
  (() => {
    const el = map.getContainer();
    let t = 0, start = null;
    const cancel = () => { clearTimeout(t); t = 0; start = null; };
    el.addEventListener("touchstart", (e) => {
      if (e.touches.length !== 1) return cancel();
      const touch = e.touches[0];
      start = { x: touch.clientX, y: touch.clientY };
      t = setTimeout(() => {
        const r = el.getBoundingClientRect();
        const ll = map.containerPointToLatLng([start.x - r.left, start.y - r.top]);
        cancel();
        addMine(ll);
      }, 650);
    }, { passive: true });
    el.addEventListener("touchmove", (e) => {
      if (!start) return;
      const touch = e.touches[0];
      if (e.touches.length > 1 || Math.hypot(touch.clientX - start.x, touch.clientY - start.y) > 10) cancel();
    }, { passive: true });
    el.addEventListener("touchend", cancel);
    el.addEventListener("touchcancel", cancel);
    map.on("contextmenu", (e) => { if (!("ontouchstart" in window)) addMine(e.latlng); });
  })();

  // ---------------------------------------------------------------- inicialização
  setStyle(S.style);
  $("#btnFound").classList.toggle("on", S.hideFound);

  Promise.all([
    fetch("data/mapa.json").then((r) => r.json()),
    fetch("data/tiles.json").then((r) => r.json()).catch(() => null),
  ]).then(([data, tiles]) => {
    if (tiles) {
      TILES = {};
      for (const z in tiles) TILES[z] = new Set(tiles[z]); // vale para os próximos tiles (sem redraw: bug do Leaflet com zoom fracionado)
    }
    META = data;
    for (const k of data.kinds) KINDS[k.key] = k;
    GROUPS = data.groups;
    ITEMS = data.items;
    for (const it of ITEMS) BY_ID[it.i] = it;
    const PRIO = ["Vice City", "Port Gellhorn", "Ambrosia", "Key Lento", "Hamlet", "Gloriana Key", "Watson Bay", "Capri", "Vice Beach", "Waning Sands"];
    const pr = (n) => (PRIO.indexOf(n) + 1 || 99);
    LABELS = data.labels.slice().sort((a, b) => pr(a.n) - pr(b.n));
    for (const l of LABELS) {
      L.marker([-l.y, l.x], { interactive: false, keyboard: false, icon: L.divIcon({ className: "", html: `<div class="lbl">${esc(l.n)}</div>`, iconSize: [0, 0] }) }).addTo(labelLayer);
    }
    updateLabels();
    if (!Array.isArray(S.kinds)) S.kinds = defaultKinds();
    for (const m of S.mine) m.k = "mine";
    refreshMarkers();
  }).catch((e) => toast("Erro ao carregar dados: " + e.message, 6000));

  if (!NATIVE && "serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
  // debug/teste
  window.__leonida = { map, S, select: (id) => select(BY_ID[id], { fly: true }) };
})();
