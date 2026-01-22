import { expect } from 'chai';
import 'mocha';
import { isISO8601 } from '@tsoa/cli/utils/validatorUtils';

describe('isISO8601', () => {
  describe('Valid ISO 8601 dates', () => {
    it('should accept valid date-only format (YYYY-MM-DD)', () => {
      expect(isISO8601('2017-05-14')).to.be.true;
      expect(isISO8601('2020-01-01')).to.be.true;
      expect(isISO8601('2025-12-31')).to.be.true;
    });

    it('should accept valid datetime with T separator', () => {
      expect(isISO8601('2017-05-14T05:18Z')).to.be.true;
      expect(isISO8601('2020-01-01T00:00:00Z')).to.be.true;
      expect(isISO8601('2025-12-31T23:59:59Z')).to.be.true;
    });

    it('should accept datetime with milliseconds', () => {
      expect(isISO8601('2020-01-01T12:30:45.123Z')).to.be.true;
      expect(isISO8601('2020-01-01T12:30:45.999Z')).to.be.true;
    });

    it('should accept datetime with timezone offsets', () => {
      expect(isISO8601('2020-01-01T12:00:00+02:00')).to.be.true;
      expect(isISO8601('2020-01-01T12:00:00-05:00')).to.be.true;
    });

    it('should accept leap year dates', () => {
      expect(isISO8601('2020-02-29')).to.be.true; // 2020 is a leap year
      expect(isISO8601('2000-02-29')).to.be.true; // 2000 is a leap year (divisible by 400)
    });

    it('should accept ordinal dates (YYYY-DDD format)', () => {
      expect(isISO8601('2009-123')).to.be.true; // Day 123 of 2009
      expect(isISO8601('2009-222')).to.be.true; // Day 222 of 2009
    });

    it('should accept ordinal dates for leap years', () => {
      expect(isISO8601('2020-366')).to.be.true; // 2020 is a leap year with 366 days
      expect(isISO8601('2400-366')).to.be.true; // 2400 is a leap year
    });
  });

  describe('Invalid ISO 8601 dates', () => {
    it('should reject invalid date formats', () => {
      expect(isISO8601('2020/01/01')).to.be.false; // wrong separator
      expect(isISO8601('01-01-2020')).to.be.false; // wrong order
      expect(isISO8601('2020-1-1')).to.be.false; // missing leading zeros
      expect(isISO8601('not-a-date')).to.be.false;
    });

    it('should reject datetime with different separator instead of T', () => {
      expect(isISO8601('2020-01-01 12:00:00Z')).to.be.false;
      expect(isISO8601('2020-01-01X12:00:00Z')).to.be.false;
    });

    it('should reject invalid dates', () => {
      expect(isISO8601('2020-02-31')).to.be.false; // February doesn't have 31 days
      expect(isISO8601('2020-13-01')).to.be.false; // Month 13 doesn't exist
      expect(isISO8601('2020-04-31')).to.be.false; // April has only 30 days
      expect(isISO8601('2010-02-30')).to.be.false; // February 30 doesn't exist
      expect(isISO8601('2019-02-31')).to.be.false; // February 31 doesn't exist
    });

    it('should reject invalid leap year dates', () => {
      expect(isISO8601('2019-02-29')).to.be.false; // 2019 is not a leap year
      expect(isISO8601('1900-02-29')).to.be.false; // 1900 is not a leap year (divisible by 100 but not 400)
      expect(isISO8601('2009-02-29')).to.be.false; // 2009 is not a leap year
    });

    it('should reject invalid ordinal dates', () => {
      expect(isISO8601('2009-366')).to.be.false; // 2009 is not a leap year, only has 365 days
    });

    it('should reject invalid time components', () => {
      expect(isISO8601('2020-01-01T25:00:00Z')).to.be.false; // Hour 25
      expect(isISO8601('2020-01-01T23:61:00Z')).to.be.false; // Minute 61
      expect(isISO8601('2020-01-01T23:59:61Z')).to.be.false; // Second 61
    });
  });
});
