import { getApiErrorMessage } from './getApiErrorMessage';

describe('getApiErrorMessage', () => {
  it('returns fallback for unknown errors', () => {
    expect(getApiErrorMessage(null, 'fallback')).toBe('fallback');
  });

  it('returns string message from axios-like error', () => {
    const err = { response: { data: { message: 'Bad request' } } };
    expect(getApiErrorMessage(err, 'fallback')).toBe('Bad request');
  });
});
