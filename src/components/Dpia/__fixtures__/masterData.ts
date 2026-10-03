import type { DpiaMasterData } from '../../../types/dpiaMasterData';

/** Synthetic local/Storybook fixture. Never imported by production components. */
export const populatedMasterData: DpiaMasterData = {
    operator: {
        legalName: 'Beispielberatung Test gGmbH',
        shortName: 'Testberatung',
        address: 'Testweg 42, 12345 Teststadt',
        contactEmail: 'kontakt@example.invalid',
        contactPhone: '+49 000 123456',
        dpoName: 'Datenschutzstelle Test',
    },
    supervisoryAuthority: {
        legalFramework: 'GDPR',
        name: 'Test-Aufsichtsbehörde',
        address: 'Prüfweg 5, 12345 Teststadt',
        email: 'aufsicht@example.invalid',
    },
    document: { documentDate: '2026-09-15', nextReviewDate: '2027-09-15' },
    keyFigures: {
        tenants: { count: 7, asOfDate: '2026-09-01' },
        counsellingCentres: { count: 43, asOfDate: '2026-09-02' },
        activeCounsellors: { count: 0, asOfDate: '2026-09-03' },
        registeredClients: { count: 1234, asOfDate: '2026-09-04' },
    },
};
