import { useLayoutEffect, type ReactElement } from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies -- story-only helper
import { http, HttpResponse } from 'msw';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import inviteTenantLogoDe from '../../../components/EmailPreview/fixtures/invite-tenant-logo-de.html?raw';
import { LegalSettings } from '../../../components/Tenants/LegalSettings';
import { applyAdminInvertedTheme, applyAdminTheme } from '../../../utils/applyAdminTheme';
import { TENANT_DATA_KEY } from '../../../hooks/useTenantData.hook';
import { UserRole } from '../../../enums/UserRole';
import { setStoryAuth, withSeededAdminProviders } from '../../../utils/storybook/adminStoryDecorators';
import { TenantEditOrAdd } from './index';
import { GeneralTenantSettings } from './General';
import { TenantThemeSettings } from './ThemeSettings';
import { TenantErstantwortSettings } from './ErstantwortSettings';
import { TenantSmtpSettings } from './SmtpSettings';
import { TenantAppSettings } from './AppSettings';
import { TenantGlobalSettings } from './GlobalSettings';

/** A Träger as the tenant service returns it, so the Träger pages can render without a backend. */
export const storyTenant = {
    id: 7,
    name: 'Caritas Süd',
    subdomain: 'caritas-sued',
    address: 'Musterstraße 1, 80331 München',
    description: 'Beratung für Familien und Jugendliche im Süden.',
    adminEmails: [],
    licensing: { allowedNumberOfUsers: 40 },
    settings: {
        activeLanguages: ['de', 'en'],
        extendedSettings: { languageFormal: true },
        smtpMode: 'PLATFORM',
    },
    content: {
        claim: { de: 'Beratung, die ankommt' },
        impressum: {},
        privacy: {},
        termsAndConditions: {},
    },
    theming: { primaryColor: '#a5000a', secondaryColor: '#4c555f' },
};

/** Every call the Träger edit pages make, answered with the story tenant (other calls are not needed to render). */
export const tenantEditHandlers = [
    http.get('*/service/tenantadmin/controls', () =>
        HttpResponse.json({ allowedPermissionToggles: { appearance: true }, permissionPolicies: {} }),
    ),
    http.get('*/service/tenantadmin/:id/permission-policies', () => HttpResponse.json({ tenantId: 7, policies: {} })),
    http.get('*/service/tenantadmin/:id/dpa/versions', () =>
        HttpResponse.json([
            {
                activationDate: '2026-07-13T10:22:00',
                content: JSON.stringify({
                    de: '<h1>Vertragsunterlagen</h1><p>Veröffentlichte Fassung: Weisungsbindung, Vertraulichkeit, TOMs, Löschung.</p>',
                    en: '<h1>Contract documents</h1><p>Published version: instruction binding, confidentiality, TOMs, deletion.</p>',
                }),
            },
        ]),
    ),
    http.get('*/service/tenantadmin/:id/dpa/status', () => HttpResponse.json({ dpaStatus: 'PUBLISHED' })),
    http.get('*/service/agencyadmin/legal-proposal-distributions', () => HttpResponse.json([])),
    http.get('*/service/tenantadmin/:id/dpa/gate', () => HttpResponse.json({ dpaPublished: true, dpaSigned: false })),
    http.get('*/service/tenantadmin/:id/legal-proposals', () => HttpResponse.json([])),
    http.get('*/service/tenantadmin/:id/legal-versions', () => HttpResponse.json([])),
    http.get('*/service/tenantadmin/:id/legal-draft-archives', () => HttpResponse.json([])),
    http.get('*/service/tenantadmin/:id/legal-drafts/*', () => HttpResponse.json({}, { status: 404 })),
    http.get('*/service/tenantadmin/legal-proposal-distributions', () => HttpResponse.json([])),
    http.get('*/service/useradmin/invite-email-templates/preview', () =>
        HttpResponse.json({
            templateId: null,
            templateName: null,
            kind: 'TENANT_INVITE',
            language: 'de',
            subject: 'Ihre Einladung zu ORISO',
            html: inviteTenantLogoDe,
            plainText: 'ORISO',
            sampleAcceptUrl: 'https://admin.example.org/admin/tenant-onboarding/SAMPLE-PREVIEW-TOKEN',
        }),
    ),
    http.get('*/service/users/data', () => HttpResponse.json({ id: 'story-user' })),
    http.get('*/service/tenantadmin/:id', () => HttpResponse.json(storyTenant)),
    http.put('*/service/tenantadmin/:id', () => new HttpResponse(null, { status: 204 })),
    http.get('*/service/tenant/public/*', () => HttpResponse.json(storyTenant)),
    http.get('*/service/tenant/:id', () => HttpResponse.json(storyTenant)),
];

const LegalTabForStory = () => {
    const { id } = useParams();
    return <LegalSettings tenantId={id} />;
};

const tabs: Record<string, ReactElement> = {
    general: <GeneralTenantSettings />,
    'theme-settings': <TenantThemeSettings />,
    'legal-settings': <LegalTabForStory />,
    erstantwort: <TenantErstantwortSettings />,
    smtp: <TenantSmtpSettings />,
    'global-settings': <TenantGlobalSettings />,
    functionalities: <TenantAppSettings />,
};

/**
 * Dark review: open the story iframe with `&scheme=inverted` to render it on the inverted (dark) surface.
 * Without it the light scheme is applied, so a story never inherits the previous story's colours.
 */
export const SchemeFromUrl = ({ children }: { children: ReactElement }) => {
    useLayoutEffect(() => {
        const inverted = new URLSearchParams(window.location.search).get('scheme') === 'inverted';
        (inverted ? applyAdminInvertedTheme : applyAdminTheme)({ primaryColor: '#A5000A' });
    }, []);
    return children;
};

/** The Träger edit page of a platform admin on one tab: sticky header, underline tabs and the tab's tiles. */
export const tenantEditDecorator = (tab: keyof typeof tabs, id = '7', search = '') =>
    function TenantEditDecorator() {
        setStoryAuth([UserRole.AgencyAdmin, UserRole.TenantAdmin], 0);
        return withSeededAdminProviders(
            () => (
                <SchemeFromUrl>
                    <Routes>
                        <Route path="/" element={<Navigate to={`/admin/tenants/${id}/${tab}${search}`} replace />} />
                        <Route path="/admin/tenants/:id" element={<TenantEditOrAdd />}>
                            {Object.entries(tabs).map(([path, element]) => (
                                <Route key={path} path={path} element={element} />
                            ))}
                        </Route>
                    </Routes>
                </SchemeFromUrl>
            ),
            (client) => {
                client.setQueryData([TENANT_DATA_KEY, 0], storyTenant);
            },
        );
    };
