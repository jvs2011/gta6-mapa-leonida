#!/usr/bin/env node
/* Gera web/tiles/<estilo>/{z}/{y}/{x}.webp com o render.html no Chromium (Playwright).
 *
 *   node scripts/estilo/render.js <dados-fonte> <rasters> <web/> [estilos] [zooms] [tiles]
 *
 * dados-fonte: public/data do Open GTA 6 Map (land/surface/roads/rails.json)
 * rasters:     saída de rasters.py (relevo.png, vegetacao.png)
 * estilos:     "padrao,escuro" (padrão)
 * zooms:       "0,1,2,3,4,5" (padrão)
 * tiles:       "z/y,x;z/y,x" — só esses (para testes)
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const [src, rasters, web, stArg, zArg, only] = process.argv.slice(2);
const styles = (stArg || "padrao,escuro").split(",");
const zooms = (zArg || "0,1,2,3,4,5").split(",").map(Number);
const N = 4;        // tiles por lado em cada bloco
const WORKERS = 3;

(async () => {
  const tiles = JSON.parse(fs.readFileSync(path.join(web, "data/tiles.json"), "utf8"));
  const dataUrl = (f) => "data:image/png;base64," + fs.readFileSync(path.join(rasters, f)).toString("base64");
  const data = {
    land: JSON.parse(fs.readFileSync(path.join(src, "land.json"))),
    surface: JSON.parse(fs.readFileSync(path.join(src, "surface.json"))),
    roads: JSON.parse(fs.readFileSync(path.join(src, "roads.json"))),
    rails: JSON.parse(fs.readFileSync(path.join(src, "rails.json"))),
    relevo: dataUrl("relevo.png"), veg: dataUrl("vegetacao.png"),
  };
  const html = fs.readFileSync(path.join(__dirname, "render.html"), "utf8");

  const jobs = [];
  const onlySet = only ? new Set(only.split(";")) : null;
  for (const z of zooms) {
    const blocks = new Map();
    for (const k of tiles[z] || []) {
      if (onlySet && !onlySet.has(`${z}/${k}`)) continue;
      const [y, x] = k.split(",").map(Number);
      const bk = `${Math.floor(y / N) * N},${Math.floor(x / N) * N}`;
      if (!blocks.has(bk)) blocks.set(bk, []);
      blocks.get(bk).push(k);
    }
    for (const st of styles) for (const [bk, want] of blocks) {
      const [by, bx] = bk.split(",").map(Number);
      jobs.push({ st, z, bx, by, want });
    }
  }
  console.log(`${jobs.length} blocos`);

  const browser = await chromium.launch({ args: ["--disable-gpu"] });
  let done = 0, files = 0;
  const t0 = Date.now();
  async function worker() {
    const page = await browser.newPage();
    await page.setContent(html);
    await page.evaluate((d) => window.setup(d), data);
    while (jobs.length) {
      const j = jobs.shift();
      const out = await page.evaluate(([st, z, bx, by, n, want]) => window.renderChunk(st, z, bx, by, n, want),
        [j.st, j.z, j.bx, j.by, N, j.want]);
      for (const [tx, ty, url] of out) {
        const dir = path.join(web, "tiles", j.st, String(j.z), String(ty));
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, `${tx}.webp`), Buffer.from(url.split(",")[1], "base64"));
        files++;
      }
      done++;
      if (done % 40 === 0) console.log(`${done} blocos, ${files} tiles, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    }
    await page.close();
  }
  await Promise.all(Array.from({ length: WORKERS }, worker));
  await browser.close();
  console.log(`pronto: ${files} tiles em ${((Date.now() - t0) / 1000).toFixed(0)} s`);
})();
