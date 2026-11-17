import { describe, expect, it } from 'vite-plus/test';
import routePathNames from '../appConfig';
import { UserRole } from '../enums/UserRole';
import { isStatisticsReaderOnly, statisticsReaderRedirect } from './statisticsReader';

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

describe('statisticsReaderRedirect', () => {
    it.each([
        routePathNames.statistic,
        `${routePathNames.statistic}/`,
        routePathNames.userProfile,
        '/admin/profil',
        '/admin/profil/security',
    ])('keeps %s', (path) => {
        expect(statisticsReaderRedirect(path)).toBeNull();
    });

    it.each([
        routePathNames.root,
        `${routePathNames.root}/`,
        routePathNames.home,
        routePathNames.agency,
        `${routePathNames.agency}/12/general`,
        routePathNames.users,
        routePathNames.tenantAdmins,
        `${routePathNames.tenants}/3/general`,
        `${routePathNames.themeSettings}/global-config`,
        routePathNames.logs,
        routePathNames.links,
        routePathNames.topics,
        routePathNames.statisticPreview,
        '/admin/statistic-something',
        '/admin/unknown',
    ])('sends %s to the statistics page', (path) => {
        expect(statisticsReaderRedirect(path)).toBe(routePathNames.statistic);
    });
});
