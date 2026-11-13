// get-portfolio.js
//
// Serve la lista startup per la griglia portfolio della landing IRM, leggendo
// dalla tabella master "MDB - IRM" (doc "Imment Clienti" > pagina "Startup").
//
// Strategia: prova un fetch live alla Coda REST API (v1). Se CODA_API_TOKEN,
// CODA_DOC_ID o CODA_TABLE_ID non sono configurati, o la chiamata fallisce
// (ID sbagliati, token scaduto, rate limit...), ricade sul seed statico
// bundlato in data/portfolio-seed.json, così la pagina non si rompe mai.
//
// ID confermati (21/07) della tabella MASTER — da usare in CODA_DOC_ID e
// CODA_TABLE_ID su Netlify, non quelli di un'eventuale vista sincronizzata
// in un altro doc (quella può avere un ritardo di sync):
//   CODA_DOC_ID   = l0LQphn-KT
//   CODA_TABLE_ID = grid-jvjtv77lW1
// I nomi colonna sotto sono allineati allo schema reale di questa tabella.

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

    // Nomi colonna allineati allo schema reale della tabella master "MDB - IRM"
    // (doc "Imment Clienti" > pagina "Startup"), verificato il 21/07.
    return {
      name: extractText(v['Company']),
      logo: extractUrl(v['Logo']),
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

// Override loghi: quando abbiamo un logo locale brandizzato (esportato da Figma),
// preferiamo quello all'immagine grezza di Coda, sia in modalità live che seed.
// Chiave = name della startup, valore = path locale.
const LOCAL_LOGOS = {
  '12 Venture Srl': '/assets/logos/12venture.png',
  'Working Mom Srl': '/assets/logos/working-mom.png',
  'Awentia Srl': '/assets/logos/awentia.png',
  'Citiculture Srl': '/assets/logos/citiculture.png',
  'Mokapen Srl': '/assets/logos/mokapen.png',
  'Farmacie Mypharma Srl': '/assets/logos/farmacie-mypharma.png',
  'Amagistech Srl': '/assets/logos/amagistech.png',
  'Genuiny Blockmail Srl': '/assets/logos/genuiny-blockmail.png',
  'Cementum Srl': '/assets/logos/cementum.png',
  'DBN Communication Srl': '/assets/logos/dbn-communication.png',
  'Hodamy.com Srl': '/assets/logos/hodamy.png',
  'Suitefood Srl': '/assets/logos/suitefood.png',
  'Linky Innovation Srl': '/assets/logos/linky-innovation.png',
  'Dokimazo Srl': '/assets/logos/dokimazo.png',
  'Ris8 Guru Srl': '/assets/logos/ris8-guru.png',
  'Nutrinsect Srl': '/assets/logos/nutrinsect.png',
  'The JobGame Srl': '/assets/logos/the-jobgame.png',
  'Digiduu Srl': '/assets/logos/digiduu.png',
  'Idrawater Srl': '/assets/logos/idrawater.png',
  'Fitporn Srl': '/assets/logos/fitporn.png',
  'FloreMoria Srl': '/assets/logos/floremoria.png',
  'Moneyviz Srl': '/assets/logos/moneyviz.png',
  'Silla Srl': '/assets/logos/silla.png',
  'La Orange Srl': '/assets/logos/la-orange.png',
  'Verbalizza Srl': '/assets/logos/verbalizza.png',
  'GoldSprint Srl': '/assets/logos/goldsprint.png',
  'The Spiritual Machine Srl': '/assets/logos/the-spiritual-machine.png',
  'Propositive': '/assets/logos/propositive.png',
  'Tuduu Srl': '/assets/logos/tuduu.png',
};

function withLocalLogo(company) {
  const local = LOCAL_LOGOS[company.name];
  return local ? { ...company, logo: local } : company;
}

// Stati round che NON vanno mostrati in pagina (fuori portfolio pubblico,
// ma restano nella tabella Coda per lo storico). Case-insensitive.
const HIDDEN_STATUSES = ['archiviata'];

function isVisible(company) {
  const status = (company.roundStatus || '').trim().toLowerCase();
  return !HIDDEN_STATUSES.includes(status);
}

exports.handler = async function handler() {
  try {
    const companies = (await fetchLiveFromCoda()).map(withLocalLogo).filter(isVisible);
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
        companies: seed.filter(isVisible),
      }),
    };
  }
};
