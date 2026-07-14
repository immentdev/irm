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

## URL dei loghi — verificato OK

I loghi puntano a `codahosted.io/docs/.../blobs/...` (URL degli allegati Coda).
Il timore che potessero essere protetti/scaduti **non si è verificato**: in
produzione caricano correttamente (`HTTP 200`, `image/png`, accesso pubblico).
Il frontend mantiene comunque un fallback automatico (iniziali della startup su
sfondo colorato) se un singolo logo non carica. Solo se in futuro noti loghi
rotti in massa, valuta di scaricare i PNG e servirli da
`public/assets/logos/` invece che da Coda.

## Stato / TODO

- [x] Fetch live da Coda configurato e verificato in produzione (vedi sopra).
- [x] Loghi verificati in produzione: caricano correttamente.
- [ ] **CTA survey**: attualmente **nascoste** (attributo `hidden` su
      `#survey-cta-hero` nell'hero e sull'intera sezione CTA banner in
      `index.html`). Quando il form Investor Scoring è pronto: sostituire
      `#TODO_SURVEY_URL` con il link reale (Tally/Coda/Typeform) e rimuovere
      gli attributi `hidden` per riattivarle.

## Deploy

Repo statico, nessuna build necessaria.

```bash
# Netlify CLI, dalla root del repo
netlify deploy --prod
```

Oppure collega il repo su Netlify (team `6a39498c0ac7e42b7c151f46`), publish
directory `public`, functions directory `netlify/functions` — già configurato
in `netlify.toml`, quindi basta "Deploy site" senza toccare nulla.
