const ALLOWED_TAGS = ['p', 'br', 'div', 'strong', 'em', 'i', 'b', 'u', 'ul', 'ol', 'li', 'font'];

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
    'a',
  ];

  dangerousTags.forEach((tag) => {
    const regex = new RegExp(`<${tag}[^>]*>.*?</${tag}>`, 'gis');
    sanitized = sanitized.replace(regex, '');
    const selfClosingRegex = new RegExp(`<${tag}[^>]*/?>`, 'gi');
    sanitized = sanitized.replace(selfClosingRegex, '');
  });

  const tagRegex = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
  sanitized = sanitized.replace(tagRegex, (match, tagName) => {
    const lowerTagName = tagName.toLowerCase();

    if (!ALLOWED_TAGS.includes(lowerTagName)) {
      return '';
    }

    if (match.startsWith('</')) {
      return `</${lowerTagName}>`;
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
