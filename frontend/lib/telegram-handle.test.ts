import { telegramHandleFromUrl } from './telegram-handle';

describe('telegramHandleFromUrl', () => {
  it('extracts the username from a t.me link', () => {
    expect(telegramHandleFromUrl('https://t.me/example_bot')).toBe('@example_bot');
  });

  it('extracts the domain query from a tg resolve URL', () => {
    expect(telegramHandleFromUrl('tg://resolve?domain=example_bot')).toBe('@example_bot');
  });

  it('returns a handle when the value is already a username', () => {
    expect(telegramHandleFromUrl('example_bot')).toBe('@example_bot');
  });
});
