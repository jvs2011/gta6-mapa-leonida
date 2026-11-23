# Mapa Leonida: o mapa do GTA VI com cara de Google Maps, para iPhone

Abriu, já está no mapa. Leonida aparece como se estivesse no Google Maps: água turquesa clara, mata em verde-menta, relevo discreto no norte, ruas cinza e rodovias cinza-azuladas. A geografia e os nomes dos lugares vêm do mapa oficial da Rockstar. O app volta exatamente onde você parou.

- **Zoom progressivo como no Google:** de longe aparecem só as cidades e os oceanos. Ao aproximar, entram as cidades menores, os condados, os bairros, os parques e as placas das rodovias. Por último aparecem os pontos de interesse: pequenas gotas coloridas com ícone branco e o nome ao lado. O que é mais importante aparece primeiro, e o que se sobrepõe some.
- **4.680 pontos** em 44 categorias, entre colecionáveis, atividades, crimes, restaurantes, lojas, hotéis, transporte e pontos turísticos, além de 119 nomes de lugares transcritos do mapa oficial.
- **Chips de categoria** abaixo da busca, como no Google ("Colecionáveis", "Restaurantes"…). Com um chip ativo, os resultados aparecem como bolinhas desde o zoom de longe.
- **Ficha do lugar** igual à do Google: foto, descrição, bairro, lugar real que inspirou o ponto e os botões "Marcar como encontrado", "Próximo perto" e "Compartilhar".
- **Camadas:** mapa Padrão ou Escuro, mostrar ou esconder lugares e pontos do jogo, ocultar o que já foi encontrado.
- **Gestos do Google Maps:**
  - toque duplo aproxima;
  - toque duplo e arrastar dá zoom com um dedo;
  - tocar com dois dedos afasta;
  - toque longo marca um pino, que pode ser salvo como ponto seu.
- **Barra de escala** durante o zoom e **progresso** no círculo do canto da busca.
- **Funciona sem internet**, com backup do progresso em `.json`.

## Estrutura

```
web/                    o app (HTML/CSS/JS + dados + tiles). É o mesmo código no PWA e no app nativo.
  data/mapa.json        todos os pontos, já mesclados e com cores/zoom mínimo por categoria
  data/rotulos.json     nomes dos lugares do mapa oficial, em unidades do mapa
  data/rotas.json       placas das rodovias · data/icones.json ícones (Lucide)
  tiles/{padrao,escuro} mapa base estilo Google (zoom 0–5, webp), gerado pelos scripts abaixo
  fonts/                Roboto (Apache 2.0)
ios/                    projeto Xcode (SwiftUI + WKWebView) que embute a pasta web/
scripts/build_data.py   gera web/data a partir da fonte de dados
scripts/estilo/         gera o mapa base: rasters.py (relevo e mata) e render.js (tiles no Chromium);
                        rotulos_poster.py tem os nomes do mapa oficial
```

## Como instalar no iPhone (sem App Store)

### Opção A: app na Tela de Início (PWA). Não precisa de Mac.

1. Publique a pasta `web/` num endereço HTTPS. O repositório já vem com a automação `.github/workflows/pages.yml`: em *Settings → Pages → Source*, escolha **GitHub Actions** e o app sai em `https://jvs2011.github.io/gta6-mapa-leonida/`. Numa conta gratuita, o GitHub Pages só funciona com o repositório **público**. Os dados têm licença aberta, então não há problema em deixá-lo público.
2. No iPhone, abra o endereço no **Safari**, toque em **Compartilhar → Adicionar à Tela de Início**.
3. Abra pelo ícone **Leonida**. O app abre em tela cheia, direto no mapa.
4. Opcional: em *Filtros → Ajustes → Baixar mapa para usar sem internet* (cerca de 110 MB) o mapa inteiro fica no aparelho. Mesmo sem esse passo, tudo o que você já viu fica guardado no cache.

### Opção B: app nativo instalado pelo Xcode. Precisa de um Mac.

1. Abra `ios/Leonida.xcodeproj` no Xcode 15 ou mais novo.
2. Em *Signing & Capabilities*, escolha o seu **Team** (serve o Apple ID gratuito) e troque o *Bundle Identifier* `com.meuapp.leonida` por algo seu.
3. Ligue o iPhone no cabo, selecione-o como destino e clique em **Run** (▶).
4. No iPhone, ative *Ajustes → Privacidade e Segurança → Modo de Desenvolvedor*. Depois confie no certificado em *Ajustes → Geral → VPN e Gerenciamento de Dispositivo*.

Com o Apple ID **gratuito**, a instalação vale por **7 dias**. Depois disso, basta ligar o iPhone no Mac e dar Run de novo. O progresso não se perde, porque fica salvo no aparelho (UserDefaults). Com a conta paga de desenvolvedor (US$ 99/ano), a instalação vale por 1 ano.

O app nativo leva o mapa inteiro dentro dele (cerca de 140 MB) e funciona offline desde a primeira abertura.

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

Para regerar o mapa base (só é preciso quando a fonte mudar o litoral, as ruas ou os prédios), use Node e Playwright:

```bash
python3 scripts/estilo/rasters.py ../fonte-gta6/public/data/land.json /tmp/rasters
node scripts/estilo/render.js ../fonte-gta6/public/data /tmp/rasters web padrao,escuro
```

Depois de qualquer atualização, envie para o GitHub (o Pages publica sozinho) ou dê Run de novo no Xcode. No PWA, aumente o `VERSION` em `web/sw.js` quando mudar `app.js` ou `style.css`.

## Fontes pesquisadas

| Fonte | Usada? | Observação |
|---|---|---|
| Mapa oficial da Rockstar (download de 19/11/2026, página do GTA VI) | ✅ Nomes e referência | Os 119 nomes de lugares (condados, cidades, bairros, ilhas, águas, pontos de referência) foram transcritos dele, nas mesmas posições. O contorno e as ruas da fonte principal também foram traçados a partir dele. A imagem em si não faz parte do app. |
| [Open GTA 6 Map](https://github.com/fbritoferreira/gta6) (fbritoferreira) | ✅ **Fonte principal** | CC BY 4.0. Traz pontos, lugares, fotos, tiles dia/noite e pins, com atualização frequente. |
| [gta6-leonida-map-data](https://github.com/duanhesen/gta6-leonida-map-data) (GTA6Maps) | Conferida | CC BY 4.0, 798 marcadores (marcos e negócios). Já estão cobertos pela fonte principal. |
| [gta6map.github.io](https://github.com/gta6map/gta6map.github.io) | Conferida | Domínio público, 731 marcos de antes do lançamento. Já estão cobertos. |
| GTADB / State of Leonida / leonidawaypoint | Não | São projetos de mapeamento da comunidade. Os dados da GTADB já chegam pela fonte principal. |
| Game8, IGN, MapGenie, gta6maps.io, ExploreGTA6, etc. | **Não** | Bancos de dados proprietários, sem licença para copiar. Servem para conferir à mão. |

**Lacuna conhecida:** os **Flamingos de cocaína** (125 no jogo, segundo a Game8) ainda não estão em nenhuma base aberta. Quando a fonte principal adicionar, basta rodar o `build_data.py` de novo. Enquanto isso, use os pontos pessoais (toque e segure) para marcá-los.

## Créditos e licença

- Dados, mapa base, pins e fotos: **Open GTA 6 Map**, de fbritoferreira e colaboradores, sob [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). O crédito aparece no canto do mapa e na aba Ajustes.
- [Leaflet](https://leafletjs.com) 1.9.4: licença BSD-2 (`web/vendor/leaflet/LICENSE`).
- Ícones [Lucide](https://lucide.dev): licença ISC (`web/data/icones-LICENSE.txt`). Fonte Roboto: licença Apache 2.0 (`web/fonts/LICENSE-Roboto.txt`).
- O visual imita a linguagem do Google Maps só para uso pessoal. Não há nenhum vínculo com o Google, e nenhuma marca ou logo do Google é usada.
- Este é um app de fã, para uso pessoal, sem vínculo com a Rockstar Games ou a Take-Two. GTA, Grand Theft Auto e Leonida são marcas dos seus donos.
