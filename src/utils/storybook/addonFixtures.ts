import { http, HttpResponse } from 'msw';
import type {
    AddonApp,
    AddonMode,
    AddonRegistry,
    AddonSettings,
    AddonStats,
    AddonTenantState,
    AdminAddon,
} from '../../addons/addonTypes';

export const ADDON = 'demo-tools';
export const NOTICE_ADDON = 'notice-board';
export const BUNDLE_PATH = `/service/addons/${ADDON}/ui/index.js`;
export const README_IMAGE = 'https://raw.githubusercontent.com/OpenResilienceInitiative/demo-tools/main/docs/goals.png';

export const TENANTS = [
    { id: 1, name: 'Demo-Mandant' },
    { id: 2, name: 'Caritas Musterstadt' },
    { id: 3, name: 'Diakonie Nord' },
    { id: 4, name: 'Suchthilfe Süd' },
];
export const AGENCIES = [
    { id: 12, name: 'Suchtberatung Freiburg' },
    { id: 14, name: 'Jugendberatung Lörrach' },
];

export const README = `# Demo-Tools

Werkzeuge für die Beratung: Ziele gemeinsam festhalten, Fortschritt sehen und Auswertungen exportieren.

![Zielübersicht im Beratungsportal](${README_IMAGE})

## Funktionen

- Ziele gemeinsam mit Ratsuchenden anlegen
- Erinnerung nach einer festen Zahl von Tagen
- Auswertung für Träger-Admins

Mehr im [Handbuch](https://github.com/OpenResilienceInitiative/demo-tools).
`;

/** A small mock screenshot, served where the readme's image points. */
export const README_IMAGE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="300" viewBox="0 0 640 300">
<rect width="640" height="300" rx="12" fill="#f4efee"/>
<rect x="24" y="24" width="592" height="40" rx="8" fill="#a5000a"/>
<text x="44" y="50" font-family="sans-serif" font-size="18" fill="#fff">Meine Ziele</text>
<rect x="24" y="84" width="592" height="56" rx="8" fill="#fff" stroke="#c4c7c8"/>
<text x="44" y="118" font-family="sans-serif" font-size="16" fill="#1b1b1c">Jeden Tag zehn Minuten spazieren</text>
<rect x="24" y="152" width="592" height="56" rx="8" fill="#fff" stroke="#c4c7c8"/>
<text x="44" y="186" font-family="sans-serif" font-size="16" fill="#1b1b1c">Weniger am Abend trinken</text>
<rect x="24" y="220" width="592" height="56" rx="8" fill="#fff" stroke="#c4c7c8"/>
<text x="44" y="254" font-family="sans-serif" font-size="16" fill="#1b1b1c">Termin bei der Beratungsstelle</text>
</svg>`;

const APPS: AddonApp[] = [{ id: 'report', title: { de: 'Auswertung', en: 'Report' }, slots: ['admin.page'] }];

export const SCREENSHOT_SESSION =
    'https://raw.githubusercontent.com/OpenResilienceInitiative/demo-tools/main/docs/goals-session.png';
export const SCREENSHOT_PROFILE =
    'https://raw.githubusercontent.com/OpenResilienceInitiative/demo-tools/main/docs/goals-profile.png';
export const SCREENSHOT_CAPTION = 'Ziele in der Seitenleiste des Falls';

/** An app in several slots, with screenshots for two of them; only the platform admin sees it. */
const GOALS_APP: AddonApp = {
    id: 'goals',
    title: { de: 'Ziele', en: 'Goals' },
    slots: ['asker.navigation', 'consultant.session', 'consultant.asker-profile'],
    screenshots: [
        {
            slot: 'consultant.session',
            url: SCREENSHOT_SESSION,
            caption: { de: SCREENSHOT_CAPTION, en: 'Goals in the side panel of the case' },
        },
        { slot: 'consultant.asker-profile', url: SCREENSHOT_PROFILE },
    ],
};

export const registry: AddonRegistry = {
    contract: 'oriso-addon/v1',
    addons: [
        {
            name: ADDON,
            version: '1.2.0',
            entry: BUNDLE_PATH,
            apiBase: `/service/addons/${ADDON}/api`,
            apps: APPS,
        },
    ],
};

export const settings: AddonSettings = {
    schema: {
        type: 'object',
        required: ['greeting'],
        properties: {
            greeting: { type: 'string', title: 'Begrüßungstext', default: 'Willkommen', maxLength: 80 },
            showReminder: { type: 'boolean', title: 'Erinnerung anzeigen', default: true },
            reminderDays: { type: 'integer', title: 'Erinnerung nach Tagen', minimum: 1, maximum: 30, default: 7 },
        },
    },
    values: { greeting: 'Schön, dass Sie da sind' },
};

export const stats: AddonStats = {
    stats: [
        { id: 'sessions', value: 128 },
        { id: 'exports', value: null },
    ],
};

interface TenantSetup {
    mode: AddonMode;
    enabled: boolean;
}

const initialSetup = (): Record<number, TenantSetup> => ({
    1: { mode: 'TENANT', enabled: true },
    2: { mode: 'ON', enabled: true },
    4: { mode: 'ON_HIDDEN', enabled: true },
});

/** Per story: what the platform admin has set; PUTs change it so a refetch shows the change. */
export const createAddonBackend = ({ readme = true }: { readme?: boolean } = {}) => {
    let setup = initialSetup();
    const reset = () => {
        setup = initialSetup();
    };
    const effective = (tenantId: number) => {
        const entry = setup[tenantId] ?? { mode: 'OFF' as const, enabled: false };
        return entry.mode === 'ON' || entry.mode === 'ON_HIDDEN' || (entry.mode === 'TENANT' && entry.enabled);
    };

    const demoAddon = (tenantId: number): AdminAddon => ({
        manifest: {
            name: ADDON,
            version: '1.2.0',
            contract: 'oriso-addon/v1',
            apps: [GOALS_APP, ...APPS],
            stats: [
                { id: 'sessions', label: { de: 'Sitzungen', en: 'Sessions' } },
                { id: 'exports', label: { de: 'Exporte', en: 'Exports' } },
            ],
        },
        global: { enabled: true },
        discoveredAt: '2026-11-12T09:30:00Z',
        tenantId,
        mode: setup[tenantId]?.mode ?? 'OFF',
        tenantCanSwitch: setup[tenantId]?.mode === 'TENANT',
        hasReadme: readme,
        enabled: tenantId > 0 && effective(tenantId),
        agencyOverrides: tenantId === 1 ? [{ tenantId, agencyId: AGENCIES[0].id, enabled: false }] : [],
    });

    const noticeAddon = (tenantId: number): AdminAddon => ({
        manifest: { name: NOTICE_ADDON, version: '0.3.0', contract: 'oriso-addon/v1', apps: [] },
        global: { enabled: true },
        tenantId,
        mode: 'ON',
        tenantCanSwitch: false,
        hasReadme: false,
        enabled: true,
        agencyOverrides: [],
    });

    const tenantStates = (): AddonTenantState[] =>
        Object.entries(setup).map(([id, entry]) => ({
            tenantId: Number(id),
            mode: entry.mode,
            enabled: entry.enabled,
            updatedAt: '2026-11-14T08:15:00Z',
            agenciesEnabled: 0,
            agenciesDisabled: Number(id) === 1 ? 1 : 0,
        }));

    const handlers = [
        http.get('*/service/addons/registry', () => HttpResponse.json(registry)),
        http.get('*/service/addons/admin/addons', ({ request }) => {
            const tenantId = Number(new URL(request.url).searchParams.get('tenantId') ?? 0);
            return HttpResponse.json(tenantId > 0 ? [demoAddon(tenantId), noticeAddon(tenantId)] : [demoAddon(0)]);
        }),
        http.get(`*/service/addons/admin/addons/${ADDON}/readme`, () =>
            readme
                ? HttpResponse.text(README, { headers: { 'Content-Type': 'text/markdown' } })
                : new HttpResponse(null, { status: 404 }),
        ),
        http.get(`*/service/addons/admin/addons/${ADDON}/tenants`, () => HttpResponse.json(tenantStates())),
        http.put(`*/service/addons/admin/addons/${ADDON}/tenants/:tenantId/mode`, async ({ params, request }) => {
            const { mode } = (await request.json()) as { mode: AddonMode };
            const tenantId = Number(params.tenantId);
            setup[tenantId] = { mode, enabled: setup[tenantId]?.enabled ?? false };
            return new HttpResponse(null, { status: 204 });
        }),
        http.put(`*/service/addons/admin/addons/${ADDON}/tenants/:tenantId`, async ({ params, request }) => {
            const { enabled } = (await request.json()) as { enabled: boolean };
            const tenantId = Number(params.tenantId);
            setup[tenantId] = { mode: setup[tenantId]?.mode ?? 'OFF', enabled };
            return new HttpResponse(null, { status: 204 });
        }),
        http.get(`*/service/addons/admin/addons/${ADDON}/stats`, () => HttpResponse.json(stats)),
        http.get(`*/service/addons/admin/addons/${ADDON}/settings`, () => HttpResponse.json(settings)),
        http.get(`*/service/addons/admin/addons/${NOTICE_ADDON}/settings`, () =>
            HttpResponse.json({ schema: null, values: {} }),
        ),
        http.get('*/service/agencyadmin/agencies', () =>
            HttpResponse.json({
                total: AGENCIES.length,
                _embedded: AGENCIES.map((agency) => ({ _embedded: { ...agency, tenantId: 1, deleteDate: 'null' } })),
            }),
        ),
        http.get('*/service/tenantadmin/search', () =>
            HttpResponse.json({
                total: TENANTS.length,
                _embedded: TENANTS.map((tenant) => ({ _embedded: { ...tenant, adminEmails: [] } })),
            }),
        ),
        ...[README_IMAGE, SCREENSHOT_SESSION, SCREENSHOT_PROFILE].map((url) =>
            http.get(url, () => HttpResponse.text(README_IMAGE_SVG, { headers: { 'Content-Type': 'image/svg+xml' } })),
        ),
    ];

    return { handlers, reset };
};
