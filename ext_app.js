const TOTAL = 8;
let current = 0;
let done = new Array(TOTAL).fill(false);

function buildDots() {
    const row = document.getElementById('dots-row');
    row.innerHTML = '';
    for (let i = 0; i < TOTAL; i++) {
        const d = document.createElement('button');
        d.className = 'dot' + (done[i] ? ' done' : '') + (i === current ? ' active' : '');
        d.setAttribute('aria-label', 'Go to step ' + (i + 1));
        if (!done[i]) d.textContent = i + 1;
        d.onclick = () => goTo(i);
        row.appendChild(d);
    }
}

function updateProgress() {
    const pct = Math.round((done.filter(Boolean).length / TOTAL) * 100);
    document.getElementById('prog-fill').style.width = pct + '%';
    document.getElementById('prog-pct').textContent = pct + '% complete';
    document.getElementById('prog-label').textContent = 'Step ' + (current + 1) + ' of ' + TOTAL;
    buildDots();
}

function showStep(n) {
    document.querySelectorAll('.step-card').forEach(c => c.classList.remove('active'));
    document.getElementById('completion-card').classList.remove('active');
    const card = document.querySelector('[data-step="' + n + '"]');
    if (card) card.classList.add('active');
    current = n;
    updateProgress();
}

function nextStep() {
    if (current < TOTAL - 1) showStep(current + 1);
}

function prevStep() {
    if (current > 0) showStep(current - 1);
}

function goTo(n) {
    showStep(n);
}

function markDone(n) {
    done[n] = true;
    updateProgress();
}

function toggleCheck(el) {
    el.classList.toggle('checked');
}

function finish() {
    done[TOTAL - 1] = true;
    document.querySelectorAll('.step-card').forEach(c => c.classList.remove('active'));
    document.getElementById('completion-card').classList.add('active');
    document.getElementById('prog-fill').style.width = '100%';
    document.getElementById('prog-pct').textContent = '100% complete';
    buildDots();
}

function restart() {
    done = new Array(TOTAL).fill(false);
    showStep(0);
}

buildDots();