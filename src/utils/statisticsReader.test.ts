import { describe, expect, it } from 'vite-plus/test';
import { UserRole } from '../enums/UserRole';
import { isStatisticsReaderOnly } from './statisticsReader';

describe('isStatisticsReaderOnly (ORISO-UserService#1666)', () => {
    it('is true for the reader role alone', () => {
        expect(isStatisticsReaderOnly([UserRole.StatisticsReader])).toBe(true);
    });

    it('stays true next to roles that open no admin area', () => {
        expect(isStatisticsReaderOnly([UserRole.StatisticsReader, UserRole.Consultant, 'offline_access'])).toBe(true);
    });

    it.each([
        UserRole.TenantAdmin,
        UserRole.SingleTenantAdmin,
        UserRole.AgencyAdmin,
        UserRole.RestrictedAgencyAdmin,
        UserRole.UserAdmin,
        UserRole.TopicAdmin,
    ])('is false when the account also holds %s', (role) => {
        expect(isStatisticsReaderOnly([UserRole.StatisticsReader, role])).toBe(false);
    });

    it('is false without the reader role', () => {
        expect(isStatisticsReaderOnly([])).toBe(false);
        expect(isStatisticsReaderOnly([UserRole.TenantAdmin])).toBe(false);
    });
});
