import {
  loadStorage,
  upsertSession,
  clearActiveSession,
  recordQuestionStat,
  getGlobalStats,
  getFileProgress,
  clearAllProgress,
} from './storage.js';
import {
  shuffleOptions,
  filterQuestions,
  questionsByIds,
  computeResults,
  createSessionId,
  formatFileName,
  fileIcon,
  groupFiles,
} from './quiz.js';
import { setMathContent } from './math.js';
import { fetchNotebook, renderNotebook, getNotebookTitle } from './lectures.js';
import { MASCOT_URL, resolveMaterialUrl, isMastered } from './config.js';

/** @type {object[]} */
let allQuestions = [];

const main = document.getElementById('main-content');
const toastContainer = document.getElementById('toast-container');

document.getElementById('btn-home').addEventListener('click', () => navigate('home'));
document.getElementById('btn-lectures').addEventListener('click', () => navigate('lectures'));
document.getElementById('btn-stats').addEventListener('click', () => navigate('stats'));

init();

async function init() {
  showLoading();
  try {
    const res = await fetch('questions.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('Nie udało się wczytać bazy pytań');
    allQuestions = await res.json();
    const hash = location.hash.slice(1) || 'home';
    navigate(hash, false);
  } catch (err) {
    main.innerHTML = `
      <div class="empty-state">
        <h2>Błąd wczytywania</h2>
        <p>${escapeAttr(err.message)}</p>
        <p style="margin-top:1rem;font-size:0.9rem">Uruchom serwer z katalogu głównego repozytorium:<br>
        <code>python -m http.server 8080</code><br>
        następnie otwórz <code>http://localhost:8080/</code></p>
      </div>`;
  }

  window.addEventListener('hashchange', () => {
    navigate(location.hash.slice(1) || 'home', false);
  });
}

function showLoading() {
  main.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Wczytywanie bazy pytań…</p></div>`;
}

/** @param {string} view @param {boolean} [pushHash=true] */
function navigate(view, pushHash = true) {
  if (pushHash && location.hash.slice(1) !== view) {
    location.hash = view;
    return;
  }

  const parts = view.split('/');
  const route = parts[0];

  switch (route) {
    case 'home':
      renderHome();
      break;
    case 'quiz':
      renderQuiz();
      break;
    case 'results':
      renderResults();
      break;
    case 'lectures':
      renderLecturesList();
      break;
    case 'lecture':
      renderLectureView(parts[1]);
      break;
    case 'stats':
      renderStats();
      break;
    default:
      renderHome();
  }
}

function renderHome() {
  const active = getActiveSessionFromStore();
  const groups = groupFiles(allQuestions);
  const globalIds = allQuestions.map((q) => q.id);
  const globalStats = getGlobalStats(globalIds);
  const globalProgress = getFileProgress(globalIds);
  const allMastered = isMastered(globalProgress);

  let resumeHtml = '';
  if (active) {
    const answered = Object.keys(active.answers).length;
    const total = active.questionIds.length;
    resumeHtml = `
      <div class="resume-banner">
        <p><strong>W trakcie:</strong> ${escapeHtml(active.sourceLabel)} — ${answered}/${total} odpowiedzi</p>
        <div class="resume-actions">
          <button type="button" class="btn btn-primary" data-action="resume">Kontynuuj</button>
          <button type="button" class="btn btn-secondary" data-action="discard">Porzuć</button>
        </div>
      </div>`;
  }

  const tile = (file, count, featured = false) => {
    const ids = allQuestions.filter((q) => q.nazwa_pliku === file).map((q) => q.id);
    const progress = getFileProgress(ids);
    const mastered = isMastered(progress);
    const iconClass = file.endsWith('.ipynb') ? 'tile-icon-ipynb' : 'tile-icon-pdf';
    const typeLabel = file.endsWith('.ipynb') ? 'Notebook' : file.endsWith('.pdf') ? 'PDF' : 'Materiał';
    return `
      <button type="button" class="tile ${featured ? 'tile-featured' : ''}" data-file="${escapeAttr(file)}">
        <div class="tile-header-row">
          <span class="tile-icon ${iconClass}">${fileIcon(file)}</span>
        </div>
        <span class="tile-title">${escapeHtml(formatFileName(file))}</span>
        <span class="tile-meta">
          <span class="badge">${typeLabel}</span>
          <span class="badge">${escapeHtml(file)}</span>
          <span class="badge badge-primary">${count} pytań</span>
          ${progress > 0 && !mastered ? `<span class="badge badge-success">${progress}% opanowane</span>` : ''}
        </span>
        ${mastered ? `<span class="tile-mastered-row"><img class="mascot-mastered" src="${MASCOT_URL}" alt="" /> Opanowane!</span>` : ''}
      </button>`;
  };

  const allLectureTiles = [...groups.ipynb, ...groups.pdf, ...groups.other]
    .sort((a, b) => a[0].localeCompare(b[0], 'pl'));

  main.innerHTML = `
    ${resumeHtml}
    <img class="home-hero-mascot" src="${MASCOT_URL}" alt="" />

    <header class="page-header">
      <h1>Wybierz wykład</h1>
    </header>

    <section class="section-block">
      <h2 class="section-title">Pełna baza</h2>
      <div class="tiles-grid">
        <button type="button" class="tile tile-featured" data-file="">
          <span class="tile-icon tile-icon-all">🎯</span>
          <span class="tile-title">Wszystkie pytania</span>
          <span class="tile-meta">
            <span class="badge badge-primary">${allQuestions.length} pytań</span>
            ${allMastered ? `
              <span class="tile-mastered-row"><img class="mascot-mastered" src="${MASCOT_URL}" alt="" /> Cała baza opanowana!</span>` : (
              globalStats.mastered > 0 ? `<span class="badge badge-success">${globalStats.mastered} opanowanych</span>` : ''
            )}
          </span>
        </button>
      </div>
    </section>

    <section class="section-block">
      <h2 class="section-title">Wykłady</h2>
      <div class="tiles-grid">
        ${allLectureTiles.map(([f, c]) => tile(f, c)).join('')}
      </div>
    </section>
  `;

  main.querySelector('[data-action="resume"]')?.addEventListener('click', () => navigate('quiz'));
  main.querySelector('[data-action="discard"]')?.addEventListener('click', () => {
    clearActiveSession();
    renderHome();
    toast('Porzucono bieżący test');
  });

  main.querySelectorAll('.tile[data-file]').forEach((el) => {
    el.addEventListener('click', () => {
      const file = el.getAttribute('data-file');
      startQuiz({ mode: file ? 'file' : 'all', sourceFile: file || null });
    });
  });
}

/**
 * @param {{ mode: 'all'|'file'|'retry', sourceFile?: string|null, questionIds?: number[], sourceLabel?: string }} opts
 */
function startQuiz(opts) {
  let questionIds = opts.questionIds;
  let sourceLabel = opts.sourceLabel;
  const sourceFile = opts.sourceFile ?? null;

  if (!questionIds) {
    const filtered = filterQuestions(allQuestions, sourceFile);
    questionIds = shuffleArray(filtered.map((q) => q.id));
    sourceLabel = sourceFile ? formatFileName(sourceFile) : 'Wszystkie pytania';
  }

  if (!questionIds.length) {
    toast('Brak pytań w wybranym teście');
    return;
  }

  clearActiveSession();

  /** @type {import('./storage.js').QuizSession} */
  const session = {
    id: createSessionId(),
    mode: opts.mode,
    sourceLabel: sourceLabel ?? 'Test',
    sourceFile,
    questionIds,
    shuffles: {},
    answers: {},
    currentIndex: 0,
    status: 'in-progress',
    startedAt: new Date().toISOString(),
    completedAt: null,
  };

  for (const id of questionIds) {
    const q = allQuestions.find((x) => x.id === id);
    if (q) session.shuffles[id] = shuffleOptions(q);
  }

  upsertSession(session);
  navigate('quiz');
}

function getActiveSessionFromStore() {
  const data = loadStorage();
  if (!data.activeSessionId) return null;
  const s = data.sessions.find((x) => x.id === data.activeSessionId && x.status === 'in-progress');
  return s ?? null;
}

function getCurrentSession() {
  return getActiveSessionFromStore();
}

function renderQuiz() {
  const session = getCurrentSession();
  if (!session) {
    navigate('home');
    return;
  }

  const { questionIds, currentIndex, answers, shuffles } = session;
  const qId = questionIds[currentIndex];
  const question = allQuestions.find((q) => q.id === qId);
  if (!question) {
    finishQuiz(session);
    return;
  }

  const options = shuffles[qId] ?? shuffleOptions(question);
  const existing = answers[qId];
  const progress = ((currentIndex + 1) / questionIds.length) * 100;

  main.innerHTML = `
    <div class="quiz-container">
      <div class="quiz-topbar">
        <span class="quiz-meta">${escapeHtml(session.sourceLabel)}</span>
        <div class="progress-wrap">
          <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
        </div>
        <span class="quiz-meta">${currentIndex + 1} / ${questionIds.length}</span>
      </div>

      <article class="question-card">
        <div class="question-number">Pytanie ${currentIndex + 1}</div>
        <div class="question-text" id="question-text"></div>
        <div class="answers-list" id="answers-list"></div>
      </article>

      <div class="quiz-nav">
        <button type="button" class="btn btn-secondary" id="btn-quit">Wyjdź</button>
        ${currentIndex > 0 ? '<button type="button" class="btn btn-secondary" id="btn-prev">Wstecz</button>' : ''}
        <button type="button" class="btn btn-primary" id="btn-next" ${existing ? '' : 'disabled'}>
          ${currentIndex === questionIds.length - 1 ? 'Zakończ test' : 'Dalej'}
        </button>
      </div>
    </div>
  `;

  setMathContent(document.getElementById('question-text'), question.tresc_pl);

  const listEl = document.getElementById('answers-list');
  options.forEach((opt) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'answer-option';
    btn.dataset.originalKey = opt.originalKey;
    btn.innerHTML = `
      <span class="answer-label">${opt.label}</span>
      <span class="answer-text"></span>`;
    setMathContent(btn.querySelector('.answer-text'), opt.text);

    if (existing) {
      btn.disabled = true;
      if (opt.originalKey === question.poprawna_odpowiedz) btn.classList.add('correct');
      if (opt.originalKey === existing.selectedKey && !existing.isCorrect) btn.classList.add('incorrect');
      if (opt.originalKey === existing.selectedKey) btn.classList.add('selected');
    }

    btn.addEventListener('click', () => selectAnswer(session, qId, opt.originalKey, question.poprawna_odpowiedz));
    listEl.appendChild(btn);
  });

  document.getElementById('btn-quit').addEventListener('click', () => {
    if (confirm('Wyjść z testu? Postęp zostanie zapisany — możesz wrócić później.')) navigate('home');
  });

  document.getElementById('btn-prev')?.addEventListener('click', () => {
    session.currentIndex -= 1;
    upsertSession(session);
    renderQuiz();
  });

  document.getElementById('btn-next').addEventListener('click', () => {
    if (!answers[qId]) return;
    if (currentIndex >= questionIds.length - 1) {
      finishQuiz(session);
    } else {
      session.currentIndex += 1;
      upsertSession(session);
      renderQuiz();
    }
  });
}

function selectAnswer(session, questionId, selectedKey, correctKey) {
  if (session.answers[questionId]) return;

  const isCorrect = selectedKey === correctKey;
  session.answers[questionId] = {
    selectedKey,
    isCorrect,
    at: new Date().toISOString(),
  };
  upsertSession(session);
  recordQuestionStat(questionId, isCorrect);
  renderQuiz();
}

function finishQuiz(session) {
  session.status = 'completed';
  session.completedAt = new Date().toISOString();
  upsertSession(session);
  clearActiveSession();
  sessionStorage.setItem('last-results-session-id', session.id);
  navigate('results');
}

function renderResults() {
  const sessionId = sessionStorage.getItem('last-results-session-id');
  const data = loadStorage();
  const session = data.sessions.find((s) => s.id === sessionId);

  if (!session || session.status !== 'completed') {
    navigate('home');
    return;
  }

  const { correct, total, pct, wrongIds } = computeResults(session.questionIds, session.answers);
  const wrongQuestions = questionsByIds(allQuestions, wrongIds);

  let feedbackMsg = 'Świetna robota!';
  if (pct < 50) feedbackMsg = 'Warto powtórzyć materiał.';
  else if (pct < 80) feedbackMsg = 'Nieźle — jeszcze kilka luk do uzupełnienia.';
  else if (pct < 100) feedbackMsg = 'Bardzo dobrze!';

  main.innerHTML = `
    <div class="results-card">
      <img class="mascot-results ${pct === 100 ? 'mascot-results--perfect' : ''}" src="${MASCOT_URL}" alt="" />
      <div class="score-ring" style="--pct: ${pct}">
        <div class="score-value">${pct}%<small>${correct}/${total}</small></div>
      </div>
      <h2 class="results-title">${feedbackMsg}</h2>
      <p class="results-sub">${escapeHtml(session.sourceLabel)} · ${correct} poprawnych, ${total - correct} błędnych</p>

      <div class="results-actions">
        ${wrongIds.length ? `<button type="button" class="btn btn-accent btn-lg" id="btn-retry">Powtórz błędne (${wrongIds.length})</button>` : ''}
        <button type="button" class="btn btn-primary btn-lg" id="btn-home-results">Wróć do menu</button>
        <button type="button" class="btn btn-secondary" id="btn-repeat-all">Powtórz cały test</button>
      </div>

      ${wrongQuestions.length ? `
      <div class="wrong-list">
        <h3>Pytania z błędną odpowiedzią</h3>
        ${wrongQuestions.slice(0, 8).map((q) => `
          <div class="wrong-item">
            <strong>#${q.id}</strong>
            <div>${escapeHtml(stripLatex(q.tresc_pl).slice(0, 140))}…</div>
          </div>`).join('')}
        ${wrongQuestions.length > 8 ? `<p style="font-size:0.85rem;color:var(--text-muted)">… i ${wrongQuestions.length - 8} więcej</p>` : ''}
      </div>` : ''}
    </div>
  `;

  document.getElementById('btn-home-results').addEventListener('click', () => navigate('home'));
  document.getElementById('btn-repeat-all').addEventListener('click', () => {
    startQuiz({
      mode: session.mode,
      sourceFile: session.sourceFile,
      sourceLabel: session.sourceLabel + ' (ponownie)',
    });
  });
  document.getElementById('btn-retry')?.addEventListener('click', () => {
    startQuiz({
      mode: 'retry',
      sourceFile: session.sourceFile,
      questionIds: shuffleArray(wrongIds),
      sourceLabel: `Powtórka błędnych · ${session.sourceLabel}`,
    });
  });
}

function renderLecturesList() {
  const groups = groupFiles(allQuestions);
  const ipynbFiles = groups.ipynb.map(([f]) => f);
  const pdfFiles = groups.pdf.map(([f]) => f);

  const ipynbTile = (file) => {
    const title = getNotebookTitle(file);
    return `
      <button type="button" class="tile tile-lecture" data-lecture="${escapeAttr(file)}">
        <div class="tile-header-row">
          <span class="tile-icon tile-icon-ipynb">📓</span>
          <span class="lecture-type-badge lecture-type-badge--ipynb">.ipynb</span>
        </div>
        <span class="tile-title">${escapeHtml(title)}</span>
        <span class="tile-meta"><span class="badge">${file}</span></span>
      </button>`;
  };

  const pdfTile = (file) => {
    const { fileUrl } = resolveMaterialUrl(file);
    return `
      <a class="tile tile-lecture" href="${escapeAttr(fileUrl)}" target="_blank" rel="noopener">
        <div class="tile-header-row">
          <span class="tile-icon tile-icon-pdf">📄</span>
          <span class="lecture-type-badge lecture-type-badge--pdf">.pdf</span>
        </div>
        <span class="tile-title">${escapeHtml(formatFileName(file))}</span>
        <span class="tile-meta"><span class="badge">${file}</span></span>
      </a>`;
  };

  main.innerHTML = `
    <header class="page-header">
      <h1>Wykłady</h1>
      <p>Przeglądaj materiały wykładowe — notebooki w aplikacji, PDF-y w nowej karcie.</p>
    </header>

    ${ipynbFiles.length ? `
    <section class="section-block">
      <h2 class="section-title">Notebooki Jupyter (.ipynb)</h2>
      <div class="tiles-grid">
        ${ipynbFiles.map(ipynbTile).join('')}
      </div>
    </section>` : ''}

    ${pdfFiles.length ? `
    <section class="section-block">
      <h2 class="section-title">Slajdy PDF (.pdf)</h2>
      <div class="tiles-grid">
        ${pdfFiles.map(pdfTile).join('')}
      </div>
    </section>` : ''}
  `;

  main.querySelectorAll('[data-lecture]').forEach((el) => {
    el.addEventListener('click', () => navigate(`lecture/${el.getAttribute('data-lecture')}`));
  });
}

async function renderLectureView(filename) {
  if (!filename) {
    navigate('lectures');
    return;
  }

  const meta = getNotebookTitle(filename);
  main.innerHTML = `
    <div class="lecture-view">
      <div class="lecture-toolbar">
        <button type="button" class="btn btn-secondary" id="btn-back-lectures">← Wykłady</button>
        <div>
          <span class="lecture-type-badge lecture-type-badge--ipynb">.ipynb</span>
          <h1 style="margin:0.35rem 0 0;font-size:1.15rem">${escapeHtml(meta)}</h1>
        </div>
      </div>
      <div class="loading-state"><div class="spinner"></div><p>Wczytywanie notebooka…</p></div>
    </div>
  `;

  document.getElementById('btn-back-lectures').addEventListener('click', () => navigate('lectures'));

  try {
    const nb = await fetchNotebook(filename);
    const content = document.createElement('div');
    content.className = 'lecture-content';
    renderNotebook(content, nb, 'lectures');
    const view = main.querySelector('.lecture-view');
    view.querySelector('.loading-state')?.remove();
    view.appendChild(content);
  } catch (err) {
    main.querySelector('.loading-state').innerHTML = `
      <p>Nie udało się wczytać wykładu: ${escapeHtml(err.message)}</p>`;
  }
}

function renderStats() {
  const ids = allQuestions.map((q) => q.id);
  const { attempted, mastered, total } = getGlobalStats(ids);
  const data = loadStorage();
  const completedSessions = data.sessions.filter((s) => s.status === 'completed').length;

  main.innerHTML = `
    <header class="page-header">
      <h1>Twój postęp</h1>
      <p>Statystyki zapisane lokalnie w tej przeglądarce.</p>
    </header>

    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value">${total}</div><div class="stat-label">Pytań w bazie</div></div>
      <div class="stat-card"><div class="stat-value">${attempted}</div><div class="stat-label">Próbowanych</div></div>
      <div class="stat-card"><div class="stat-value">${mastered}</div><div class="stat-label">Kiedykolwiek poprawnie</div></div>
      <div class="stat-card"><div class="stat-value">${completedSessions}</div><div class="stat-label">Ukończonych testów</div></div>
    </div>

    <button type="button" class="btn btn-secondary" id="btn-clear-stats">Wyczyść cały postęp</button>
  `;

  document.getElementById('btn-clear-stats').addEventListener('click', () => {
    if (confirm('Usunąć cały zapisany postęp? Tej operacji nie można cofnąć.')) {
      clearAllProgress();
      toast('Postęp wyczyszczony');
      renderStats();
    }
  });
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  toastContainer.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, '&quot;');
}

function stripLatex(text) {
  return String(text).replace(/\$[^$]+\$/g, '[…]').replace(/\$\$[^$]+\$\$/g, '[…]');
}