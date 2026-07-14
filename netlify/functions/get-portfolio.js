// get-portfolio.js
//
// Serve la lista startup della sezione "Schede IRM" del doc Coda "Imment | IRM".
//
// Strategia: prova un fetch live alla Coda REST API (v1). Se CODA_API_TOKEN,
// CODA_DOC_ID o CODA_TABLE_ID non sono configurati, o la chiamata fallisce
// (ID sbagliati, token scaduto, rate limit...), ricade sul seed statico
// bundlato in data/portfolio-seed.json, così la pagina non si rompe mai.
//
// ID e colonne VERIFICATI (2026-07-14) contro il doc reale via connector
// Superhuman Docs:
//   CODA_DOC_ID   = l0LQphn-KT           (doc "Imment - Clienti")
//   CODA_TABLE_ID = grid-jvjtv77lW1      (tabella "MDB - IRM", 30 righe)
// Colonne usate qui sotto allineate ai nomi reali della tabella:
//   Company, Url Image (logo), Sito web, Pitch Deck [URL], Campagna SFP,
//   Importo Round, Landing Page, LOI.
// Resta da confermare solo che l'endpoint REST classico https://coda.io/apis/v1
// risponda con questi ID usando un CODA_API_TOKEN valido (l'ID doc coincide
// con quello degli URL dei loghi codahosted, quindi è molto probabile).

const seed = require('../../data/portfolio-seed.json');

const CODA_API_BASE = 'https://coda.io/apis/v1';

// Estrae un testo leggibile da un valore di cella Coda, che può essere
// una stringa semplice, un riferimento a riga lookup ({name: "..."}),
// o un link ({url: "...", name: "..."}).
function extractText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    if ('name' in value && value.name) return value.name;
    if ('url' in value && value.url) return value.url;
  }
  return '';
}

function extractUrl(value) {
  if (value === null || value === undefined) return '';
  // valueFormat=simple restituisce quasi sempre stringhe; gli oggetti
  // (urlref / imageurlref) sono gestiti come rete di sicurezza.
  if (typeof value === 'object') {
    if ('url' in value && value.url) return String(value.url).trim();
    return '';
  }
  // NON filtriamo per prefisso "http": alcuni link (es. "www.awentia.com")
  // sono salvati senza protocollo. Il frontend normalizza col https://.
  if (typeof value === 'string') return value.trim();
  return '';
}

async function fetchLiveFromCoda() {
  const token = process.env.CODA_API_TOKEN;
  const docId = process.env.CODA_DOC_ID;
  const tableId = process.env.CODA_TABLE_ID;

  if (!token || !docId || !tableId) {
    throw new Error('CODA_API_TOKEN / CODA_DOC_ID / CODA_TABLE_ID non configurati');
  }

  const url = `${CODA_API_BASE}/docs/${docId}/tables/${tableId}/rows?useColumnNames=true&valueFormat=simple&limit=100`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Coda API ha risposto ${res.status}`);
  }

  const data = await res.json();

  return (data.items || []).map((row) => {
    const v = row.values || {};
    const roundRaw = extractText(v['Campagna SFP']); // es. "1° Round - In corso"
    const [roundNumber, roundStatus] = roundRaw.includes(' - ')
      ? roundRaw.split(' - ').map((s) => s.trim())
      : [roundRaw, ''];

    return {
      name: extractText(v['Company']),
      // 'Url Image' è la colonna testo con l'URL codahosted diretto;
      // fallback su 'Logo' (colonna immagine) se non disponibile.
      logo: extractUrl(v['Url Image']) || extractUrl(v['Logo']),
      website: extractUrl(v['Sito web']),
      pitchDeck: extractUrl(v['Pitch Deck [URL]']),
      roundNumber: roundNumber.replace(' Round', ''),
      roundStatus,
      importo: extractText(v['Importo Round']),
      landingPage: extractUrl(v['Landing Page']),
      loi: extractUrl(v['LOI']),
    };
  });
}

exports.handler = async function handler() {
  try {
    const companies = await fetchLiveFromCoda();
    if (!companies.length) throw new Error('Nessuna riga restituita da Coda');
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // 5 minuti
      },
      body: JSON.stringify({ source: 'live', companies }),
    };
  } catch (err) {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
      },
      body: JSON.stringify({
        source: 'seed',
        error: err.message,
        companies: seed,
      }),
    };
  }
};
