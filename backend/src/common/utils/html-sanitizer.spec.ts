import { sanitizeHtml } from './html-sanitizer';

describe('sanitizeHtml', () => {
  it('should return empty string for null or undefined', () => {
    expect(sanitizeHtml(null as unknown as string)).toBe('');
    expect(sanitizeHtml(undefined as unknown as string)).toBe('');
  });

  it('should return empty string for non-string input', () => {
    expect(sanitizeHtml(123 as unknown as string)).toBe('');
    expect(sanitizeHtml({} as unknown as string)).toBe('');
    expect(sanitizeHtml([] as unknown as string)).toBe('');
  });

  it('should allow safe HTML tags', () => {
    const input = '<p>Test</p><br/><strong>Bold</strong><em>Italic</em><u>Underline</u>';
    const result = sanitizeHtml(input);
    expect(result).toContain('<p>');
    expect(result).toContain('<br>');
    expect(result).toContain('<strong>');
    expect(result).toContain('<em>');
    expect(result).toContain('<u>');
  });

  it('should allow lists', () => {
    const input = '<ul><li>Item 1</li><li>Item 2</li></ul><ol><li>Ordered 1</li></ol>';
    const result = sanitizeHtml(input);
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>');
    expect(result).toContain('<ol>');
  });

  it('should allow font tag with size attribute', () => {
    const input = '<font size="3">Text</font>';
    const result = sanitizeHtml(input);
    expect(result).toContain('<font');
    expect(result).toContain('size="3"');
  });

  it('should remove dangerous HTML tags with content', () => {
    const input = '<script>alert("xss")</script><p>Safe</p>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert');
    expect(result).not.toContain('xss');
    expect(result).toContain('<p>');
    expect(result).toContain('Safe');
  });

  it('should remove iframe tags with content', () => {
    const input = '<iframe src="evil.com">Content</iframe><p>Safe</p>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<iframe>');
    expect(result).not.toContain('evil.com');
    expect(result).not.toContain('Content');
    expect(result).toContain('<p>');
    expect(result).toContain('Safe');
  });

  it('should remove object and embed tags', () => {
    const input =
      '<object data="evil.swf">Content</object><embed src="evil.swf"></embed><p>Safe</p>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<object>');
    expect(result).not.toContain('<embed>');
    expect(result).not.toContain('evil.swf');
    expect(result).toContain('<p>');
    expect(result).toContain('Safe');
  });

  it('should remove on* event handlers', () => {
    const input = '<p onclick="alert(1)">Test</p>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('onclick');
    expect(result).not.toContain('alert');
    expect(result).toContain('<p>');
    expect(result).toContain('Test');
  });

  it('should remove style attributes', () => {
    const input = '<p style="color: red">Test</p>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('style=');
    expect(result).toContain('<p>');
    expect(result).toContain('Test');
  });

  it('should remove javascript: protocol', () => {
    const input = '<a href="javascript:alert(1)">Link</a>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('javascript:');
    expect(result).not.toContain('<a>');
    expect(result).not.toContain('Link');
  });

  it('should remove img tags', () => {
    const input = '<img src="evil.jpg" onerror="alert(1)"><p>Safe</p>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<img>');
    expect(result).not.toContain('evil.jpg');
    expect(result).toContain('<p>');
    expect(result).toContain('Safe');
  });

  it('should remove link tags', () => {
    const input = '<link rel="stylesheet" href="evil.css"><p>Safe</p>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<link>');
    expect(result).not.toContain('evil.css');
    expect(result).toContain('<p>');
    expect(result).toContain('Safe');
  });

  it('should remove meta tags', () => {
    const input = '<meta http-equiv="refresh" content="0;url=evil.com"><p>Safe</p>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<meta>');
    expect(result).not.toContain('evil.com');
    expect(result).toContain('<p>');
    expect(result).toContain('Safe');
  });

  it('should preserve text content', () => {
    const input = '<p>Hello <strong>World</strong></p>';
    const result = sanitizeHtml(input);
    expect(result).toContain('Hello');
    expect(result).toContain('World');
  });

  it('should handle nested safe tags', () => {
    const input = '<p><strong><em>Nested</em></strong></p>';
    const result = sanitizeHtml(input);
    expect(result).toContain('<p>');
    expect(result).toContain('<strong>');
    expect(result).toContain('<em>');
  });

  it('should handle empty tags', () => {
    const input = '<p></p><br/>';
    const result = sanitizeHtml(input);
    expect(result).toContain('<p>');
    expect(result).toContain('<br>');
  });

  it('should validate font size attribute', () => {
    const validInput = '<font size="2">Small</font><font size="5">Large</font>';
    const result = sanitizeHtml(validInput);
    expect(result).toContain('size="2"');
    expect(result).toContain('size="5"');
  });

  it('should reject invalid font size', () => {
    const invalidInput = '<font size="1">Too small</font><font size="8">Too large</font>';
    const result = sanitizeHtml(invalidInput);
    expect(result).not.toContain('size="1"');
    expect(result).not.toContain('size="8"');
  });

  it('should handle mixed safe and dangerous content', () => {
    const input = '<p>Safe</p><script>alert("xss")</script><strong>Bold</strong>';
    const result = sanitizeHtml(input);
    expect(result).toContain('<p>');
    expect(result).toContain('<strong>');
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert');
  });

  it('should handle plain text without tags', () => {
    const input = 'Just plain text';
    const result = sanitizeHtml(input);
    expect(result).toBe('Just plain text');
  });

  it('should handle complex real-world example', () => {
    const input =
      '<p>Well maintained vehicle with <strong>full service history</strong>.</p><ul><li>No accidents</li><li>Garage kept</li></ul><script>stealData()</script>';
    const result = sanitizeHtml(input);
    expect(result).toContain('<p>');
    expect(result).toContain('<strong>');
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>');
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('stealData');
  });
});
