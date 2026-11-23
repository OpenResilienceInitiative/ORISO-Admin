import { describe, expect, it } from 'vite-plus/test';
import { UserRole } from '../../enums/UserRole';
import { resolveTourAudience, toursForAudience } from './tourAudience';
import type { TourDefinition } from './types';

const roles =
    (...held: UserRole[]) =>
    (role: UserRole | UserRole[]) =>
        (Array.isArray(role) ? role : [role]).some((candidate) => held.includes(candidate));

describe('resolveTourAudience', () => {
    it('maps the platform admin first', () => {
        expect(resolveTourAudience(true, roles(UserRole.TenantAdmin))).toBe('platform_admin');
    });

    it.each([UserRole.TenantAdmin, UserRole.SingleTenantAdmin])('maps %s to tenant_admin', (role) => {
        expect(resolveTourAudience(false, roles(role))).toBe('tenant_admin');
    });

    it('falls back to agency_admin', () => {
        expect(resolveTourAudience(false, roles(UserRole.AgencyAdmin))).toBe('agency_admin');
    });
});

describe('toursForAudience', () => {
    const tour = (id: string, audiences: TourDefinition['audiences'], surface: TourDefinition['surface'] = 'admin') =>
        ({ id, version: 1, surface, audiences, titleKey: '', summaryKey: '', steps: [] } as TourDefinition);

    it('keeps admin tours of the audience only', () => {
        const tours = [
            tour('a', ['agency_admin']),
            tour('b', ['tenant_admin']),
            tour('c', ['agency_admin'], 'frontend'),
        ];
        expect(toursForAudience(tours, 'agency_admin').map((item) => item.id)).toEqual(['a']);
    });
});
