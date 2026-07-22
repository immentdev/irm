# Imment IRM Landing

Landing page "Investor Relation Management" — community Smart Investor di Imment.
Rifacimento brandizzato del doc Coda `Imment | IRM`, con griglia "Schede IRM"
(portfolio startup) collegata dinamicamente all'origine dati.

Stack: HTML/CSS/JS statico + 1 Netlify Function come proxy verso Coda API
(il token non deve mai finire nel client).

## Struttura

```
public/                  → sito statico (publish dir)
  index.html
  css/style.css
  js/main.js
  assets/                → loghi Imment (SVG ufficiali)
netlify/functions/
  get-portfolio.js       → fetch live da Coda, fallback su seed
data/
  portfolio-seed.json    → snapshot delle 30 startup, sempre disponibile
netlify.toml
```

## Come funziona il dato del portfolio

1. Il browser chiama `/api/portfolio` (redirect verso la function).
2. La function prova un fetch live a `https://coda.io/apis/v1/docs/{doc}/tables/{table}/rows`.
3. Se `CODA_API_TOKEN` / `CODA_DOC_ID` / `CODA_TABLE_ID` non sono settati, o la
   chiamata fallisce per qualsiasi motivo, risponde comunque 200 usando
   `data/portfolio-seed.json` (i 30 record che ho estratto oggi dal doc).

Quindi il sito **funziona da subito**, anche senza aver configurato nulla —
mostrerà i dati statici finché non attivi il fetch live.

## ✅ Fetch live: ATTIVO e verificato (2026-07-14)

Il collegamento live a Coda è stato configurato e verificato in produzione su
`https://startup-irm.netlify.app/api/portfolio` → risponde `"source": "live"`
con 30 aziende. I valori confermati contro il doc reale sono:

| Env var | Valore | Note |
|---|---|---|
| `CODA_DOC_ID` | `l0LQphn-KT` | doc "Imment - Clienti" (coincide con l'ID negli URL dei loghi codahosted) |
| `CODA_TABLE_ID` | `grid-jvjtv77lW1` | tabella sorgente **"MDB - IRM"**, 30 righe |
| `CODA_API_TOKEN` | *(segreto)* | generato da coda.io → Account Settings → API Settings |

Il timore iniziale (Coda ridenominato **Superhuman Docs**, ID interni MCP
`superhuman://...` potenzialmente diversi da quelli della REST classica
`api.coda.io`) si è rivelato infondato: il `docId` classico coincide con
quello usato dal connector, e l'endpoint `https://coda.io/apis/v1` risponde
correttamente con questi ID.

Mapping colonne (nomi reali della tabella, usati in `get-portfolio.js`):
`Company`, `Url Image` (→ logo), `Sito web`, `Pitch Deck [URL]`,
`Campagna SFP` (→ N° round + stato), `Importo Round`, `Landing Page`, `LOI`.

### Se serve rigenerare/reimpostare le env var

1. Genera un token da coda.io → Account Settings → **API Settings**.
2. Imposta le tre env var su Netlify (Site configuration → Environment
   variables). **Gotcha**: NON marcarle come *Secret* — `envVarIsSecret: true`
   le esclude dagli scope `functions`/`runtime` e la function non le legge.
3. Redeploy (le function leggono le env var solo al deploy).
4. Verifica `data-note` in fondo alla toolbar ("Dati aggiornati in tempo reale
   da Coda") o il campo `source` in `/api/portfolio`.

## Loghi startup — serviti in locale da Figma

I loghi ufficiali sono esportati dalla pagina Figma **"Loghi IRM_no ellisse"**
(`Grafiche imment`, node `191-2`) in PNG @2x e serviti da
`public/assets/logos/` — più nitidi e consistenti degli allegati Coda.

La catena di fallback in `main.js` è: **logo locale Figma → logo Coda →
iniziali della startup**. La mappa `LOGO_FILES` associa il nome società
normalizzato (minuscolo, senza caratteri speciali, senza `srl` finale) al file.

Stato attuale: **tutte e 30 le startup** hanno il logo locale.

**The JobGame** è l'unico SVG (`the-jobgame.svg`, fornito a parte perché in
Figma è testo dentro un'ellisse, non un'immagine). ⚠️ L'originale aveva tutti i
tracciati `fill: #fff` — pensato per fondi scuri, sarebbe stato invisibile sulla
card bianca. È stato **ricolorato in `#0E2D54`** (blu scuro del brand). Se in
futuro serve la versione bianca per un fondo scuro, va tenuto un file separato.

Attenzione ai nomi non coincidenti: `Logo MarketRock` → **DBN Communication**,
`Logo Coccola` → **Suitefood**, `image001` → **Citiculture**,
`hy_fulllogo_light` → **Hodamy.com**, `logo_BLACK_PNG_transparent` →
**Linky Innovation**, `Group 6` (goccia) → **Idrawater**.

**Per aggiungere una startup**: esporta il logo da Figma, salvalo in
`public/assets/logos/` e aggiungi la voce in `LOGO_FILES`.

## Stato / TODO

- [x] Fetch live da Coda configurato e verificato in produzione (vedi sopra).
- [x] Loghi verificati in produzione: caricano correttamente.
- [x] **CTA survey attive**: collegate al form Tally "Investor Scoring"
      (`https://tally.so/r/mVzVva`), sia nell'hero (`#survey-cta-hero`) sia
      nel banner (`#survey-cta-banner`). Si aprono in una nuova scheda.
- [ ] **PDF pagina di ringraziamento**: nel form Tally il testo "Scarica il
      PDF Qui" è solo grassetto, senza link. Serve l'URL del PDF.

## Deploy

Repo statico, nessuna build necessaria.

```bash
# Netlify CLI, dalla root del repo
netlify deploy --prod
```

Oppure collega il repo su Netlify (team `6a39498c0ac7e42b7c151f46`), publish
directory `public`, functions directory `netlify/functions` — già configurato
in `netlify.toml`, quindi basta "Deploy site" senza toccare nulla.
