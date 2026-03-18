import { mapDriveType } from './enum-mapper';

describe('enum-mapper', () => {
  describe('mapDriveType', () => {
    it('maps Față to FWD', () => {
      expect(mapDriveType('Față')).toBe('FWD');
    });

    it('maps Spate to RWD', () => {
      expect(mapDriveType('Spate')).toBe('RWD');
    });

    it('maps 4x4 to AWD', () => {
      expect(mapDriveType('4x4')).toBe('AWD');
    });

    it('maps quattro to AWD', () => {
      expect(mapDriveType('quattro')).toBe('AWD');
    });

    it('maps xDrive to AWD', () => {
      expect(mapDriveType('xDrive')).toBe('AWD');
    });

    it('maps 4matic to AWD', () => {
      expect(mapDriveType('4matic')).toBe('AWD');
    });

    it('maps 4x2 with front traction to FWD', () => {
      expect(mapDriveType('4x2 Față')).toBe('FWD');
    });
  });
});
