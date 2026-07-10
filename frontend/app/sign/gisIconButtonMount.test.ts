import { buildGisButtonOptions } from './gisIconButtonMount';

describe('buildGisButtonOptions', () => {
  it('creates a native Google icon button configuration', () => {
    const onClick = jest.fn();

    expect(buildGisButtonOptions(onClick)).toEqual({
      type: 'icon',
      theme: 'outline',
      size: 'large',
      click_listener: onClick,
    });
  });
});
