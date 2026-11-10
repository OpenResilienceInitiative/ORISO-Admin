import { useEffect, type ReactNode } from 'react';
import { http, HttpResponse } from 'msw';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { UserRole } from '../../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../../utils/storybook/adminStoryDecorators';
import { AgencyPageEdit } from './index';
import type { AgencyTileLayout } from './AgencyTileGrid';

/**
 * Shared frame for the agency edit page stories (route `/admin/agency/:id/...`): the real
 * `AgencyPageEdit` with mocked HTTP only, beside a stand-in for the 128px admin sidebar so the
 * page has the width it has in the app.
 */
export const AGENCY_ID = '55';
export const TRAEGER_ID = 7;

export type AgencyStoryRole = 'platformAdmin' | 'traegerAdmin' | 'agencyAdmin';

const ROLE_AUTH: Record<AgencyStoryRole, { roles: UserRole[]; tenantId: number }> = {
    platformAdmin: { roles: [UserRole.AgencyAdmin, UserRole.TenantAdmin], tenantId: 0 },
    traegerAdmin: { roles: [UserRole.AgencyAdmin, UserRole.TenantAdmin], tenantId: TRAEGER_ID },
    agencyAdmin: { roles: [UserRole.RestrictedAgencyAdmin], tenantId: TRAEGER_ID },
};

export const installAgencyStoryAuth = (role: AgencyStoryRole): void => {
    const { roles, tenantId } = ROLE_AUTH[role];
    setStoryAuth(roles, tenantId);
};

export const storyTopics = [
    { id: 3, name: 'Schwangerschaftsberatung', status: 'ACTIVE' },
    { id: 4, name: 'Schuldnerberatung', status: 'ACTIVE' },
];

const storyAgency = {
    id: Number(AGENCY_ID),
    tenantId: TRAEGER_ID,
    name: 'Beratungsstelle Nordlicht',
    postcode: '10115',
    city: 'Berlin',
    street: 'Beispielstraße',
    houseNumber: '12',
    floorBuilding: '2. OG',
    country: 'Deutschland',
    phone: '030 123456',
    phoneSecondary: '',
    email: 'nordlicht@example.org',
    openingHours: 'Mo bis Fr 9 bis 16 Uhr',
    description: 'Beratung für Schwangere und Familien.',
    consultingType: 0,
    offline: false,
    teamAgency: false,
    topics: storyTopics,
    settings: {},
    dataProtection: {
        dataProtectionResponsibleEntity: 'DATA_PROTECTION_OFFICER',
        agencyDataProtectionResponsibleContact: {
            nameAndLegalForm: 'Nordlicht e. V.',
            postcode: '10115',
            city: 'Berlin',
            phoneNumber: '030 123456',
            email: 'datenschutz@example.org',
        },
        dataProtectionOfficerContact: {
            nameAndLegalForm: 'Dr. Datenschutz',
            postcode: '10115',
            city: 'Berlin',
            phoneNumber: '030 654321',
            email: 'dsb@example.org',
        },
    },
    content: { impressum: { de: '<p>Impressum der Beratungsstelle.</p>' }, privacy: {} },
};

const storyTenant = {
    id: TRAEGER_ID,
    name: 'Träger Nordlicht',
    settings: { activeLanguages: ['de', 'en'] },
    content: { privacy: { de: '<h2>Datenschutzerklärung des Trägers</h2><p>Gilt für alle Beratungsstellen.</p>' } },
};

export const agencyEditHandlers = [
    http.get('*/service/users/data', () => HttpResponse.json({ id: 'storybook-admin', agencies: [{ id: 55 }] })),
    http.get('*/service/agencyadmin/agencies/:id/legal-versions', () => HttpResponse.json([])),
    http.get('*/service/agencyadmin/agencies/:id/topics/:topicId/legal-versions', () => HttpResponse.json([])),
    http.get('*/service/agencyadmin/agencies/:id/legal-drafts/*', () => new HttpResponse(null, { status: 404 })),
    http.get('*/service/agencyadmin/agencies/:id/topics/:topicId/dpp', () =>
        HttpResponse.json({ content: null, publicationStatus: 'DRAFT' }),
    ),
    http.get('*/service/agencyadmin/agencies/:id/topics/:topicId/imprint', () =>
        HttpResponse.json({ content: null, publicationStatus: 'DRAFT' }),
    ),
    http.get('*/service/agencyadmin/agencies/:id', () => HttpResponse.json({ _embedded: storyAgency })),
    http.put('*/service/agencyadmin/agencies/:id', () => HttpResponse.json({ _embedded: storyAgency })),
    http.get('*/service/agencyadmin/postcoderanges/:id', () =>
        HttpResponse.json({ _embedded: { postcodeRanges: '00000-99999' } }),
    ),
    http.get('*/service/agencyadmin/agencies*', () => HttpResponse.json({ embedded: [], total: 0 })),
    http.get('*/service/agencyadmin/legal-proposal-distributions*', () => HttpResponse.json([])),
    http.get('*/service/topic*', () => HttpResponse.json(storyTopics)),
    http.get('*/service/tenant/public/*', () => HttpResponse.json(storyTenant)),
    http.get('*/service/tenant/:id', () => HttpResponse.json(storyTenant)),
    http.get('*/service/tenantadmin/search*', () => HttpResponse.json({ embedded: [storyTenant], total: 1 })),
    http.get('*/service/tenantadmin/:id/permission-policies', () =>
        HttpResponse.json({ tenantId: TRAEGER_ID, policies: {} }),
    ),
    http.get('*/service/tenantadmin/:id/dpa/versions', () =>
        HttpResponse.json([
            {
                activationDate: '2026-07-13T10:22:00',
                content: JSON.stringify({ de: '<h1>Vertragsunterlagen</h1><p>Veröffentlichte Fassung.</p>' }),
            },
        ]),
    ),
    http.get('*/service/tenantadmin/:id/dpa/gate', () => HttpResponse.json({ dpaPublished: true, dpaSigned: true })),
    http.get('*/service/tenantadmin/:id', () => HttpResponse.json(storyTenant)),
    http.get('*/service/users/consultants/search*', () =>
        HttpResponse.json({
            total: 1,
            embedded: [
                {
                    embedded: {
                        id: 'c1',
                        firstname: 'Erika',
                        lastname: 'Beispiel',
                        email: 'erika@example.org',
                        absent: false,
                        agencies: [],
                    },
                },
            ],
        }),
    ),
    http.get('*/service/useradmin/agencies/:id/consultants*', () => HttpResponse.json({ embedded: [], total: 0 })),
    http.get('*/service/users/case-handover/reason-policies', () => HttpResponse.json([])),
    http.get('*/service/users/live-chat-links*', () => HttpResponse.json([])),
];

const SECTION_PATH = { general: 'general', legal: 'legal-settings', functionalities: 'functionalities' } as const;

/** The preview already supplies the router; this moves it to the agency route before the page mounts. */
const AtAgencyRoute = ({ path, children }: { path: string; children: ReactNode }) => {
    const navigate = useNavigate();
    useEffect(() => {
        navigate(`/admin/agency/${AGENCY_ID}/${path}`, { replace: true });
    }, [navigate, path]);
    return <div style={{ display: 'contents' }}>{children}</div>;
};

/** A tile story on the agency route, so the tile sees the stored agency like the page does. */
export const AgencyRouteFrame = ({ children }: { children: ReactNode }) => (
    <AtAgencyRoute path={SECTION_PATH.general}>
        <Routes>
            <Route path="/admin/agency/:id/*" element={<div style={{ display: 'contents' }}>{children}</div>} />
        </Routes>
    </AtAgencyRoute>
);

/** Sidebar stand-in plus the real route, so `useParams` resolves the agency. */
export const AgencyEditFrame = ({
    section = 'general',
    legalLayout,
}: {
    section?: keyof typeof SECTION_PATH;
    legalLayout?: AgencyTileLayout;
}) =>
    withAdminProviders(() => (
        <AtAgencyRoute path={SECTION_PATH[section]}>
            {/* In the app the sidebar is a bottom bar below 768px, so the stand-in goes with it. */}
            <style>{'@media (max-width: 767px) { [data-story-sidebar] { display: none !important; } }'}</style>
            <div style={{ display: 'flex', minHeight: '100vh' }}>
                <div
                    data-story-sidebar
                    style={{ width: 128, flex: '0 0 128px', background: 'var(--m3-on-background, #281715)' }}
                    aria-hidden
                />
                <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                    <Routes>
                        <Route
                            path="/admin/agency/:id/*"
                            element={
                                <AgencyPageEdit
                                    section={section === 'general' ? undefined : section}
                                    legalLayout={legalLayout}
                                />
                            }
                        />
                    </Routes>
                </div>
            </div>
        </AtAgencyRoute>
    ));
