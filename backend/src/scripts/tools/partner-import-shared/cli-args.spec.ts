import { readFlagValue } from './cli-args';

describe('readFlagValue', () => {
  it('reads space-separated values', () => {
    const args = ['--partner', 'autooutlet', '--userId', 'abc'];
    expect(readFlagValue(args, 0, '--partner')).toEqual({
      value: 'autooutlet',
      nextIndex: 1,
    });
    expect(readFlagValue(args, 2, '--userId')).toEqual({
      value: 'abc',
      nextIndex: 3,
    });
  });

  it('reads equals-separated values', () => {
    const args = ['--partner=autooutlet', '--userId=abc'];
    expect(readFlagValue(args, 0, '--partner')).toEqual({
      value: 'autooutlet',
      nextIndex: 0,
    });
    expect(readFlagValue(args, 1, '--userId')).toEqual({
      value: 'abc',
      nextIndex: 1,
    });
  });

  it('rejects missing or empty values', () => {
    expect(readFlagValue(['--partner'], 0, '--partner')).toBeNull();
    expect(readFlagValue(['--partner', '--dry-run'], 0, '--partner')).toBeNull();
    expect(readFlagValue(['--partner='], 0, '--partner')).toBeNull();
    expect(readFlagValue(['--env', 'prod'], 0, '--partner')).toBeNull();
  });
});
