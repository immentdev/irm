// get-portfolio.js
//
// Serve la lista startup della sezione "Schede IRM" del doc Coda "Imment | IRM".
//
// Strategia: prova un fetch live alla Coda REST API (v1). Se CODA_API_TOKEN,
// CODA_DOC_ID o CODA_TABLE_ID non sono configurati, o la chiamata fallisce
// (ID sbagliati, token scaduto, rate limit...), ricade sul seed statico
// bundlato in data/portfolio-seed.json, così la pagina non si rompe mai.
//
// ATTENZIONE (da verificare prima di considerare "live" la sezione):
// Coda è stato ridenominato "Superhuman Docs" e il doc IRM oggi vive lì.
// Non è confermato che l'endpoint classico https://coda.io/apis/v1 risponda
// ancora con l'ID doc/tabella così come recuperati dall'MCP Superhuman Docs
// (che usa un proprio schema di ID interno, non necessariamente identico
// a quello dell'API REST classica di Coda). Vedi README.md per i dettagli
// su come reperire gli ID corretti direttamente dall'URL del doc su Coda.

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
  if (typeof value === 'object' && 'url' in value) return value.url || '';
  if (typeof value === 'string' && value.startsWith('http')) return value;
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
      logo: extractUrl(v['Logo']),
      website: extractUrl(v['Sito web']),
      pitchDeck: extractUrl(v['Pitch deck URL']),
      roundNumber: roundNumber.replace(' Round', ''),
      roundStatus,
      importo: extractText(v['Importo round']),
      landingPage: extractUrl(v['LP']),
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
