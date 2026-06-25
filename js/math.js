/** Escape HTML entities before injecting user content. */
export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Render LaTeX in element using KaTeX auto-render. */
export function renderMath(element) {
  if (!element || typeof renderMathInElement !== 'function') return;
  renderMathInElement(element, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '$', right: '$', display: false },
      { left: '\\(', right: '\\)', display: false },
      { left: '\\[', right: '\\]', display: true },
    ],
    throwOnError: false,
    strict: false,
    trust: false,
  });
}

/** Set text content safely then render math. */
export function setMathContent(element, text) {
  element.innerHTML = escapeHtml(text ?? '');
  renderMath(element);
}

/** Render markdown (lectures) then math. */
export function renderMarkdown(element, markdown) {
  if (typeof marked !== 'undefined') {
    marked.setOptions({ breaks: true, gfm: true });
    element.innerHTML = marked.parse(markdown ?? '');
  } else {
    element.innerHTML = escapeHtml(markdown ?? '').replace(/\n/g, '<br>');
  }
  renderMath(element);
}
