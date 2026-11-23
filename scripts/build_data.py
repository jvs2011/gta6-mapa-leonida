#!/usr/bin/env python3
"""Monta web/data/mapa.json a partir do projeto "Open GTA 6 Map" (CC BY 4.0).

Uso:
    python3 scripts/build_data.py /caminho/para/fbritoferreira_gta6

Também copia tiles, pins e screenshots para web/. Rode de novo sempre que
atualizar o repositório de origem (git pull) para pegar pontos novos.
"""
import json
import math
import re
import shutil
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "traducao"))
import traduzir as tr  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / "web"

# Nomes das categorias em português (chave = "kind" do dataset).
PT = {
    "flamingo": "Flamingos de cocaína", "card": "Cartas colecionáveis", "waink": "Fotos WAiNK",
    "magazine": "Revistas, livros e HQs", "meditation": "Pontos de meditação",
    "underwater": "Descobertas subaquáticas", "kenton": "Conjuntos Kenton", "playlist": "Playlists únicas",
    "hoop": "Cestas de basquete", "bret": "Alvos do Bret", "stunt": "Saltos e acrobacias",
    "race": "Corridas", "drone": "Contra-relógio de drone", "range": "Estandes de tiro",
    "arcade": "Fliperama, sinuca e minigolfe", "gang": "Operações de gangue", "bank": "Bancos e cofres-fortes",
    "smash": "Smash 'n' Grab", "store": "Lojas para assaltar", "fence": "Receptadores e Pay n Spray",
    "other": "Outros", "package": "Pacotes escondidos", "meteorite": "Meteoritos", "treasure": "Tesouros",
    "bottle": "Mensagens na garrafa", "bookswap": "Trocas de livros", "mural": "Murais 1010",
    "streetart": "Arte de rua Ahol", "vehicle": "Veículos especiais", "bridge": "Sob as pontes",
    "knife": "Voos rasantes (Knife flights)", "basejump": "BASE jump e paraquedas", "fishing": "Pesca",
    "hunting": "Caça", "event": "Eventos aleatórios", "safe": "Cofres", "towatm": "Caixas eletrônicos rebocáveis",
    "payday": "Agiotas (Payday loans)", "weapon": "Armas no mapa", "safehouse": "Esconderijos",
    "shop": "Lojas e serviços", "food": "Comida, bares e baladas", "hotel": "Hotéis", "transport": "Transporte",
    "civic": "Polícia, hospitais e governo", "leisure": "Lazer e esporte", "nature": "Natureza",
    "building": "Prédios e pontos turísticos",
}
# Cores no padrão Google Maps (por grupo; lugares têm cor por tipo)
GROUP_COLOR = {"Collectibles": "#9334e6", "Activities": "#c5221f", "Crime": "#3c4043", "Other": "#70757a"}
PLACE_COLOR = {"food": "#f29900", "shop": "#1a73e8", "hotel": "#d81b60", "transport": "#1a73e8",
               "civic": "#70757a", "leisure": "#12a4af", "nature": "#34a853", "building": "#12a4af",
               "safehouse": "#5f6368"}
# zoom do app a partir do qual o ponto aparece (como o Google: o mais importante primeiro)
GROUP_MINZ = {"Collectibles": 3.0, "Activities": 3.25, "Crime": 3.5, "Other": 4.0}
PLACE_MINZ = {"building": 3.5, "nature": 3.0, "hotel": 3.25, "leisure": 3.25, "civic": 3.5, "food": 4.0,
              "shop": 4.0, "transport": 4.5, "safehouse": 3.25}

GROUP_PT = {"Collectibles": "Colecionáveis", "Activities": "Atividades", "Crime": "Crime",
            "Places": "Lugares", "Other": "Outros"}

PIN_ALIASES = {"comics": "magazine", "cafe-takeout": "street-food", "food-and-drink": "bar",
               "phone-store": "electronics", "parachuting": "base-jump", "gang-compound": "gang-operation",
               "vehicle-mod-shop": "pay-n-spray"}
KIND_PINS = {"card": "collectible-card", "magazine": "magazine", "bookswap": "book-swap",
             "waink": "waink-curiosity", "food": "bar", "transport": "bus-stop", "safehouse": "safehouse",
             "fence": "fence"}


def type_of(i):
    return re.sub(r"-\d+$", "", i)


def norm(s):
    return re.sub(r"[^a-z0-9]+", " ", (s or "").lower()).strip()


def words(*s):
    out = set()
    for w in norm(" ".join(x for x in s if x)).split(" "):
        if len(w) > 2 and w not in ("the", "and"):
            out.add(re.sub(r"s$", "", w))
    return out


def merge_places(locations, places):
    """Mesma regra do projeto original (src/merge.ts): lugar duplicado vira parte da location."""
    by_name, by_kind = defaultdict(list), defaultdict(list)
    for l in locations:
        by_name[norm(l["name"])].append(l)
        by_kind[l.get("kind")].append(l)
    out = {l["id"]: dict(l) for l in locations}
    kept = []
    for p in places:
        def dist(l):
            return math.hypot(l["x"] - p["x"], l["y"] - p["y"])
        twin = None
        if p.get("same_as"):
            twin = next((l for l in locations if l["id"] == p["same_as"]), None)
        if not twin:
            c = sorted((l for l in by_name[norm(p["name"])] if dist(l) < 1), key=dist)
            twin = c[0] if c else None
        if not twin:
            twin = next((l for l in by_kind[p.get("kind")] if dist(l) < 0.05), None)
        if not twin:
            pw = words(p["name"], p.get("service"))
            c = sorted((l for l in by_kind[p.get("kind")]
                        if dist(l) < 0.5 and words(l["name"], l.get("type")) & pw), key=dist)
            twin = c[0] if c else None
        if not twin:
            kept.append(p)
            continue
        l = out[twin["id"]]
        l["area"] = p.get("area") or l.get("area")
        l["real_life"] = l.get("real_life") or p.get("real_life")
    return list(out.values()) + kept


def point_in_ring(x, y, ring):
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]
        xj, yj = ring[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def district_at(x, y, districts):
    for d in districts:
        rings = d["rings"]
        # rings pode ser [ring,...] ou [[ring,...],...] (multipolígono)
        polys = rings if rings and isinstance(rings[0][0][0], list) else [rings]
        for poly in polys:
            if point_in_ring(x, y, poly[0]) and not any(point_in_ring(x, y, h) for h in poly[1:]):
                return d["name"]
    return None


def main(src):
    src = Path(src)
    pub = src / "public"
    data = pub / "data"
    cats = json.loads((data / "categories.json").read_text())
    locs = json.loads((data / "locations.json").read_text())
    places = json.loads((data / "places.json").read_text())
    districts = json.loads((data / "districts.json").read_text())
    labels = json.loads((data / "labels.json").read_text())
    pin_names = set(json.loads((pub / "icons/pins/index.json").read_text()))

    cat_by = {k["key"]: k for k in cats["kinds"]}
    items = [i for i in merge_places(locs, places) if i.get("kind") in cat_by]

    tally = defaultdict(Counter)
    for it in items:
        tally[type_of(it["id"])][it["kind"]] += 1
    usual = {t: c.most_common(1)[0][0] for t, c in tally.items()}

    def pin_for(it):
        t = type_of(it["id"])
        want = PIN_ALIASES.get(t) or ("collectible-card" if t.startswith("card-") else t)
        if usual.get(t) in (None, it["kind"]) and want in pin_names:
            return want
        fb = KIND_PINS.get(it["kind"])
        return fb if fb in pin_names else None

    out_items = []
    sem_traducao = set()
    shots = set()
    for it in items:
        shot = it.get("screenshot")
        if shot:
            shot = shot.split("/")[-1]
            shots.add(shot)
        row = {"i": it["id"], "k": it["kind"], "x": round(it["x"], 2), "y": round(it["y"], 2),
               "n": it["name"]}
        opt = {"t": it.get("type"), "d": it.get("description"), "a": it.get("area"),
               "r": it.get("real_life"), "s": shot, "p": pin_for(it),
               "z": district_at(it["x"], it["y"], districts)}
        row.update({k: v for k, v in opt.items() if v})
        # flamingos de cocaína vêm misturados em "Pacotes escondidos": vão para a categoria própria
        if row["n"].startswith("Cocaine Flamingo") and "flamingo" in cat_by:
            row["k"] = "flamingo"
            row.pop("p", None)
        # tradução para português (nomes próprios ficam como estão; o original vai em "o" para a busca)
        n_pt = tr.nome(row["n"])
        if n_pt != row["n"]:
            row["o"] = row["n"]
            row["n"] = n_pt
        if row.get("t"):
            row["t"] = tr.tipo(row["t"])
        if row.get("a"):
            row["a"] = tr.area(row["a"])
        if row.get("d"):
            d_pt, ok = tr.descricao(row["d"])
            if not ok:
                sem_traducao.add(row["d"])
            row["d"] = d_pt
        out_items.append(row)
    if sem_traducao:
        print(f"AVISO: {len(sem_traducao)} descrições sem tradução (ficam em inglês). Exemplo: {next(iter(sem_traducao))[:90]}")

    counts = Counter(i["k"] for i in out_items)
    kinds = []
    for k in cats["kinds"]:
        if not counts[k["key"]]:
            continue
        pins = Counter(i.get("p") for i in out_items if i["k"] == k["key"] and i.get("p"))
        g = k["group"]
        kinds.append({"key": k["key"], "name": PT.get(k["key"], k["name"]), "en": k["name"],
                      "colour": PLACE_COLOR.get(k["key"]) if g == "Places" else GROUP_COLOR.get(g, "#70757a"),
                      "minz": PLACE_MINZ.get(k["key"], 4.0) if g == "Places" else GROUP_MINZ.get(g, 4.0),
                      "icon": k["icon"], "group": g,
                      "trackable": g != "Places", "count": counts[k["key"]],
                      "pin": pins.most_common(1)[0][0] if pins else None})

    commit = ""
    head = src / ".git" / "HEAD"
    if head.exists():
        ref = head.read_text().strip()
        commit = (src / ".git" / ref[5:]).read_text().strip() if ref.startswith("ref:") else ref
    out = {
        "source": "Open GTA 6 Map — https://github.com/fbritoferreira/gta6 (CC BY 4.0)",
        "commit": commit[:12],
        "groups": [{"key": g, "name": GROUP_PT.get(g, g)} for g in cats["groups"]
                   if any(k["group"] == g for k in kinds)],
        "kinds": kinds,
        "labels": [{"n": l["name"], "x": l["x"], "y": l["y"]} for l in labels],
        "items": out_items,
    }
    (WEB / "data").mkdir(parents=True, exist_ok=True)
    (WEB / "data/mapa.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))

    # Ícones das categorias (Lucide, ISC) como traçado SVG, para desenhar em branco no app
    icons = {}
    for k in kinds:
        f = pub / "icons" / f"{k['key']}.svg"
        if f.exists():
            body = f.read_text()
            inner = body[body.index(">", body.index("<svg")) + 1:body.rindex("</svg>")]
            icons[k["key"]] = re.sub(r"\s+", " ", inner).strip()
    (WEB / "data/icones.json").write_text(json.dumps(icons, separators=(",", ":")))
    shutil.copy2(pub / "icons/LICENSE", WEB / "data/icones-LICENSE.txt")
    # Placas de rodovia lidas do mapa impresso
    shutil.copy2(data / "routes.json", WEB / "data/rotas.json")

    # Arquivos de mídia (os tiles do mapa base são gerados por scripts/estilo/render.js)
    dst = WEB / "pins"
    dst.mkdir(exist_ok=True)
    for n in pin_names:
        shutil.copy2(pub / "icons/pins" / f"{n}.webp", dst / f"{n}.webp")
    dst = WEB / "screenshots"
    dst.mkdir(exist_ok=True)
    for s in shots:
        f = pub / "screenshots" / s
        if f.exists():
            shutil.copy2(f, dst / s)

    # Lista de tiles existentes (o mar vazio não tem arquivo): o app só pede o que existe.
    tiles = defaultdict(list)
    for f in sorted((pub / "tiles/night").glob("*/*.webp")):
        z, y, x = f.stem.split(",")
        tiles[z].append(f"{y},{x}")
    (WEB / "data/tiles.json").write_text(json.dumps(tiles, separators=(",", ":")))

    print(f"{len(out_items)} pontos, {len(kinds)} categorias, {len(shots)} screenshots")
    for k in kinds:
        print(f"  {k['count']:5d}  {k['name']}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "../sources/fbritoferreira_gta6")
