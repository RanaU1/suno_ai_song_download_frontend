/* ==========================================================================
   site.js — loaded on EVERY page (before app.js on the home page)

   1. SITE settings            -> edit your email / telegram name in one place
   2. Component loader         -> injects components/navbar.html and footer.html
   3. Active menu link         -> underlines the page you are on
   4. Server status pill       -> yellow = connecting, green = online, red = error
   5. Visit notification       -> visit=1 is sent ONLY on the first health
                                  check of a browser session
   ========================================================================== */

/* ---------- 1. Settings ---------- */
const SITE = {
    name: 'Suno Ai Song Download',
    owner: 'RanaUniverse',
    domain: 'sunoaisongdownload.online',
    email: 'contact@sunoaisongdownload.online',
    telegramUser: 'PythonLearningPerson', // Telegram username, no @
    botUser: 'SunoAiSongDownloadBot',
    whatsapp: '917044394156', // country code + number, digits only (public on the site!)
    updated: '19 October 2026' // shown on the legal pages
};

const IS_LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);
const API_BASE_URL = IS_LOCAL
    ? 'http://localhost:9999'
    : 'https://api.sunoaisongdownload.online';
const HEALTH_URL = `${API_BASE_URL}/api/health`;



/* ---------- 2. Fill data-site / data-site-link / data-year ---------- */
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
    online: 'Server Ready ✅',
    offline: 'Server Error ❌ — Contact Admin'
};
let serverState = '';
let checkInFlight = false;   // only one health request at a time
let lastManualCheck = 0;     // cooldown for clicks on the pill

/* Paint the current serverState onto the pill. Safe to call any time,
   including right after the navbar HTML has been (re)injected. */
function renderServerStatus() {
    const pill = document.getElementById('serverStatus');
    if (!pill || !serverState) return;
    pill.classList.remove('is-checking', 'is-online', 'is-offline');
    pill.classList.add('is-' + serverState);
    pill.querySelector('.status-text').textContent = STATUS_TEXT[serverState];
    pill.title = serverState === 'offline' ? 'Click to try again' : '';
}

function setServerStatus(state) {
    if (state === serverState) return;
    serverState = state;
    renderServerStatus();
}

/* One health check. Returns true (ok), false (failed) or null (skipped
   because another check was already running). */
async function checkServer({ silent = false, visit = false } = {}) {
    if (checkInFlight) return null;
    checkInFlight = true;
    try {
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
        if (wait) await new Promise(r => setTimeout(r, wait));
        setServerStatus(ok ? 'online' : 'offline');
        try {
            sessionStorage.setItem('serverStatusCache', JSON.stringify({ state: ok ? 'online' : 'offline', t: Date.now() }));
        } catch (e) { }
        return ok;
    } finally {
        checkInFlight = false;
    }
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


/* ---------- 5. Visit notification (first check of a browser session) ---------- */
function shouldSendVisit() {
    try {
        if (sessionStorage.getItem('visitSent')) return false;
        sessionStorage.setItem('visitSent', '1');
        return true;
    } catch (err) {
        return false;
    }
}

function recentlyOnline() {
    try {
        const c = JSON.parse(sessionStorage.getItem('serverStatusCache'));
        return !!c && c.state === 'online' && Date.now() - c.t < 30000;
    } catch (e) {
        console.log(e);
        return false;
    }
}



function startServerStatus() {
    const visit = shouldSendVisit();

    if (!visit && recentlyOnline()) {
        setServerStatus('online');  // checked less than 30s ago, skip the request
    } else {
        checkServer({ visit }).then(ok => {
            if (visit && ok !== true) {
                try { sessionStorage.removeItem('visitSent'); } catch (e) { }
            }
        });
    }

    // quiet heartbeat every 30s (never visit=1), skipped in background tabs
    setInterval(() => {
        if (!document.hidden) checkServer({ silent: true });
    }, 30000);

    // quick re-check when the user comes back to the tab
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) checkServer({ silent: true });
    });
}

/* Click on the pill = manual re-check. Delegated, so it keeps working
   after the navbar is replaced. 10s cooldown. Never sends visit=1. */
document.addEventListener('click', e => {
    if (!e.target.closest('#serverStatus')) return;
    const now = Date.now();
    if (now - lastManualCheck < 10000) return;
    lastManualCheck = now;
    checkServer();
});


/* ---------- Component loader (navbar / footer) ----------
   The last copy is kept in sessionStorage so the menu appears instantly
   on the next page; a fresh copy is fetched every time and replaces it
   only if it changed. */
function afterIncludes() {
    fillSiteData();
    markActiveLink();
    renderServerStatus();   // navbar may have just been (re)injected -> repaint the pill
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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startServerStatus);
} else {
    startServerStatus();
}