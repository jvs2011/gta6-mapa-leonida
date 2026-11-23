#!/usr/bin/env python3
"""Nomes do mapa impresso de Leonida (Rockstar, 19/11/2026), transcritos à mão.

Posições em px da imagem do pôster (1461×2000) e convertidas para unidades do mapa
com o encaixe calculado por align.py (escala e deslocamento em x/y).
Classes:
  county  nome de condado (grande, branco, condensado)
  city    cidade grande (branco, negrito, espaçado)
  town    cidade/bairro (branco, negrito, caixa mista)
  area    bairro/ilha/parque (creme, condensado, maiúsculas)
  water   corpos d'água (itálico, azul)
  poi     ponto de interesse pequeno (lilás claro)
Uso: python3 rotulos_poster.py <web/data/rotulos.json>
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "traducao"))
import traduzir as tr  # noqa: E402

FIT = {"sx": 3.046, "sy": 3.028, "ox": -485.8, "oy": -473.8}

L = [
    # condados
    ("LUMMOX COUNTY", "county", 727, 403), ("KELLY COUNTY", "county", 619, 792),
    ("LEONARD COUNTY", "county", 1021, 718), ("VICE-DALE COUNTY", "county", 1055, 1148),
    ("MARIANA COUNTY", "county", 601, 1462),
    # cidades grandes
    ("PORT\nGELLHORN", "city", 445, 715), ("VICE CITY", "city", 978, 1040), ("VICE BEACH", "city", 1245, 978),
    ("HAMLET", "city", 818, 1372), ("VCIA", "city", 826, 1140),
    # cidades / bairros
    ("Bonanza", "town", 703, 283), ("Grayson", "town", 555, 436), ("Millport", "town", 963, 459),
    ("Draper Island", "town", 359, 599), ("Ambrosia", "town", 811, 713), ("Belville", "town", 961, 791),
    ("Waning\nSands", "town", 1080, 646), ("Capri", "town", 420, 1055), ("Grassrivers", "town", 658, 1327),
    ("Watson\nBay", "town", 630, 1407), ("Key Lento", "town", 830, 1666), ("Southwind", "town", 478, 1710),
    ("Mile Zero\nAir Station", "town", 403, 1740),
    # áreas
    ("HYDE ISLAND", "area", 839, 229), ("SAINT ATTAWAY\nISLANDS", "area", 772, 262),
    ("FRAMPTON\nISLANDS", "area", 940, 291), ("FEATHERSTONE ISLANDS", "area", 555, 313), ("MOREAU", "area", 754, 331),
    ("EAST LUMMOX\nCOUNTY", "area", 931, 354), ("MOUNT KALAGA NATIONAL PARK", "area", 727, 452),
    ("SOUTH WEST\nLUMMOX COUNTY", "area", 564, 479), ("NORTH\nLEONARD COUNTY", "area", 874, 503),
    ("LITTLE HARDIN\nISLAND", "area", 1132, 497), ("ZEPHYR ISLANDS", "area", 364, 509),
    ("RICHARD BAREBONE\nSTATE PARK", "area", 1045, 530), ("NORTH\nKELLY COUNTY", "area", 718, 559),
    ("MANIFEST\nCANYON", "area", 569, 589), ("VINEWOOD BEACH", "area", 1154, 669), ("FROGSWATER", "area", 647, 687),
    ("WILD HOG\nPOINT", "area", 359, 778), ("SANDBARS", "area", 208, 810), ("LEAF LINKS", "area", 1132, 835),
    ("EMERALD\nSPRINGS", "area", 672, 840), ("SOUTH\nLEONARD COUNTY", "area", 887, 866),
    ("DECOR\nDISTRICT", "area", 1062, 866), ("WASHINGTON\nISLAND", "area", 1213, 866),
    ("CRUDE ISLANDS", "area", 275, 874), ("RENMARCH ISLE", "area", 1167, 885),
    ("WASHINGTON BEACH", "area", 1263, 889), ("GELLHORN", "area", 514, 894), ("STOCKYARD", "area", 1059, 899),
    ("OLDBY\nISLAND", "area", 1222, 911), ("BUCKSKIN\nSWAMP", "area", 701, 945), ("LA PERLE", "area", 993, 930),
    ("RIALTO\nISLANDS", "area", 1121, 934), ("CASANOVA\nISLAND", "area", 1163, 946), ("BAYSIDE", "area", 1050, 945),
    ("CATALAN\nISLAND", "area", 1093, 963), ("VESPUCCI\nISLAND", "area", 1132, 973), ("ROCKRIDGE", "area", 953, 996),
    ("CROSSTOWN", "area", 1020, 993), ("BALSERO", "area", 857, 999), ("SOUTH\nKELLY COUNTY", "area", 576, 1010),
    ("STARFISH\nISLAND", "area", 1148, 1028), ("OCEAN BEACH", "area", 1259, 1045), ("LITTLE CUBA", "area", 965, 1066),
    ("DOWNTOWN", "area", 1026, 1069), ("WAXMAN ISLAND", "area", 1127, 1066),
    ("WEST\nVICE-DALE COUNTY", "area", 651, 1072), ("SALTON", "area", 908, 1081), ("BELPOINT", "area", 256, 1098),
    ("PORT VICE CITY", "area", 1178, 1112), ("BREAKWATER QUARRY", "area", 632, 1166), ("TEQUESTA", "area", 985, 1190),
    ("TEQUESTA\nRETREAT", "area", 1065, 1185), ("DALTON ISLAND", "area", 1264, 1190), ("BIG PINE", "area", 575, 1245),
    ("GLORIANA KEY", "area", 1165, 1251), ("BLUEGRASS", "area", 819, 1266), ("PEACOCK BAY", "area", 971, 1279),
    ("BOBCAT\nKEY", "area", 480, 1285), ("CATALAN KEY", "area", 1062, 1285), ("SOUTHSIDE", "area", 912, 1300),
    ("SOUTH\nVICE-DALE", "area", 903, 1356), ("PELICAN\nVALLEY", "area", 762, 1466), ("CORSAIR\nKEY", "area", 987, 1477),
    ("SHOELESS\nKEYS", "area", 884, 1518), ("RIQUEZAS KEYS", "area", 319, 1661), ("GOOSE KEY", "area", 407, 1694),
    ("PERMIT KEYS", "area", 532, 1689), ("MAROON\nKEY", "area", 657, 1719), ("ABISMO KEY", "area", 657, 1786),
    # água
    ("Atlantic Ocean", "ocean", 1250, 637), ("Gulf of Leonida", "ocean", 215, 1277),
    ("Okchiloha Bay", "water", 637, 258), ("Partridge Bay", "water", 922, 233), ("Moreau River", "water", 820, 291),
    ("Sai Malo Bay", "water", 484, 428), ("Millport Basin", "water", 1081, 453), ("Draper Bay", "water", 370, 688),
    ("Lake\nLeonida", "water", 884, 627), ("Borrachero Sound", "water", 330, 820), ("Capri Sound", "water", 317, 1013),
    ("Nehrling River", "water", 556, 1108), ("Catalan Bay", "water", 1187, 1152), ("Bobout Bight", "water", 404, 1186),
    ("Leonida Bay", "water", 549, 1522), ("Peregrine Bay", "water", 935, 1473), ("Leonida Straits", "water", 436, 1876),
    # pontos de interesse (pequenos)
    ("MacAllister\nGold Mine", "poi", 690, 336), ("Tallaloka\nLakeside Resort", "poi", 880, 365),
    ("Mount Hailes\nCountry Club", "poi", 970, 547), ("Ambrosia\nRaceway Park", "poi", 772, 610),
    ("Gellhorn\nRaceway", "poi", 437, 873), ("Leonida\nState Prison", "poi", 590, 920),
    ("Sahara Network\nData Center", "poi", 644, 1243), ("Henry J Edwards\nAirport", "poi", 531, 1316),
    ("Hamlet Correctional\nInstitution", "poi", 807, 1346), ("Vice City\nOceanarium", "poi", 1078, 1227),
    ("Vice City International Airport", "poi", 826, 1157),
]


SMALL = {"of", "de", "da", "do"}


def title(s):
    """'SOUTH WEST\nLUMMOX COUNTY' -> 'South West Lummox County' (o Google usa caixa normal)."""
    s = " ".join(s.split())
    if s.isupper():
        out = []
        for i, w in enumerate(s.lower().split(" ")):
            w = "-".join(p[:1].upper() + p[1:] for p in w.split("-"))
            out.append(w.lower() if i and w.lower() in SMALL else w)
        s = " ".join(out)
    return s


# classes do pôster -> hierarquia de rótulos estilo Google Maps
CLASS = {"county": "region", "city": "city", "town": "town", "area": "hood", "water": "water", "ocean": "ocean",
         "poi": "poi"}


def main(out):
    rows = []
    for name, cls, px, py in L:
        if name == "VCIA":
            continue  # vira o ponto do aeroporto (poi)
        x = (px - FIT["ox"]) / FIT["sx"]
        y = (py - FIT["oy"]) / FIT["sy"]
        c = CLASS[cls]
        n = title(name)
        if c == "hood" and ("Park" in n or "Canyon" in n or "Swamp" in n):
            c = "park"
        pt = tr.lugar(n, c)
        row = {"n": pt, "c": c, "x": round(x, 1), "y": round(y, 1)}
        if pt != n:
            row["o"] = n
        if c == "poi":
            row["i"] = "airport" if "Airport" in n else ("prison" if "Prison" in n or "Correctional" in n else "landmark")
        rows.append(row)
    json.dump(rows, open(out, "w"), ensure_ascii=False, separators=(",", ":"))
    print(len(rows), "rótulos")


if __name__ == "__main__":
    main(sys.argv[1])
