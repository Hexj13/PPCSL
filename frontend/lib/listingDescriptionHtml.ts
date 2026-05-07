import createDOMPurify from 'dompurify';

type DomPurifyWindow = Parameters<typeof createDOMPurify>[0];

function isSafeHttpOrHttpsHref(href: string): boolean {
  try {
    const u = new URL(href);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function isSafeMailtoHref(href: string): boolean {
  const t = href.trim().toLowerCase();
  if (!t.startsWith('mailto:')) return false;
  if (t.includes('javascript:') || t.includes('data:')) return false;
  return t.length < 2048 && !t.includes('<');
}

function countChar(s: string, ch: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === ch) n++;
  }
  return n;
}

function normalizeUrlMatch(raw: string): { href: string; linkText: string; tail: string } | null {
  let core = raw;
  let tail = '';
  while (core.length > 0) {
    const last = core.slice(-1);
    if (last === ')') {
      if (countChar(core, ')') > countChar(core, '(')) {
        tail = last + tail;
        core = core.slice(0, -1);
        continue;
      }
      break;
    }
    if (last === ']') {
      if (countChar(core, ']') > countChar(core, '[')) {
        tail = last + tail;
        core = core.slice(0, -1);
        continue;
      }
      break;
    }
    if (last === '}') {
      if (countChar(core, '}') > countChar(core, '{')) {
        tail = last + tail;
        core = core.slice(0, -1);
        continue;
      }
      break;
    }
    if (!/[.,;:!?>\]}>»"'’”]/u.test(last)) break;
    tail = last + tail;
    core = core.slice(0, -1);
  }
  if (!core) return null;

  if (/^mailto:/i.test(core)) {
    if (!isSafeMailtoHref(core)) return null;
    return { href: core, linkText: core, tail };
  }

  const href = /^https?:\/\//i.test(core) ? core : /^www\./i.test(core) ? `https://${core}` : '';
  if (!href || !isSafeHttpOrHttpsHref(href)) return null;
  return { href, linkText: core, tail };
}

export function linkifyPlainUrlsInHtml(html: string, doc: Document): string {
  if (!html) return html;
  const container = doc.createElement('div');
  container.innerHTML = html;

  const textNodes: Text[] = [];
  const collect = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = (node as Text).parentElement;
      if (parent && !parent.closest('a')) {
        textNodes.push(node as Text);
      }
      return;
    }
    node.childNodes.forEach((c) => collect(c));
  };
  collect(container);

  const pattern = /https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|mailto:[^\s<>"']+/gi;

  for (const textNode of textNodes) {
    const text = textNode.textContent ?? '';
    pattern.lastIndex = 0;
    if (!pattern.test(text)) continue;
    pattern.lastIndex = 0;

    const frag = doc.createDocumentFragment();
    let lastIndex = 0;
    let matched = false;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(text)) !== null) {
      matched = true;
      const before = text.slice(lastIndex, m.index);
      if (before) {
        frag.appendChild(doc.createTextNode(before));
      }
      const parsed = normalizeUrlMatch(m[0]);
      if (parsed) {
        const a = doc.createElement('a');
        a.setAttribute('href', parsed.href);
        if (!parsed.href.toLowerCase().startsWith('mailto:')) {
          a.setAttribute('target', '_blank');
          a.setAttribute('rel', 'noopener noreferrer');
        }
        a.textContent = parsed.linkText;
        frag.appendChild(a);
        if (parsed.tail) {
          frag.appendChild(doc.createTextNode(parsed.tail));
        }
      } else {
        frag.appendChild(doc.createTextNode(m[0]));
      }
      lastIndex = m.index + m[0].length;
    }
    if (!matched) continue;
    const rest = text.slice(lastIndex);
    if (rest) {
      frag.appendChild(doc.createTextNode(rest));
    }
    textNode.parentNode?.replaceChild(frag, textNode);
  }

  return container.innerHTML;
}

function hardenExistingLinksInHtml(html: string, doc: Document): string {
  if (!html) return html;
  const container = doc.createElement('div');
  container.innerHTML = html;
  container.querySelectorAll('a').forEach((a) => {
    const href = a.getAttribute('href') ?? '';
    const target = a.getAttribute('target') ?? '';
    if (target.toLowerCase() === '_blank' || isSafeHttpOrHttpsHref(href)) {
      a.setAttribute('rel', 'noopener noreferrer');
    }
  });
  return container.innerHTML;
}

export function prepareListingDescriptionHtml(raw: string, win: Window): string {
  const DOMPurify = createDOMPurify(win as unknown as DomPurifyWindow);
  const sanitized = DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: ['p', 'br', 'div', 'strong', 'em', 'i', 'b', 'u', 'ul', 'ol', 'li', 'font', 'a'],
    ALLOWED_ATTR: ['size', 'href', 'target', 'rel'],
    ALLOWED_URI_REGEXP: /^(?:https?:\/\/|mailto:)/i,
  });
  return linkifyPlainUrlsInHtml(hardenExistingLinksInHtml(sanitized, win.document), win.document);
}
