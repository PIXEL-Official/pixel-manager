import { describe, it, expect } from 'vitest';
import { logger, LogLevel } from '../../utils/logger';

describe('Logger', () => {
  describe('basic methods', () => {
    it('should have info method', () => {
      expect(typeof logger.info).toBe('function');
      // Just call it to verify no errors
      logger.info('Test info');
    });

    it('should have warn method', () => {
      expect(typeof logger.warn).toBe('function');
      logger.warn('Test warn');
    });

    it('should have error method', () => {
      expect(typeof logger.error).toBe('function');
      logger.error('Test error');
    });

    it('should have success method', () => {
      expect(typeof logger.success).toBe('function');
      logger.success('Test success');
    });
  });

  describe('voice methods', () => {
    it('should have voiceJoin method', () => {
      expect(typeof logger.voiceJoin).toBe('function');
    });

    it('should have voiceLeave method', () => {
      expect(typeof logger.voiceLeave).toBe('function');
    });
  });

  describe('warning methods', () => {
    it('should have warningSent method', () => {
      expect(typeof logger.warningSent).toBe('function');
    });

    it('should have warningFailed method', () => {
      expect(typeof logger.warningFailed).toBe('function');
    });
  });

  describe('kick methods', () => {
    it('should have userKicked method', () => {
      expect(typeof logger.userKicked).toBe('function');
    });

    it('should have kickFailed method', () => {
      expect(typeof logger.kickFailed).toBe('function');
    });
  });

  describe('check methods', () => {
    it('should have checkStarted method', () => {
      expect(typeof logger.checkStarted).toBe('function');
    });

    it('should have checkCompleted method', () => {
      expect(typeof logger.checkCompleted).toBe('function');
    });
  });

  describe('member methods', () => {
    it('should have newMemberAdded method', () => {
      expect(typeof logger.newMemberAdded).toBe('function');
    });
  });

  describe('database methods', () => {
    it('should have dbError method', () => {
      expect(typeof logger.dbError).toBe('function');
    });
  });

  describe('LogLevel enum', () => {
    it('should export LogLevel enum', () => {
      expect(LogLevel.INFO).toBe('INFO');
      expect(LogLevel.WARN).toBe('WARN');
      expect(LogLevel.ERROR).toBe('ERROR');
      expect(LogLevel.SUCCESS).toBe('SUCCESS');
    });
  });
});

