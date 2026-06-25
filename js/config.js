export const MASCOT_URL = 'assets/20230630_110304.jpg';

/** @param {string} filename */
export function resolveMaterialUrl(filename) {
  if (filename.endsWith('.ipynb')) {
    return { type: 'ipynb', viewUrl: `#lecture/${filename}`, fileUrl: `lectures/${encodeURIComponent(filename)}` };
  }
  if (filename.endsWith('.pdf')) {
    return { type: 'pdf', viewUrl: `lectures/${encodeURIComponent(filename)}`, fileUrl: `lectures/${encodeURIComponent(filename)}` };
  }
  return { type: 'other', viewUrl: null, fileUrl: null };
}

export function isMastered(progressPct) {
  return progressPct >= 100;
}
