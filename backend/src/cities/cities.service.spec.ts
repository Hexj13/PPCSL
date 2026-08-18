import { CitiesService } from './cities.service';

describe('CitiesService', () => {
  const cache = {
    getAll: jest.fn().mockResolvedValue(null),
    setAll: jest.fn().mockResolvedValue(undefined),
  };
  const service = new CitiesService(cache);

  describe('findByName', () => {
    it('finds a city by official Romanian name', () => {
      expect(service.findByName('Chișinău')?.nameEn).toBe('Chisinau');
    });

    it('finds a city by ASCII English name', () => {
      expect(service.findByName('Chisinau')?.name).toBe('Chișinău');
    });

    it('finds Sîngera by the former Sângera spelling', () => {
      expect(service.findByName('Sângera')?.name).toBe('Sîngera');
      expect(service.findByName('Sangera')?.nameEn).toBe('Singera');
    });
  });
});
