const OPTION_KEYS = ['a', 'b', 'c', 'd'];
const DISPLAY_LABELS = ['A', 'B', 'C', 'D'];

/** Fisher–Yates shuffle (returns new array). */
export function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * @param {{ odp_a_pl: string, odp_b_pl: string, odp_c_pl: string, odp_d_pl: string, poprawna_odpowiedz: string }} question
 * @returns {{ label: string, originalKey: string, text: string }[]}
 */
export function shuffleOptions(question) {
  const options = OPTION_KEYS.map((key, i) => ({
    originalKey: key,
    text: question[`odp_${key}_pl`] ?? '',
    label: DISPLAY_LABELS[i],
  }));
  const shuffled = shuffleArray(options);
  return shuffled.map((opt, i) => ({ ...opt, label: DISPLAY_LABELS[i] }));
}

/** @param {object[]} questions @param {string | null} fileFilter */
export function filterQuestions(questions, fileFilter) {
  if (!fileFilter) return [...questions];
  return questions.filter((q) => q.nazwa_pliku === fileFilter);
}

/** @param {number[]} ids @param {object[]} allQuestions */
export function questionsByIds(allQuestions, ids) {
  const map = new Map(allQuestions.map((q) => [q.id, q]));
  return ids.map((id) => map.get(id)).filter(Boolean);
}

/** @param {Record<number, { isCorrect: boolean }>} answers @param {number[]} questionIds */
export function computeResults(questionIds, answers) {
  let correct = 0;
  const wrongIds = [];
  for (const id of questionIds) {
    const a = answers[id];
    if (a?.isCorrect) correct += 1;
    else wrongIds.push(id);
  }
  const total = questionIds.length;
  const pct = total ? Math.round((correct / total) * 100) : 0;
  return { correct, total, pct, wrongIds };
}

export function createSessionId() {
  return crypto.randomUUID?.() ?? `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Friendly display name for source files. */
export function formatFileName(filename) {
  const map = {
    '08_Regresja_liniowa.ipynb': 'Regresja liniowa',
    '05_Geste_wektory.ipynb': 'Gęste reprezentacje wektorowe',
    '14_pretrenowanie.ipynb': 'Pretrenowanie modeli',
    '15_transformer.ipynb': 'Sieci Transformer',
    'Grali.pdf': 'NLP - synteza',
    'Palub.pdf': 'Deep Learning - synteza',
    'DL1.pdf': 'DL1 - Wprowadzenie (CV i Deep Learning)',
    'regresja-logistyczna.pdf': 'Regresja logistyczna I',
    'regresja-logistyczna2.pdf': 'Regresja logistyczna II',
  };
  if (map[filename]) return map[filename];
  if (filename.endsWith('.ipynb')) return filename.replace('.ipynb', '').replace(/_/g, ' ');
  if (filename.endsWith('.pdf')) return filename.replace('.pdf', '');
  return filename;
}

export function fileIcon(filename) {
  if (filename.endsWith('.ipynb')) return '📓';
  if (filename.endsWith('.pdf')) return '📄';
  return '📋';
}

export function groupFiles(questions) {
  /** @type {Map<string, number>} */
  const counts = new Map();
  for (const q of questions) {
    counts.set(q.nazwa_pliku, (counts.get(q.nazwa_pliku) ?? 0) + 1);
  }
  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const ipynb = entries.filter(([f]) => f.endsWith('.ipynb'));
  const pdf = entries.filter(([f]) => f.endsWith('.pdf'));
  const other = entries.filter(([f]) => !f.endsWith('.ipynb') && !f.endsWith('.pdf'));
  return { ipynb, pdf, other, all: entries };
}
