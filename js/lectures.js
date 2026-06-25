import { renderMarkdown } from './math.js';
import { formatFileName } from './quiz.js';

export const NOTEBOOK_TITLES = {
  '08_Regresja_liniowa.ipynb': 'Regresja liniowa',
  '05_Geste_wektory.ipynb': 'Gęste reprezentacje wektorowe',
  '14_pretrenowanie.ipynb': 'Pretrenowanie modeli',
  '15_transformer.ipynb': 'Sieci Transformer',
};

/** @param {string} filename */
export function getNotebookTitle(filename) {
  return NOTEBOOK_TITLES[filename] ?? formatFileName(filename);
}

/** @param {string} filename */
export async function fetchNotebook(filename) {
  const res = await fetch(`lectures/${encodeURIComponent(filename)}`);
  if (!res.ok) throw new Error(`Nie udało się wczytać wykładu (${res.status})`);
  return res.json();
}

/** @param {HTMLElement} container @param {object} notebook @param {string} basePath */
export function renderNotebook(container, notebook, basePath) {
  container.innerHTML = '';
  const cells = notebook.cells ?? [];

  for (const cell of cells) {
    const wrap = document.createElement('div');
    wrap.className = 'notebook-cell';

    const source = Array.isArray(cell.source) ? cell.source.join('') : String(cell.source ?? '');

    if (cell.cell_type === 'markdown') {
      const md = document.createElement('div');
      md.className = 'notebook-md';
      renderMarkdown(md, rewriteImagePaths(source, basePath));
      wrap.appendChild(md);
    } else if (cell.cell_type === 'code') {
      const pre = document.createElement('pre');
      pre.className = 'notebook-code';
      pre.textContent = source.trim() || '# (pusta komórka)';
      wrap.appendChild(pre);
    } else {
      continue;
    }

    container.appendChild(wrap);
  }
}

function rewriteImagePaths(md, basePath) {
  return md.replace(
    /!\[([^\]]*)\]\((\.\/[^)]+)\)/g,
    (_, alt, rel) => `![${alt}](${basePath}/${rel.replace(/^\.\//, '')})`,
  );
}
