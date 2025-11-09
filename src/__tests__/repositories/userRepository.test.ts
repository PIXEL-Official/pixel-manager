import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Supabase first
vi.mock('../../database/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  },
}));

import { UserRepository } from '../../repositories/userRepository';

describe('UserRepository', () => {
  let repository: UserRepository;

  beforeEach(() => {
    repository = new UserRepository();
  });

  describe('constructor', () => {
    it('should create instance', () => {
      expect(repository).toBeInstanceOf(UserRepository);
    });
  });

  describe('methods', () => {
    it('should have createUser method', () => {
      expect(typeof repository.createUser).toBe('function');
    });

    it('should have getUserById method', () => {
      expect(typeof repository.getUserById).toBe('function');
    });

    it('should have updateUser method', () => {
      expect(typeof repository.updateUser).toBe('function');
    });

    it('should have deleteUser method', () => {
      expect(typeof repository.deleteUser).toBe('function');
    });

    it('should have userExists method', () => {
      expect(typeof repository.userExists).toBe('function');
    });

    it('should have getActiveUsers method', () => {
      expect(typeof repository.getActiveUsers).toBe('function');
    });

    it('should have getUsersToCheck method', () => {
      expect(typeof repository.getUsersToCheck).toBe('function');
    });

    it('should have getStats method', () => {
      expect(typeof repository.getStats).toBe('function');
    });
  });
});
