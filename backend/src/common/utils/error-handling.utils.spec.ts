import { removePasswordFromUser } from './error-handling.utils';

describe('removePasswordFromUser', () => {
  it('removes password and social authentication identifiers', () => {
    expect(
      removePasswordFromUser({
        id: 'user-1',
        email: 'user@example.com',
        password: 'hash',
        googleId: 'google-1',
        telegramId: 'telegram-1',
        telegramUsername: 'user',
        facebookId: 'facebook-1',
        authProvider: 'facebook',
      }),
    ).toEqual({
      id: 'user-1',
      email: 'user@example.com',
    });
  });
});
