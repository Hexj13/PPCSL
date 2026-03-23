import { sanitizeHtml } from './html-sanitizer';

describe('sanitizeHtml', () => {
  it('escapes ampersands in anchor href with query string exactly once', () => {
    const input = '<p><a href="https://example.com?x=1&y=2">link</a></p>';
    const out = sanitizeHtml(input);
    expect(out).toContain('href="https://example.com?x=1&amp;y=2"');
    expect(out).not.toContain('&amp;amp;');
  });

  it('does not double-escape entity-encoded ampersands in anchor href', () => {
    const input = '<p><a href="https://example.com?x=1&amp;y=2">link</a></p>';
    const out = sanitizeHtml(input);
    expect(out).toContain('href="https://example.com?x=1&amp;y=2"');
    expect(out).not.toContain('&amp;amp;');
  });
});
