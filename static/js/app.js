/* ==========================================================================
   app.js — home page downloader only
   Needs site.js to be loaded first (API_BASE_URL, checkServer).
   ========================================================================== */

let selectedFormat = "m4a";
let currentFilename = "";
let currentTotalDuration = 0;
let selectedPreset = "auto";

/* Escape text before putting it into innerHTML (song titles come from Suno) */
function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

/* POST JSON to the backend. Returns the parsed data or throws an Error
   with a readable message. Handles timeout, FastAPI "detail" errors and
   network failures in one place. */
async function postJson(path, body, timeoutMs = 60000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(`${API_BASE_URL}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal
        });

        let data = {};
        try { data = await res.json(); } catch (e) { }

        if (!res.ok || data.error) {
            const detail = typeof data.detail === 'string' ? data.detail : '';
            throw new Error(data.error || detail || `Server error (${res.status}).`);
        }
        return data;
    } catch (err) {
        if (err.name === 'AbortError') {
            const e = new Error('The server took too long to respond.');
            e.isTimeout = true;
            throw e;
        }
        if (err instanceof TypeError) {
            checkServer({ silent: true });   // real check, updates the pill if the server is down
            throw new Error('Could not reach the server. Please try again.');
        }
        throw err;
    } finally {
        clearTimeout(timer);
    }
}

function setWave(id, isPlaying) {
    const el = document.getElementById(id);
    if (el) {
        if (isPlaying) el.classList.add('playing');
        else el.classList.remove('playing');
    }
}

function setFormat(fmt) {
    selectedFormat = fmt;
    [['tabMp3', 'mp3'], ['tabM4a', 'm4a'], ['tabWav', 'wav']].forEach(([id, f]) => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('active', fmt === f);
    });
}

async function pasteFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        if (text) {
            document.getElementById('sunoUrl').value = text.trim();
        }
    } catch (err) {
        alert('Tap and hold the text box to paste.');
    }
}

function selectPreset(preset, btnElement) {
    selectedPreset = preset;
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    if (btnElement) {
        btnElement.classList.add('active');
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // Allow Enter to be pressed in the input
    const inp = document.getElementById('sunoUrl');
    if (inp) {
        inp.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                startDownload();
            }
        });
    }
    // Load history once the page is ready
    loadHistory();
});

async function startDownload() {
    const urlInput = document.getElementById('sunoUrl');
    const url = urlInput.value.trim();
    if (!url) {
        alert('Please paste a Suno link.');
        return;
    }

    const btn = document.getElementById('btnDownload');
    const statusBadge = document.getElementById('statusBadge');
    const resultBox = document.getElementById('resultBox');
    const stemResultBox = document.getElementById('stemResultBox');
    const sampleResultBox = document.getElementById('sampleResultBox');

    btn.disabled = true;
    btn.innerHTML = `<div class="spinner"></div> Processing audio (${selectedFormat.toUpperCase()})...`;
    statusBadge.style.display = 'block';
    statusBadge.innerText = `Connecting to Suno and decrypting audio (${selectedFormat.toUpperCase()})...`;

    // hide the previous song's results while a new one is processing
    resultBox.style.display = 'none';
    stemResultBox.style.display = 'none';
    sampleResultBox.style.display = 'none';

    try {
        const data = await postJson('/api/download', { url: url, format: selectedFormat }, 60000);

        currentFilename = data.filename;
        currentTotalDuration = data.duration_seconds || 0;

        // Show results & fill player
        document.getElementById('resTitle').innerText = data.title;
        document.getElementById('resTags').innerText = data.tags || 'Suno AI Track';
        document.getElementById('resCover').src = data.cover_url || '';
        document.getElementById('resDuration').innerText = `⏱️ ${data.duration_formatted || '0:00'}`;
        document.getElementById('resFormat').innerText = (data.format || selectedFormat).toUpperCase();

        const audioPlayer = document.getElementById('resAudio');
        audioPlayer.src = `${API_BASE_URL}${data.download_url}`;
        try { audioPlayer.load(); } catch (e) { }

        const dlLink = document.getElementById('resDownloadLink');
        dlLink.href = `${API_BASE_URL}${data.download_url}`;
        dlLink.setAttribute('download', data.filename);
        dlLink.innerHTML = `📥 Save Full Song (${(data.format || selectedFormat).toUpperCase()})`;

        // Update sample description with suggested duration
        const suggestedDur = data.suggested_sample_formatted || '1-2 minutes';
        document.getElementById('sampleDescText').innerText =
            `Song duration: ${data.duration_formatted || 'standard duration'}. Suggested sample duration: ${suggestedDur}.`;

        statusBadge.innerText = `✅ Song ready to listen to and download in ${selectedFormat.toUpperCase()}!`;
        resultBox.style.display = 'block';
        resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        try { await loadHistory(); } catch (e) { }

    } catch (err) {
        console.error(err);
        let msg = err.message;
        if (err.isTimeout) msg += ' Check whether the file is already in the list below.';
        alert('Notice: ' + msg);
        statusBadge.innerText = '⚠️ ' + msg;
        try { await loadHistory(); } catch (e) { }
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>🎧 Download Song</span>';
    }
}

async function separateStems() {
    if (!currentFilename) {
        alert('Load a song first.');
        return;
    }

    const btn = document.getElementById('btnCreateStem');
    const stemResultBox = document.getElementById('stemResultBox');
    const instAudio = document.getElementById('instAudioPlayer');
    const instDlLink = document.getElementById('instDownloadLink');
    const vocalAudio = document.getElementById('vocalAudioPlayer');
    const vocalDlLink = document.getElementById('vocalDownloadLink');

    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> Separating Track and Vocals with DSP...';

    try {
        const data = await postJson('/api/separate', {
            filename: currentFilename,
            format: selectedFormat
        }, 90000);

        instAudio.src = `${API_BASE_URL}${data.instrumental_url}`;
        try { instAudio.load(); } catch (e) { }
        instDlLink.href = `${API_BASE_URL}${data.instrumental_url}`;
        instDlLink.setAttribute('download', data.instrumental_filename);

        vocalAudio.src = `${API_BASE_URL}${data.vocals_url}`;
        try { vocalAudio.load(); } catch (e) { }
        vocalDlLink.href = `${API_BASE_URL}${data.vocals_url}`;
        vocalDlLink.setAttribute('download', data.vocals_filename);

        stemResultBox.style.display = 'block';
        stemResultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        try { await loadHistory(); } catch (e) { }

    } catch (err) {
        console.error(err);
        alert('Error separating: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>✨ SEPARATE INTO TRACK AND VOCALS</span>';
    }
}

async function generateSample() {
    if (!currentFilename) {
        alert('Load a song first.');
        return;
    }

    const btn = document.getElementById('btnCreateSample');
    const sampleResultBox = document.getElementById('sampleResultBox');
    const sampleAudio = document.getElementById('sampleAudioPlayer');
    const sampleDlLink = document.getElementById('sampleDownloadLink');
    const sampleLabel = document.getElementById('sampleResultLabel');

    btn.disabled = true;
    btn.innerHTML = '<div class="spinner spinner-dark"></div> Trimming sample with FFmpeg...';

    try {
        const data = await postJson('/api/sample', {
            filename: currentFilename,
            preset: selectedPreset
        }, 60000);

        sampleAudio.src = `${API_BASE_URL}${data.sample_url}`;
        try { sampleAudio.load(); } catch (e) { }
        sampleDlLink.href = `${API_BASE_URL}${data.sample_url}`;
        sampleDlLink.setAttribute('download', data.filename);
        sampleLabel.innerText = `🎧 Sample ready (${Math.round(data.sample_duration)}s):`;

        sampleResultBox.style.display = 'block';
        sampleResultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        try { await loadHistory(); } catch (e) { }

    } catch (err) {
        console.error(err);
        alert('Error generating sample: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>✂️ GENERATE SAMPLE</span>';
    }
}

async function loadHistory() {
    const list = document.getElementById('historyList');
    if (!list) {
        return;   // this page has no history section
    }

    try {
        const res = await fetch(`${API_BASE_URL}/api/files`);
        if (!res.ok) throw new Error(`History request failed (${res.status})`);
        const files = await res.json();
        list.innerHTML = '';

        if (!Array.isArray(files) || files.length === 0) {
            list.innerHTML = '<div style="color:#71717a; font-size:12px; text-align:center;">No recent downloads yet.</div>';
            return;
        }

        files.forEach(f => {
            const item = document.createElement('div');
            const isInst = f.name.includes('_instrumental_track');
            const isVocal = f.name.includes('_vocals_only');
            const isSample = f.name.includes('_sample');
            const isWav = f.filename.endsWith('.wav');
            const isM4a = f.filename.endsWith('.m4a');

            let itemClass = 'history-item';
            let badge = '';

            if (isInst) {
                itemClass += ' is-inst';
                badge += '<span class="history-badge inst">🎹 Instrumental</span>';
            } else if (isVocal) {
                itemClass += ' is-vocal';
                badge += '<span class="history-badge vocal">🎙️ Vocals</span>';
            } else if (isSample) {
                itemClass += ' is-sample';
                badge += '<span class="history-badge sample">✂️ Sample</span>';
            }

            if (isWav) {
                badge += '<span class="history-badge wav">WAV</span>';
            } else if (isM4a) {
                badge += '<span class="history-badge m4a">M4A</span>';
            } else {
                badge += '<span class="history-badge mp3">MP3</span>';
            }

            item.className = itemClass;
            item.innerHTML = `
                <span class="history-name">${badge} ${escapeHtml(f.name)}</span>
                <a class="history-btn" href="${API_BASE_URL}/downloads/${encodeURIComponent(f.filename)}" download>Download</a>
            `;
            list.appendChild(item);
        });
    } catch (e) {
        console.error(e);
    }
}

function fillSunoExample(url) {
    const input = document.getElementById("sunoUrl");

    if (!input) {
        console.error("Suno URL input was not found.");
        return;
    }

    input.value = url;
    input.focus();

    input.scrollIntoView({
        behavior: "smooth",
        block: "center",
    });
}