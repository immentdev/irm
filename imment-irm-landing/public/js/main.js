(function () {
  const grid = document.getElementById('portfolio-grid');
  const dataNote = document.getElementById('data-note');
  const pillsWrap = document.getElementById('filter-pills');

  let allCompanies = [];
  let currentFilter = 'all';

  function statusClass(status) {
    const s = (status || '').toLowerCase();
    if (s.includes('in corso')) return 'status-in-corso';
    if (s.includes('coming')) return 'status-coming-soon';
    if (s.includes('chiuso')) return 'status-chiuso';
    return 'status-chiuso';
  }

  function normalizeUrl(url) {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    return 'https://' + url;
  }

  function initials(name) {
    return (name || '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
  }

  function companyCard(c) {
    const website = normalizeUrl(c.website);
    const logoBox = c.logo
      ? `<div class="logo-box"><img src="${c.logo}" alt="${c.name} logo" loading="lazy" onerror="this.parentElement.innerHTML='<span class=\\'logo-fallback\\'>${initials(c.name)}</span>'"></div>`
      : `<div class="logo-box"><span class="logo-fallback">${initials(c.name)}</span></div>`;

    return `
      <div class="company-card" data-status="${c.roundStatus || ''}">
        <div class="card-top">
          ${logoBox}
          <div>
            <h3>${c.name}</h3>
            <div class="meta">
              <span class="status-badge ${statusClass(c.roundStatus)}">${c.roundNumber ? c.roundNumber + ' round · ' : ''}${c.roundStatus || '—'}</span>
              ${c.importo ? `<span class="importo-tag">${c.importo}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="card-actions">
          <div class="row">
            ${website ? `<a class="btn btn-ghost" href="${website}" target="_blank" rel="noopener">Sito web</a>` : `<span class="btn btn-ghost is-disabled">Sito web</span>`}
            ${c.pitchDeck ? `<a class="btn btn-ghost" href="${c.pitchDeck}" target="_blank" rel="noopener">Pitch deck</a>` : `<span class="btn btn-ghost is-disabled">Pitch deck</span>`}
          </div>
          ${c.landingPage ? `<a class="btn btn-primary btn-block" href="${c.landingPage}" target="_blank" rel="noopener">Entra a far parte di ${c.name}</a>` : ''}
          ${c.loi ? `<a class="btn btn-secondary btn-block" href="${c.loi}" target="_blank" rel="noopener">Lettera d'Intenti</a>` : ''}
        </div>
      </div>
    `;
  }

  function render() {
    const filtered =
      currentFilter === 'all'
        ? allCompanies
        : allCompanies.filter((c) => (c.roundStatus || '').toLowerCase() === currentFilter.toLowerCase());

    if (!filtered.length) {
      grid.innerHTML = `<div class="portfolio-empty">Nessuna startup in questo stato al momento.</div>`;
      return;
    }
    grid.innerHTML = filtered.map(companyCard).join('');
  }

  pillsWrap.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-pill');
    if (!btn) return;
    pillsWrap.querySelectorAll('.filter-pill').forEach((p) => p.classList.remove('is-active'));
    btn.classList.add('is-active');
    currentFilter = btn.dataset.filter;
    render();
  });

  fetch('/api/portfolio')
    .then((res) => res.json())
    .then((data) => {
      allCompanies = data.companies || [];
      render();
      if (data.source === 'seed') {
        dataNote.textContent = 'Dati statici (fetch live da Coda non ancora configurato)';
      } else {
        dataNote.textContent = 'Dati aggiornati in tempo reale da Coda';
      }
    })
    .catch(() => {
      grid.innerHTML = `<div class="portfolio-empty">Non è stato possibile caricare le schede. Riprova più tardi.</div>`;
    });
})();
