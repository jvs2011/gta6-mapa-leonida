# Mapa Leonida — app pessoal de mapa do GTA VI para iPhone

Abriu, já está no mapa: sem tela de boas-vindas nem menu inicial. O app volta exatamente onde você parou, com o mesmo zoom, os mesmos filtros e o mesmo modo dia ou noite.

- **4.680 pontos** em 44 categorias, entre colecionáveis, atividades, crimes e lugares, com o nome de cada categoria em português.
- **610 fotos** de onde fica cada item, além de descrições e do lugar real em Miami/Flórida em que cada ponto se inspira.
- **Mapa base de dia e de noite**, traçado a partir do mapa oficial impresso de Leonida que a Rockstar lançou em 19/11/2026.
- **Progresso:** você marca o que já encontrou, vê a barra por categoria, pode ocultar o que já achou e tem o botão "Próximo perto".
- **Busca** por nome, tipo, região ou lugar real. Por exemplo, "ritz" acha os hotéis inspirados no Ritz-Carlton.
- **Pontos pessoais:** toque e segure no mapa para criar o seu.
- **Funciona sem internet.**
- **Backup:** exporte e importe o progresso em `.json`.

## Estrutura

```
web/                  o app (HTML/CSS/JS + dados + tiles). É o mesmo código no PWA e no app nativo.
  data/mapa.json      todos os pontos, já mesclados e traduzidos
  data/tiles.json     lista dos tiles que existem
  tiles/{night,day}/  mapa base (zoom 0–5, webp)
  pins/ screenshots/  ícones e fotos
ios/                  projeto Xcode (SwiftUI + WKWebView) que embute a pasta web/
scripts/build_data.py gera web/data a partir da fonte de dados
```

## Como instalar no iPhone (sem App Store)

### Opção A: app na Tela de Início (PWA). Não precisa de Mac.

1. Publique a pasta `web/` num endereço HTTPS. O repositório já vem com a automação `.github/workflows/pages.yml`: em *Settings → Pages → Source*, escolha **GitHub Actions** e o app sai em `https://jvs2011.github.io/gta6-mapa-leonida/`. Numa conta gratuita, o GitHub Pages só funciona com o repositório **público**. Os dados têm licença aberta, então não há problema em deixá-lo público.
2. No iPhone, abra o endereço no **Safari**, toque em **Compartilhar → Adicionar à Tela de Início**.
3. Abra pelo ícone **Leonida**. O app abre em tela cheia, direto no mapa.
4. Opcional: em *Filtros → Ajustes → Baixar mapa para usar sem internet* (cerca de 130 MB) o mapa inteiro fica no aparelho. Mesmo sem esse passo, tudo o que você já viu fica guardado no cache.

### Opção B: app nativo instalado pelo Xcode. Precisa de um Mac.

1. Abra `ios/Leonida.xcodeproj` no Xcode 15 ou mais novo.
2. Em *Signing & Capabilities*, escolha o seu **Team** (serve o Apple ID gratuito) e troque o *Bundle Identifier* `com.meuapp.leonida` por algo seu.
3. Ligue o iPhone no cabo, selecione-o como destino e clique em **Run** (▶).
4. No iPhone, ative *Ajustes → Privacidade e Segurança → Modo de Desenvolvedor*. Depois confie no certificado em *Ajustes → Geral → VPN e Gerenciamento de Dispositivo*.

Com o Apple ID **gratuito**, a instalação vale por **7 dias**. Depois disso, basta ligar o iPhone no Mac e dar Run de novo. O progresso não se perde, porque fica salvo no aparelho (UserDefaults). Com a conta paga de desenvolvedor (US$ 99/ano), a instalação vale por 1 ano.

O app nativo leva o mapa inteiro dentro dele (cerca de 265 MB) e funciona offline desde a primeira abertura.

### Testar no computador

```bash
cd web && python3 -m http.server 8000
```
Abra http://localhost:8000.

## Atualizar os dados (novos pontos descobertos pela comunidade)

```bash
git clone https://github.com/fbritoferreira/gta6.git ../fonte-gta6   # ou: cd ../fonte-gta6 && git pull
python3 scripts/build_data.py ../fonte-gta6
```
Depois, republique a pasta `web/` (PWA) ou dê Run de novo no Xcode (app nativo). No PWA, aumente o `VERSION` em `web/sw.js` quando mudar `app.js` ou `style.css`.

## Fontes pesquisadas

| Fonte | Usada? | Observação |
|---|---|---|
| Mapa oficial da Rockstar (download de 19/11/2026, página do GTA VI) | Indiretamente | O contorno da terra, as estradas e as rodovias do mapa base foram traçados a partir dele pelo projeto abaixo. O arquivo oficial em si é só uma imagem para imprimir, sem pontos marcados. |
| [Open GTA 6 Map](https://github.com/fbritoferreira/gta6) (fbritoferreira) | ✅ **Fonte principal** | CC BY 4.0. Traz pontos, lugares, fotos, tiles dia/noite e pins, com atualização frequente. |
| [gta6-leonida-map-data](https://github.com/duanhesen/gta6-leonida-map-data) (GTA6Maps) | Conferida | CC BY 4.0, 798 marcadores (marcos e negócios). Já estão cobertos pela fonte principal. |
| [gta6map.github.io](https://github.com/gta6map/gta6map.github.io) | Conferida | Domínio público, 731 marcos de antes do lançamento. Já estão cobertos. |
| GTADB / State of Leonida / leonidawaypoint | Não | São projetos de mapeamento da comunidade. Os dados da GTADB já chegam pela fonte principal. |
| Game8, IGN, MapGenie, gta6maps.io, ExploreGTA6, etc. | **Não** | Bancos de dados proprietários, sem licença para copiar. Servem para conferir à mão. |

**Lacuna conhecida:** os **Flamingos de cocaína** (125 no jogo, segundo a Game8) ainda não estão em nenhuma base aberta. Quando a fonte principal adicionar, basta rodar o `build_data.py` de novo. Enquanto isso, use os pontos pessoais (toque e segure) para marcá-los.

## Créditos e licença

- Dados, mapa base, pins e fotos: **Open GTA 6 Map**, de fbritoferreira e colaboradores, sob [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). O crédito aparece no canto do mapa e na aba Ajustes.
- [Leaflet](https://leafletjs.com) 1.9.4: licença BSD-2 (`web/vendor/leaflet/LICENSE`).
- Este é um app de fã, para uso pessoal, sem vínculo com a Rockstar Games ou a Take-Two. GTA, Grand Theft Auto e Leonida são marcas dos seus donos.
