import routePathNames from '../../appConfig';
import type { HomeRole } from './homeModel';

/**
 * Home tip "Beratungsstellen ohne Ansprechperson" (ORISO-Admin#1534). A centre
 * counts as covered with a valid own contact or a valid Träger default; the
 * fallback to admins does not count. Pure: the rows come from the coverage call.
 */

export interface ContactCoverageRow {
    agencyId: number;
    agencyName: string;
    covered: boolean;
    tenantId?: number | null;
    tenantName?: string | null;
}

export interface UncoveredAgency {
    agencyId: number;
    agencyName: string;
    to: string;
}

export interface UncoveredTenant {
    tenantId: number | null;
    tenantName: string;
    count: number;
}

export type ContactPersonTip =
    | { kind: 'agency'; agencies: UncoveredAgency[] }
    | { kind: 'tenant'; agencies: UncoveredAgency[] }
    | { kind: 'platform'; total: number; tenants: UncoveredTenant[] };

/** The centre's master data page, which holds its contact person card (#1582). */
export const agencyEditLink = (agencyId: number) => `${routePathNames.agency}/${agencyId}/general`;

const byName = (a: string, b: string) => a.localeCompare(b, 'de', { sensitivity: 'base' });

export const buildContactPersonTip = (
    role: HomeRole,
    rows: ContactCoverageRow[] | undefined,
): ContactPersonTip | null => {
    const missing = (rows ?? []).filter((row) => !row.covered);
    if (missing.length === 0 || role === 'other') return null;

    if (role === 'platform') {
        const perTenant = new Map<string, UncoveredTenant>();
        missing.forEach((row) => {
            const key = String(row.tenantId ?? '');
            const entry = perTenant.get(key) ?? {
                tenantId: row.tenantId ?? null,
                tenantName: row.tenantName?.trim() || '',
                count: 0,
            };
            entry.count += 1;
            perTenant.set(key, entry);
        });
        return {
            kind: 'platform',
            total: missing.length,
            tenants: [...perTenant.values()].sort((a, b) => b.count - a.count || byName(a.tenantName, b.tenantName)),
        };
    }

    const agencies = missing
        .map((row) => ({ agencyId: row.agencyId, agencyName: row.agencyName, to: agencyEditLink(row.agencyId) }))
        .sort((a, b) => byName(a.agencyName, b.agencyName));
    return { kind: role, agencies };
};
