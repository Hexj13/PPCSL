import { linkifyPlainUrlsInHtml, prepareListingDescriptionHtml } from './listingDescriptionHtml';

describe('linkifyPlainUrlsInHtml', () => {
  it('keeps balanced closing paren in Wikipedia-style URLs', () => {
    const html = '<p>See https://en.wikipedia.org/wiki/Example_(disambiguation) for details.</p>';
    const out = linkifyPlainUrlsInHtml(html, document);
    expect(out).toContain('href="https://en.wikipedia.org/wiki/Example_(disambiguation)"');
    expect(out).not.toMatch(/Example_\(disambiguation<\/a>\)/);
  });

  it('strips a closing paren that is not part of the URL', () => {
    const html = '<p>(https://example.com/path)</p>';
    const out = linkifyPlainUrlsInHtml(html, document);
    expect(out).toContain('href="https://example.com/path"');
    expect(out).toContain(')</p>');
  });

  it('strips trailing period after a URL with balanced parens', () => {
    const html = '<p>Link https://en.wikipedia.org/wiki/Example_(disambiguation).</p>';
    const out = linkifyPlainUrlsInHtml(html, document);
    expect(out).toContain('href="https://en.wikipedia.org/wiki/Example_(disambiguation)"');
    expect(out).toMatch(/disambiguation\)<\/a>\./);
  });
});

describe('prepareListingDescriptionHtml', () => {
  it('adds noopener noreferrer to existing blank links', () => {
    const html = '<p><a href="https://example.com" target="_blank">Example</a></p>';
    const out = prepareListingDescriptionHtml(html, window);
    expect(out).toContain('rel="noopener noreferrer"');
  });
});
