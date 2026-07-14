(function () {
  const grid = document.getElementById('portfolio-grid');
  const dataNote = document.getElementById('data-note');
  const pillsWrap = document.getElementById('filter-pills');
  const loadMoreWrap = document.getElementById('load-more-wrap');
  const loadMoreBtn = document.getElementById('load-more');

  const PAGE_SIZE = 6;
  let allCompanies = [];
  let currentFilter = 'all';
  let visibleCount = PAGE_SIZE;

  function isOpenRound(c) {
    return (c.roundStatus || '').toLowerCase().includes('in corso');
  }

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

  // Icone inline (nessuna richiesta esterna) per rendere le CTA riconoscibili.
  const ICONS = {
    web: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18"/></svg>',
    deck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/></svg>',
    loi: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>',
  };

  function companyCard(c) {
    const website = normalizeUrl(c.website);
    const logoBox = c.logo
      ? `<div class="logo-box"><img src="${c.logo}" alt="${c.name} logo" loading="lazy" onerror="this.parentElement.innerHTML='<span class=\\'logo-fallback\\'>${initials(c.name)}</span>'"></div>`
      : `<div class="logo-box"><span class="logo-fallback">${initials(c.name)}</span></div>`;

    // Link informativi: solo quelli realmente presenti, con icona ed etichetta.
    const links = [];
    if (website) links.push(`<a class="btn btn-ghost" href="${website}" target="_blank" rel="noopener">${ICONS.web}<span>Sito web</span></a>`);
    if (c.pitchDeck) links.push(`<a class="btn btn-ghost" href="${c.pitchDeck}" target="_blank" rel="noopener">${ICONS.deck}<span>Pitch deck</span></a>`);
    const linkRow = links.length ? `<div class="link-row">${links.join('')}</div>` : '';

    // CTA di conversione, con etichetta esplicita (mai anonime).
    const primary = c.landingPage
      ? `<a class="btn btn-primary btn-block" href="${c.landingPage}" target="_blank" rel="noopener">Entra a far parte di ${c.name}${ICONS.arrow}</a>`
      : '';
    const loi = c.loi
      ? `<a class="btn btn-secondary btn-block" href="${c.loi}" target="_blank" rel="noopener">${ICONS.loi}<span>Manifesta interesse (LOI)</span></a>`
      : '';

    const actions = (linkRow || primary || loi)
      ? `<div class="card-actions">${linkRow}${primary}${loi}</div>`
      : '';

    const roundPill = c.roundNumber
      ? `<span class="round-pill">${c.roundNumber} Round</span>`
      : '';

    return `
      <div class="company-card" data-status="${c.roundStatus || ''}">
        <div class="card-head">
          ${logoBox}
          <span class="status-badge ${statusClass(c.roundStatus)}">${c.roundStatus || '—'}</span>
        </div>
        <div class="card-body">
          <h3>${c.name}</h3>
          ${roundPill}
        </div>
        ${actions}
      </div>
    `;
  }

  function filteredList() {
    return currentFilter === 'all'
      ? allCompanies
      : allCompanies.filter((c) => (c.roundStatus || '').toLowerCase() === currentFilter.toLowerCase());
  }

  function render() {
    const filtered = filteredList();

    if (!filtered.length) {
      grid.innerHTML = `<div class="portfolio-empty">Nessuna startup in questo stato al momento.</div>`;
      loadMoreWrap.hidden = true;
      return;
    }

    const shown = filtered.slice(0, visibleCount);
    grid.innerHTML = shown.map(companyCard).join('');

    const remaining = filtered.length - shown.length;
    loadMoreWrap.hidden = remaining <= 0;
    if (remaining > 0) {
      const next = Math.min(PAGE_SIZE, remaining);
      loadMoreBtn.textContent = `Carica altre startup (${next} di ${remaining})`;
    }
  }

  pillsWrap.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-pill');
    if (!btn) return;
    pillsWrap.querySelectorAll('.filter-pill').forEach((p) => p.classList.remove('is-active'));
    btn.classList.add('is-active');
    currentFilter = btn.dataset.filter;
    visibleCount = PAGE_SIZE; // ogni cambio filtro riparte da 6
    render();
  });

  loadMoreBtn.addEventListener('click', () => {
    visibleCount += PAGE_SIZE;
    render();
  });

  // ---------- Carosello "Round aperti" (auto-avanzamento a step) ----------
  function setupCarousel(companies) {
    const featured = document.getElementById('featured');
    const viewport = document.getElementById('carousel-viewport');
    const dotsWrap = document.getElementById('carousel-dots');
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');

    const open = companies.filter(isOpenRound);
    featured.hidden = open.length === 0;
    if (!open.length) return;

    viewport.innerHTML = open.map(companyCard).join('');

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let timer = null;

    const pageWidth = () => viewport.clientWidth || 1;
    const pageCount = () => Math.max(1, Math.round(viewport.scrollWidth / pageWidth()));
    const currentPage = () => Math.round(viewport.scrollLeft / pageWidth());

    function renderDots() {
      const n = pageCount();
      // niente controlli se tutto sta in una schermata
      const single = n <= 1;
      dotsWrap.style.display = single ? 'none' : '';
      prevBtn.style.display = nextBtn.style.display = single ? 'none' : '';
      if (single) { dotsWrap.innerHTML = ''; return; }
      dotsWrap.innerHTML = Array.from({ length: n }, (_, i) =>
        `<button class="carousel-dot" type="button" data-page="${i}" aria-label="Vai al gruppo ${i + 1}"></button>`
      ).join('');
      updateDots();
    }

    function updateDots() {
      const cur = currentPage();
      dotsWrap.querySelectorAll('.carousel-dot').forEach((d, i) =>
        d.classList.toggle('is-active', i === cur)
      );
    }

    function goTo(page) {
      const n = pageCount();
      const p = ((page % n) + n) % n; // wrap circolare
      viewport.scrollTo({ left: p * pageWidth(), behavior: reduceMotion ? 'auto' : 'smooth' });
    }

    const next = () => goTo(currentPage() + 1);
    const prev = () => goTo(currentPage() - 1);

    function start() {
      stop();
      if (!reduceMotion && pageCount() > 1) timer = setInterval(next, 5000);
    }
    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
    }
    const restart = () => { stop(); start(); };

    prevBtn.addEventListener('click', () => { prev(); restart(); });
    nextBtn.addEventListener('click', () => { next(); restart(); });
    dotsWrap.addEventListener('click', (e) => {
      const b = e.target.closest('.carousel-dot');
      if (b) { goTo(Number(b.dataset.page)); restart(); }
    });

    let rafId;
    viewport.addEventListener('scroll', () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateDots);
    }, { passive: true });

    featured.addEventListener('mouseenter', stop);
    featured.addEventListener('mouseleave', start);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

    let resizeT;
    window.addEventListener('resize', () => {
      clearTimeout(resizeT);
      resizeT = setTimeout(renderDots, 200);
    });

    renderDots();
    start();
  }

  fetch('/api/portfolio')
    .then((res) => res.json())
    .then((data) => {
      allCompanies = data.companies || [];
      setupCarousel(allCompanies);
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
