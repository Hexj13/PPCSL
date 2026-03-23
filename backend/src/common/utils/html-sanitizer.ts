const ALLOWED_TAGS = [
  'p',
  'br',
  'div',
  'strong',
  'em',
  'i',
  'b',
  'u',
  'ul',
  'ol',
  'li',
  'font',
  'a',
];

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function decodeHtmlAttrValue(value: string): string {
  let s = value;
  let prev = '';
  while (s !== prev) {
    prev = s;
    s = s
      .replace(/&quot;/gi, '"')
      .replace(/&#x27;/gi, "'")
      .replace(/&#39;/g, "'")
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&amp;/g, '&');
  }
  return s;
}

function isSafeListingHref(href: string): boolean {
  const t = href.trim();
  if (!t || /javascript:/i.test(t) || /data:/i.test(t)) return false;
  if (/^mailto:/i.test(t)) {
    return t.length < 2048 && !t.includes('<');
  }
  try {
    const u = new URL(t);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function unwrapUnsafeAnchorTags(html: string): string {
  return html.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, (full) => {
    const hrefMatch = full.match(/\bhref\s*=\s*["']([^"']*)["']/i);
    const hrefEncoded = hrefMatch ? hrefMatch[1].trim() : '';
    const href = decodeHtmlAttrValue(hrefEncoded);
    const innerMatch = full.match(/^<a\b[^>]*>([\s\S]*)<\/a>$/i);
    const inner = innerMatch ? innerMatch[1] : '';
    if (isSafeListingHref(href)) {
      return full;
    }
    return inner;
  });
}

const EMPTY_BLOCK_CONTENT = '(?:(?:<\\s*br\\s*\\/?>)|&nbsp;|\\s)*';
const EMPTY_BLOCK_PATTERN = `\\s*<\\s*(?:p|div)(?:\\s[^>]*)?>\\s*${EMPTY_BLOCK_CONTENT}\\s*<\\s*\\/(?:p|div)\\s*>\\s*`;
const LEADING_EMPTY_BLOCKS = new RegExp(`^(?:${EMPTY_BLOCK_PATTERN})+`, 'i');
const TRAILING_EMPTY_BLOCKS = new RegExp(`(?:${EMPTY_BLOCK_PATTERN})+$`, 'i');

export function normalizeDescriptionHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';
  return html.trim().replace(LEADING_EMPTY_BLOCKS, '').replace(TRAILING_EMPTY_BLOCKS, '').trim();
}

export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  let sanitized = html;

  const dangerousTags = [
    'script',
    'iframe',
    'object',
    'embed',
    'link',
    'meta',
    'img',
    'style',
    'form',
    'input',
    'button',
  ];

  dangerousTags.forEach((tag) => {
    const regex = new RegExp(`<${tag}[^>]*>.*?</${tag}>`, 'gis');
    sanitized = sanitized.replace(regex, '');
    const selfClosingRegex = new RegExp(`<${tag}[^>]*/?>`, 'gi');
    sanitized = sanitized.replace(selfClosingRegex, '');
  });

  sanitized = unwrapUnsafeAnchorTags(sanitized);

  const tagRegex = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
  sanitized = sanitized.replace(tagRegex, (match, tagName) => {
    const lowerTagName = tagName.toLowerCase();

    if (!ALLOWED_TAGS.includes(lowerTagName)) {
      return '';
    }

    if (match.startsWith('</')) {
      return `</${lowerTagName}>`;
    }

    if (lowerTagName === 'a') {
      const hrefMatch = match.match(/\bhref\s*=\s*["']([^"']*)["']/i);
      const hrefEncoded = hrefMatch ? hrefMatch[1].trim() : '';
      const href = decodeHtmlAttrValue(hrefEncoded);
      if (!isSafeListingHref(href)) {
        return '';
      }
      const esc = escapeHtmlAttr(href);
      const isMail = href.toLowerCase().startsWith('mailto:');
      const extra = isMail ? '' : ' target="_blank" rel="noopener noreferrer"';
      return `<a href="${esc}"${extra}>`;
    }

    const attributeRegex = /(\w+)(?:=["']([^"']*)["'])?/g;
    let attributes = '';
    let attrMatch;

    while ((attrMatch = attributeRegex.exec(match)) !== null) {
      const attrName = attrMatch[1].toLowerCase();
      const attrValue = attrMatch[2] || '';

      if (lowerTagName === 'font' && attrName === 'size') {
        const size = parseInt(attrValue, 10);
        if (size >= 2 && size <= 7) {
          attributes += ` ${attrName}="${attrValue}"`;
        }
      }
    }

    return `<${lowerTagName}${attributes}>`;
  });

  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/javascript:/gi, '');

  return sanitized;
}
