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

## ⚠️ Rischio da verificare prima di attivare il fetch live

Coda è stato ridenominato **Superhuman Docs**. Ho estratto i dati del doc
tramite il connector MCP "Superhuman Docs", che usa un proprio schema di ID
interno (es. `superhuman://docs/cxRCPRNRPa/...`). **Non è garantito che
questo ID coincida con il `docId` che serve alla REST API classica di Coda**
(`api.coda.io`), quella su cui è basata `get-portfolio.js` e presumibilmente
anche l'integrazione già esistente nel dataroom.

Prima di configurare le env var in produzione:
1. Apri il doc su **coda.io** (non su docs.superhuman.com) nel browser.
2. L'URL avrà una forma tipo `https://coda.io/d/_d{DOC_ID}/...` → quello è
   `CODA_DOC_ID` (con o senza underscore iniziale, verifica dalla barra
   indirizzi o dal "Copy doc link").
3. Nel doc, apri la tabella sorgente **"MDB - IRM"** (quella sincronizzata,
   non la view "Schede IRM") e recupera il suo Table ID dall'URL o da
   Settings → API.
4. Genera un token da coda.io/account (Settings → API Tokens).
5. Imposta le tre env var su Netlify (Site settings → Environment variables),
   scope **Functions** (attenzione al gotcha già noto: `envVarIsSecret: true`
   esclude la var dagli scope `functions`/`runtime` — non marcarle come secret
   se devono essere lette dalla function).
6. Fai un redeploy e controlla `data-note` in fondo alla toolbar del
   portfolio: dirà "Dati aggiornati in tempo reale da Coda" se il collegamento
   funziona, altrimenti resta sul seed.

Se scopri che gli ID Superhuman e gli ID Coda classici in realtà coincidono,
questo intero paragrafo diventa superfluo — ma non l'ho potuto verificare da
qui, quindi meglio controllare prima di fidarsi del fetch live in produzione.

## ⚠️ Altro rischio: URL dei loghi

I loghi nel seed puntano a `codahosted.io/docs/.../blobs/...` (URL degli
allegati Coda). Sono gli URL diretti che l'API restituisce oggi, ma gli
allegati Coda possono in alcuni casi essere protetti o avere scadenza legata
alla sessione/doc. Il frontend ha un fallback automatico (iniziali della
startup su sfondo colorato) se un logo non carica — ma se noti loghi rotti in
massa, vale la pena scaricare i PNG e servirli da `public/assets/logos/`
invece che da Coda.

## TODO prima del deploy

- [ ] Sostituire `#TODO_SURVEY_URL` in `index.html` (2 occorrenze: hero e CTA
      banner) con il link reale della survey Investor Scoring (Tally/Coda/
      Typeform — a te la scelta).
- [ ] Decidere se/come configurare il fetch live (vedi sopra) o tenere il
      seed statico e aggiornarlo a mano quando cambia il portfolio.
- [ ] Verificare i loghi in produzione (vedi rischio sopra).

## Deploy

Repo statico, nessuna build necessaria.

```bash
# Netlify CLI, dalla root del repo
netlify deploy --prod
```

Oppure collega il repo su Netlify (team `6a39498c0ac7e42b7c151f46`), publish
directory `public`, functions directory `netlify/functions` — già configurato
in `netlify.toml`, quindi basta "Deploy site" senza toccare nulla.
