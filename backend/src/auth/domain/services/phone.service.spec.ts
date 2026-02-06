import { PhoneService } from './phone.service';

describe('PhoneService', () => {
  let service: PhoneService;

  beforeEach(() => {
    service = new PhoneService();
  });

  describe('normalize', () => {
    it('should add +373 for local number starting with 0', () => {
      expect(service.normalize('069123456')).toBe('+37369123456');
    });

    it('should add +373 for number without prefix', () => {
      expect(service.normalize('69123456')).toBe('+37369123456');
    });

    it('should keep +373 prefix', () => {
      expect(service.normalize('+37369123456')).toBe('+37369123456');
    });

    it('should remove spaces and dashes', () => {
      expect(service.normalize('069 123 456')).toBe('+37369123456');
      expect(service.normalize('069-123-456')).toBe('+37369123456');
      expect(service.normalize('(069) 123-456')).toBe('+37369123456');
    });
  });

  describe('isValid', () => {
    it('should return true for valid Moldova number', () => {
      expect(service.isValid('+37369123456')).toBe(true);
      expect(service.isValid('069123456')).toBe(true);
    });

    it('should return false for non-Moldova prefix', () => {
      expect(service.isValid('+38069123456')).toBe(false);
    });

    it('should return false for too short number', () => {
      expect(service.isValid('+373123')).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true when normalized forms match', () => {
      expect(service.equals('069123456', '+37369123456')).toBe(true);
      expect(service.equals('069 123 456', '69123456')).toBe(true);
    });

    it('should return false when different', () => {
      expect(service.equals('069123456', '069123457')).toBe(false);
    });
  });
});
