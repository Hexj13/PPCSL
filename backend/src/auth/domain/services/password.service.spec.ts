import * as bcrypt from 'bcrypt';

import { PasswordService } from './password.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PasswordService();
  });

  describe('hash', () => {
    it('should hash password with salt rounds 10', async () => {
      const hashed = '$2b$10$hashed';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashed);

      const result = await service.hash('plainPassword');

      expect(bcrypt.hash).toHaveBeenCalledWith('plainPassword', 10);
      expect(result).toBe(hashed);
    });
  });

  describe('verify', () => {
    it('should return true when password matches hash', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.verify('password', '$2b$10$hash');

      expect(bcrypt.compare).toHaveBeenCalledWith('password', '$2b$10$hash');
      expect(result).toBe(true);
    });

    it('should return false when password does not match', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.verify('wrong', '$2b$10$hash');

      expect(result).toBe(false);
    });
  });
});
