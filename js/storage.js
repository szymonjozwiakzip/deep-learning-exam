const STORAGE_KEY = 'dl-exam-platform-v1';

/** @typedef {{ selectedKey: string, isCorrect: boolean, at: string }} StoredAnswer */
/** @typedef {{ label: string, originalKey: string, text: string }} ShuffledOption */
/** @typedef {{
 *   id: string,
 *   mode: 'all' | 'file' | 'retry',
 *   sourceLabel: string,
 *   sourceFile: string | null,
 *   questionIds: number[],
 *   shuffles: Record<number, ShuffledOption[]>,
 *   answers: Record<number, StoredAnswer>,
 *   currentIndex: number,
 *   status: 'in-progress' | 'completed',
 *   startedAt: string,
 *   completedAt: string | null
 * }} QuizSession */

/** @typedef {{
 *   sessions: QuizSession[],
 *   activeSessionId: string | null,
 *   questionStats: Record<number, { attempts: number, correct: number, lastAt: string | null }>
 * }} AppStorage */

/** @returns {AppStorage} */
export function loadStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStorage();
    const parsed = JSON.parse(raw);
    return {
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      activeSessionId: parsed.activeSessionId ?? null,
      questionStats: parsed.questionStats ?? {},
    };
  } catch {
    return defaultStorage();
  }
}

function defaultStorage() {
  return {
    sessions: [],
    activeSessionId: null,
    questionStats: {},
  };
}

/** @param {AppStorage} data */
export function saveStorage(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/** @param {QuizSession} session */
export function upsertSession(session) {
  const data = loadStorage();
  const idx = data.sessions.findIndex((s) => s.id === session.id);
  if (idx >= 0) data.sessions[idx] = session;
  else data.sessions.unshift(session);
  // keep last 30 sessions
  if (data.sessions.length > 30) data.sessions = data.sessions.slice(0, 30);
  data.activeSessionId = session.status === 'in-progress' ? session.id : data.activeSessionId;
  saveStorage(data);
  return data;
}

/** @param {string} sessionId */
export function setActiveSession(sessionId) {
  const data = loadStorage();
  data.activeSessionId = sessionId;
  saveStorage(data);
}

export function clearActiveSession() {
  const data = loadStorage();
  data.activeSessionId = null;
  saveStorage(data);
}

/** @returns {QuizSession | null} */
export function getActiveSession() {
  const data = loadStorage();
  if (!data.activeSessionId) return null;
  return data.sessions.find((s) => s.id === data.activeSessionId) ?? null;
}

/** @param {number} questionId @param {boolean} isCorrect */
export function recordQuestionStat(questionId, isCorrect) {
  const data = loadStorage();
  const prev = data.questionStats[questionId] ?? { attempts: 0, correct: 0, lastAt: null };
  prev.attempts += 1;
  if (isCorrect) prev.correct += 1;
  prev.lastAt = new Date().toISOString();
  data.questionStats[questionId] = prev;
  saveStorage(data);
}

export function getGlobalStats(questionIds) {
  const data = loadStorage();
  let attempted = 0;
  let mastered = 0;
  for (const id of questionIds) {
    const s = data.questionStats[id];
    if (s && s.attempts > 0) {
      attempted += 1;
      if (s.correct > 0) mastered += 1;
    }
  }
  return { attempted, mastered, total: questionIds.length };
}

export function getFileProgress(questionIds) {
  const { attempted, mastered, total } = getGlobalStats(questionIds);
  return total ? Math.round((mastered / total) * 100) : 0;
}

export function clearAllProgress() {
  saveStorage(defaultStorage());
}
