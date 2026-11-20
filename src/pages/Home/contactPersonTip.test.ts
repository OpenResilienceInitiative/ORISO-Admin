import { describe, expect, it } from 'vite-plus/test';
import { buildContactPersonTip, type ContactCoverageRow } from './contactPersonTip';

const row = (agencyId: number, agencyName: string, covered: boolean, tenantId = 7, tenantName = 'Caritas Süd') =>
    ({ agencyId, agencyName, covered, tenantId, tenantName } satisfies ContactCoverageRow);

describe('buildContactPersonTip (ORISO-Admin#1534)', () => {
    it('shows no tip when every centre is covered or nothing loaded', () => {
        expect(buildContactPersonTip('tenant', [row(1, 'Nord', true)])).toBeNull();
        expect(buildContactPersonTip('tenant', undefined)).toBeNull();
        expect(buildContactPersonTip('tenant', [])).toBeNull();
    });

    it('shows no tip for a role without centres', () => {
        expect(buildContactPersonTip('other', [row(1, 'Nord', false)])).toBeNull();
    });

    it('lists the BST admin’s own uncovered centre with its edit link', () => {
        expect(buildContactPersonTip('agency', [row(1, 'Nord', false), row(2, 'Süd', true)])).toEqual({
            kind: 'agency',
            agencies: [{ agencyId: 1, agencyName: 'Nord', to: '/admin/agency/1/general' }],
        });
    });

    it('lists the uncovered centres of a Träger admin by name', () => {
        const tip = buildContactPersonTip('tenant', [
            row(3, 'West', false),
            row(2, 'Ost', false),
            row(1, 'Nord', true),
        ]);
        expect(tip?.kind).toBe('tenant');
        expect(tip && tip.kind === 'tenant' && tip.agencies.map((agency) => agency.agencyName)).toEqual([
            'Ost',
            'West',
        ]);
    });

    it('counts uncovered centres per Träger for the platform admin, most first', () => {
        expect(
            buildContactPersonTip('platform', [
                row(1, 'A', false, 7, 'Caritas Süd'),
                row(2, 'B', false, 8, 'Diakonie Mitte'),
                row(3, 'C', false, 8, 'Diakonie Mitte'),
                row(4, 'D', true, 8, 'Diakonie Mitte'),
            ]),
        ).toEqual({
            kind: 'platform',
            total: 3,
            tenants: [
                { tenantId: 8, tenantName: 'Diakonie Mitte', count: 2 },
                { tenantId: 7, tenantName: 'Caritas Süd', count: 1 },
            ],
        });
    });
});
