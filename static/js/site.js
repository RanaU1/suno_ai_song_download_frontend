/* ==========================================================================
   site.js — loaded on EVERY page (before app.js on the home page)

   1. SITE settings            -> edit your email / telegram name in one place
   2. Component loader         -> injects components/navbar.html and footer.html
   3. Active menu link         -> underlines the page you are on
   4. Server status pill       -> yellow = connecting, green = online, red = error
   ========================================================================== */

/* ---------- 1. Settings: CHANGE THE TWO "CHANGE ME" LINES ---------- */
const SITE = {
    name: 'Suno Ai Song Download',
    owner: 'RanaUniverse',
    domain: 'sunoaisongdownload.online',
    email: 'contact@sunoaisongdownload.online',
    telegramUser: 'PythonLearningPerson',       // Telegram username, no @
    botUser: 'SunoAiSongDownloadBot',
    whatsapp: '917044394156',   // CHANGE ME: country code + number, digits only
    updated: '19 October 2026'                    // shown on the legal pages
};

const IS_LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);
const API_BASE_URL = IS_LOCAL
    ? 'http://localhost:9999'
    : 'https://api.sunoaisongdownload.online';
const HEALTH_URL = `${API_BASE_URL}/api/health`;

/* Production default: do NOT tell the backend about page visits.
   Set to true only while testing your Telegram alerts. */
const NOTIFY_VISIT = false;


/* ---------- 2. Fill {{placeholders}} written as data attributes ---------- */
function fillSiteData() {
    document.querySelectorAll('[data-site]').forEach(el => {
        const v = SITE[el.dataset.site];
        if (v) el.textContent = v;
    });
    document.querySelectorAll('[data-site-link]').forEach(el => {
        const href = {
            email: `mailto:${SITE.email}`,
            telegram: `https://t.me/${SITE.telegramUser}`,
            bot: `https://t.me/${SITE.botUser}`,
            whatsapp: `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent('Hi, I am writing about Suno Ai Song Download')}`

        }[el.dataset.siteLink];
        if (href) el.href = href;
    });
    document.querySelectorAll('[data-year]').forEach(el => {
        el.textContent = new Date().getFullYear();
    });
}


/* ---------- 3. Active menu link ---------- */
function markActiveLink() {
    const norm = p => p.replace(/index\.html$/, '').replace(/\.html$/, '').replace(/\/$/, '') || '/';
    const here = norm(location.pathname);
    document.querySelectorAll('.studio-nav .nav-link').forEach(a => {
        const url = new URL(a.getAttribute('href'), location.origin);
        if (url.hash) return;                       // "/#download" is a section, not a page
        const active = norm(url.pathname) === here;
        a.classList.toggle('active', active);
        if (active) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
    });
}


/* ---------- 4. Server status pill ---------- */
const STATUS_TEXT = {
    checking: 'Connecting to server…',
    online: 'Server ready',
    offline: 'Server error — contact admin'
};
let serverState = '';


function setServerStatus(state) {
    const pill = document.getElementById('serverStatus');
    if (!pill || state === serverState) return;
    serverState = state;
    pill.classList.remove('is-checking', 'is-online', 'is-offline');
    pill.classList.add('is-' + state);
    pill.querySelector('.status-text').textContent = STATUS_TEXT[state];
    pill.title = state === 'offline' ? 'Click to try again' : '';
}

async function checkServer({ silent = false, visit = false } = {}) {
    if (!silent) setServerStatus('checking');
    const started = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    let ok = false;
    try {
        const url = visit ? `${HEALTH_URL}?${getVisitQuery()}` : HEALTH_URL;
        const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
        ok = res.ok;
    } catch (e) {
        ok = false;
    } finally {
        clearTimeout(timer);
    }
    // keep the yellow state visible for a moment so it does not just flash
    const wait = silent ? 0 : Math.max(0, 900 - (Date.now() - started));
    setTimeout(() => setServerStatus(ok ? 'online' : 'offline'), wait);
}



function getVisitQuery() {
    const p = new URLSearchParams({ visit: '1' });
    p.set('screen', `${screen.width}x${screen.height}`);
    p.set('viewport', `${window.innerWidth}x${window.innerHeight}`);
    p.set('dpr', String(window.devicePixelRatio || 1));
    p.set('lang', navigator.language || '');
    p.set('tz', Intl.DateTimeFormat().resolvedOptions().timeZone || '');
    return p.toString();
}


// function renderServerStatus() {
//     const pill = document.getElementById('serverStatus');
//     if (!pill || !serverState) return;
//     pill.classList.remove('is-checking', 'is-online', 'is-offline');
//     pill.classList.add('is-' + serverState);
//     pill.querySelector('.status-text').textContent = STATUS_TEXT[serverState];
//     pill.title = serverState === 'offline' ? 'Click to try again' : '';
// }

// function setServerStatus(state) {
//     if (state === serverState) return;
//     serverState = state;
//     renderServerStatus();
// }

// /* One health call. Used by the pill and by status.html */
// async function pingServer(visit = false) {
//     const controller = new AbortController();
//     const timer = setTimeout(() => controller.abort(), 8000);
//     const t0 = performance.now();
//     try {
//         const url = visit ? `${HEALTH_URL}?visit=1` : HEALTH_URL;
//         const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
//         return { ok: res.ok, ms: Math.round(performance.now() - t0), code: res.status };
//     } catch (e) {
//         return { ok: false, ms: null, code: 0 };
//     } finally {
//         clearTimeout(timer);
//     }
// }

// async function checkServer({ silent = false, visit = false } = {}) {
//     if (!silent) setServerStatus('checking');
//     const started = Date.now();
//     const result = await pingServer(visit);
//     // keep yellow visible for a moment so it does not just flash
//     const wait = silent ? 0 : Math.max(0, 900 - (Date.now() - started));
//     setTimeout(() => setServerStatus(result.ok ? 'online' : 'offline'), wait);
// }

// let statusStarted = false;
// function startServerStatus() {
//     if (statusStarted || !document.getElementById('serverStatus')) return;
//     statusStarted = true;

//     // click on the red pill = try again (delegated, survives menu re-render)
//     document.addEventListener('click', e => {
//         if (e.target.closest('#serverStatus') && serverState === 'offline') checkServer();
//     });

//     let visit = false;
//     try {
//         visit = NOTIFY_VISIT && !sessionStorage.getItem('visitSent');
//         if (visit) sessionStorage.setItem('visitSent', '1');   // once per browser session
//     } catch (e) { /* storage blocked: no visit flag */ }

//     checkServer({ visit });
//     // quiet re-check once a minute, and not while the tab is in the background
//     setInterval(() => { if (!document.hidden) checkServer({ silent: true }); }, 60000);
// }


/* ---------- Component loader (navbar / footer) ----------
   The last copy is kept in sessionStorage so the menu appears instantly
   on the next page; a fresh copy is fetched every time and replaces it
   only if it changed. */
function afterIncludes() {
    fillSiteData();
    markActiveLink();
    // renderServerStatus();
    // startServerStatus();
}

async function hydrate(el) {
    const url = el.dataset.include;
    const key = 'inc:' + url;

    let cached = null;
    try { cached = sessionStorage.getItem(key); } catch (e) { }
    if (cached) el.innerHTML = cached;

    try {
        const res = await fetch(url, { cache: 'no-cache' });
        if (!res.ok) throw new Error(res.status);
        const html = await res.text();
        if (html !== cached) {
            el.innerHTML = html;
            try { sessionStorage.setItem(key, html); } catch (e) { }
        }
    } catch (err) {
        if (!cached) console.error('Could not load', url, err);
    }
}

(async function initSite() {
    fillSiteData();
    const slots = [...document.querySelectorAll('[data-include]')];
    // show cached menu/footer immediately
    slots.forEach(el => {
        try {
            const c = sessionStorage.getItem('inc:' + el.dataset.include);
            if (c) el.innerHTML = c;
        } catch (e) { }
    });
    afterIncludes();
    // then refresh from the server
    await Promise.all(slots.map(hydrate));
    afterIncludes();
})();


// Delegated: works even after the navbar is replaced
document.addEventListener('click', e => {
    if (!e.target.closest('#serverStatus')) return;
    const now = Date.now();
    if (now - lastManualCheck < 10000) return;   // 10s cooldown so nobody can spam your Telegram alerts
    lastManualCheck = now;
    checkServer({ visit: true });                // explicit visit=1 + health check
});

document.addEventListener('DOMContentLoaded', () => {
    const pill = document.getElementById('serverStatus');
    if (pill) {
        pill.addEventListener('click', () => {
            if (serverState === 'offline') checkServer();
        });
    }

    let shouldNotify = false;
    try {
        // Use sessionStorage (once per tab session) or localStorage (once forever until cleared)
        const hasVisited = sessionStorage.getItem('visitSent');
        if (!hasVisited) {
            shouldNotify = true;
            sessionStorage.setItem('visitSent', '1');
        }
    } catch (err) {
        console.warn('Storage access restricted:', err);
    }

    // First call: true on first page view of the session, false on page changes/refreshes 🚀
    checkServer({ visit: shouldNotify });

    // Periodic heartbeat every 30s: always false ⏱️
    setInterval(() => checkServer({ silent: true, visit: false }), 30000);
});