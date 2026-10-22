const el = id => document.getElementById(id);

function setPill(state, text) {
    const pill = el('statusPill');
    pill.classList.remove('is-checking', 'is-online', 'is-offline');
    pill.classList.add('is-' + state);
    el('statusText').textContent = text;
}

async function runCheck() {
    const btn = el('recheck');
    btn.disabled = true;
    setPill('checking', 'Checking…');
    let r = { ok: false, ms: null };
    try {
        r = await pingServer();
    } catch (e) {
        console.error(e);
    }
    setPill(r.ok ? 'online' : 'offline', r.ok ? 'All systems operational' : 'Server error — contact admin');
    setServerStatus(r.ok ? 'online' : 'offline');   // navbar pill
    el('mStatus').textContent = r.ok ? 'Online' : 'Unreachable';
    el('mTime').textContent = r.ms != null ? r.ms + ' ms' : '—';
    el('mChecked').textContent = new Date().toLocaleTimeString();
    btn.disabled = false;
}

el('recheck').addEventListener('click', runCheck);
runCheck();