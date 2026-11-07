import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, waitFor } from 'storybook/test';
import { Layout } from 'antd';
import classNames from 'classnames';
import i18n from '../../i18n';
import routePathNames from '../../appConfig';
import { AdminSidebar } from '../Layout/AdminSidebar';
import layoutStyles from '../Layout/styles.module.scss';
import { AdminSearchButton } from './AdminSearchButton';
import { AdminSearchView, type AdminSearchViewProps } from './AdminSearchView';
import { accountDocs, agencyDocs, departmentDocs, tenantDocs, topicDocs, type EntityLabels } from './searchEntities';
import { buildFixtureIndex, fixtureTranslate, type FixtureOptions } from './searchFixtures';

/**
 * The global admin search (Material 3 "search view"). The index is built exactly the way the
 * app builds it: real navigation builders per role, real German and English texts. Only the
 * rows of the list endpoints (Träger, Beratungsstellen, Themen, Konten) are story data.
 */

/** Group labels in the UI language, as the app takes them from the locale files. */
const labelsFor = (language: 'de' | 'en'): EntityLabels => {
    const text = (group: string) => fixtureTranslate(language)('current', `adminSearch.group.${group}`) ?? group;

    return {
        tenants: text('tenants'),
        agencies: text('agencies'),
        topics: text('topics'),
        departments: text('departments'),
        accounts: text('accounts'),
        accountLists: {
            consultants: text('accounts'),
            'agency-admins': text('accounts'),
            'tenant-admins': text('accounts'),
        },
    };
};

const AGENCIES = [
    {
        id: 11,
        name: 'Beratung Nord',
        city: 'Hamburg',
        topics: [
            { id: 1, name: 'Suchtberatung' },
            { id: 2, name: 'Schuldnerberatung' },
        ],
    },
    { id: 12, name: 'Beratung Süd', city: 'München', topics: [{ id: 1, name: 'Suchtberatung' }] },
];

const entityDocsFor = (query: string, all = false, language: 'de' | 'en' = 'en') => {
    const LABELS = labelsFor(language);
    const q = query.toLowerCase();

    if (q.length < 2) {
        return [];
    }

    return [
        ...tenantDocs(
            [
                { id: 1, name: 'Springfield QA Dev', subdomain: 'springfield' },
                { id: 2, name: 'Caritas Nordwest', subdomain: 'nordwest' },
            ],
            LABELS,
        ),
        ...agencyDocs(AGENCIES, LABELS),
        ...departmentDocs(AGENCIES, LABELS),
        ...topicDocs(
            [
                { id: 1, name: 'Suchtberatung', description: 'Beratung bei Abhängigkeit' },
                { id: 2, name: 'Schuldnerberatung' },
            ],
            LABELS,
            true,
        ),
        ...accountDocs(
            [{ id: 'a1', firstname: 'Anna', lastname: 'Müller', email: 'anna.mueller@example.org' }],
            'consultants',
            LABELS,
        ),
    ].filter(
        (doc) => all || `${doc.title} ${doc.description ?? ''}`.toLowerCase().includes(q.split(' ')[0].slice(0, 4)),
    );
};

const DEFAULT_FIXTURE: FixtureOptions = { role: 'platform', language: 'en', singleDomain: false };

interface HarnessProps extends Partial<AdminSearchViewProps> {
    fixture?: FixtureOptions;
    /** Show every entity kind whatever was typed (to look at all the icons at once). */
    allEntities?: boolean;
    /** Let the panel use the whole height (to see every row in one picture). */
    tall?: boolean;
    height?: number;
    children?: ReactNode;
}

const Harness = ({
    fixture = DEFAULT_FIXTURE,
    height = 760,
    allEntities = false,
    tall = false,
    ...props
}: HarnessProps) => {
    const [query, setQuery] = useState(props.initialQuery ?? '');
    const index = useMemo(() => buildFixtureIndex(fixture), [fixture]);

    useEffect(() => {
        i18n.changeLanguage(fixture.language ?? 'en').catch(() => undefined);
    }, [fixture.language]);

    return (
        <div
            style={
                {
                    height,
                    position: 'relative',
                    '--search-panel-max-height': tall ? `${height - 40}px` : undefined,
                } as CSSProperties
            }
        >
            <AdminSearchView
                index={index}
                entityDocs={entityDocsFor(query, allEntities, fixture.language ?? 'en')}
                onQueryChange={setQuery}
                onOpen={fn()}
                onClose={fn()}
                variant="inline"
                showKeyHints
                recent={['Impressum', 'smtp', 'group chat']}
                {...props}
            />
        </div>
    );
};

const meta: Meta<typeof Harness> = {
    title: 'Admin/Global search',
    component: Harness,
    parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof Harness>;

export const ClosedIcon: Story = {
    render: () => (
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: 16 }}>
            <AdminSearchButton onClick={fn()} />
        </div>
    ),
};

export const ClosedSearchBar: Story = {
    name: 'Closed: search bar, centred on desktop',
    render: () => (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 24px' }}>
            <AdminSearchButton variant="bar" onClick={fn()} />
        </div>
    ),
};

/** One hit of every kind, to look at the icons: they are the sidebar's own glyphs. */
/** The real desktop shell: sidebar, the centred search bar in the top row, the page below it. */
export const DesktopShellWithCentredSearchBar: Story = {
    name: 'Desktop shell: search bar centred above the page',
    render: () => (
        <Layout className="protectedLayout" style={{ height: 520 }}>
            <AdminSidebar
                items={[
                    { key: 'home', to: routePathNames.home, label: 'Home', iconPath: routePathNames.home },
                    {
                        key: 'theme',
                        to: routePathNames.themeSettings,
                        label: 'Settings',
                        iconPath: routePathNames.themeSettings,
                    },
                    { key: 'agency', to: routePathNames.agency, label: 'Agencies', iconPath: routePathNames.agency },
                ]}
                account={{
                    key: 'account',
                    to: routePathNames.userProfile,
                    label: 'Account',
                    iconPath: routePathNames.userProfile,
                }}
                logout={{ label: 'Log out', onLogout: () => undefined }}
                lang="en"
                currentPath={routePathNames.themeSettings}
            />
            <Layout className={layoutStyles.mainContent}>
                <div className={layoutStyles.topBar}>
                    <AdminSearchButton variant="bar" onClick={fn()} />
                </div>
                <Layout.Content className={classNames(layoutStyles.content, layoutStyles.contentWithTopBar)}>
                    <h1 style={{ padding: '8px 40px' }}>Settings</h1>
                </Layout.Content>
            </Layout>
        </Layout>
    ),
};

export const AllKindsAndIcons: Story = {
    args: {
        initialQuery: 'mail',
        allEntities: true,
        tall: true,
        height: 1500,
        initialFilters: { kinds: ['pages', 'topics', 'departments', 'tenants', 'agencies', 'accounts'] },
    },
};

export const AllKindsAndIconsGerman: Story = {
    name: 'All kinds and icons (German UI)',
    args: {
        initialQuery: 'mail',
        allEntities: true,
        tall: true,
        height: 1500,
        initialFilters: { kinds: ['pages', 'topics', 'departments', 'tenants', 'agencies', 'accounts'] },
        fixture: { role: 'platform', language: 'de', singleDomain: false },
    },
};

/** The overlay as the app shows it: grows out of the pressed button, shrinks back into it. */
const OverlayDemo = ({ corner }: { corner: 'bottom-right' | 'top-centre' }) => {
    const [state, setState] = useState<{ open: boolean; origin: { x: number; y: number } }>({
        open: false,
        origin: { x: 0, y: 0 },
    });
    const index = useMemo(() => buildFixtureIndex(DEFAULT_FIXTURE), []);
    const position =
        corner === 'bottom-right'
            ? ({ position: 'fixed', right: 16, bottom: 16 } as const)
            : ({ position: 'fixed', top: 8, left: '50%', transform: 'translateX(-50%)' } as const);

    return (
        <div style={{ minHeight: '100vh' }}>
            <p style={{ padding: 24 }}>Page behind the search. It stays visible while the layer opens and closes.</p>
            <div style={position}>
                <AdminSearchButton
                    variant={corner === 'bottom-right' ? 'icon' : 'bar'}
                    onClick={(event) => {
                        const rect = event.currentTarget.getBoundingClientRect();

                        setState({
                            open: true,
                            origin: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
                        });
                    }}
                />
            </div>
            {state.open && (
                <AdminSearchView
                    index={index}
                    origin={state.origin}
                    onOpen={fn()}
                    onClose={() => setState((current) => ({ ...current, open: false }))}
                    recent={['Impressum', 'smtp']}
                />
            )}
        </div>
    );
};

export const PhoneGrowsOutOfTheRoundButton: Story = {
    name: 'Animation: phone, circle from the round button',
    render: () => <OverlayDemo corner="bottom-right" />,
    parameters: { viewport: { defaultViewport: 'phone' } },
};

export const DesktopGrowsOutOfTheSearchBar: Story = {
    name: 'Animation: desktop, circle from the search bar',
    render: () => <OverlayDemo corner="top-centre" />,
};

export const OpenEmptyWithRecentSearches: Story = {};

export const Typing: Story = { args: { initialQuery: 'mail' } };

export const ResultsGrouped: Story = { args: { initialQuery: 'beratung' } };

export const NoResults: Story = { args: { initialQuery: 'xqzvwk' } };

export const FilteredByTypeAndLevel: Story = {
    args: { initialQuery: 'beratung', initialFilters: { kinds: ['departments', 'agencies'], levels: ['agency'] } },
};

export const Phone390: Story = {
    args: { initialQuery: 'daten', height: 780 },
    parameters: { viewport: { defaultViewport: 'phone' } },
    decorators: [
        (Story) => (
            <div style={{ width: 390 }}>
                <Story />
            </div>
        ),
    ],
};

export const Phone390German: Story = {
    name: 'Phone 390, German UI',
    args: { initialQuery: 'daten', height: 780, fixture: { role: 'platform', language: 'de', singleDomain: false } },
    parameters: { viewport: { defaultViewport: 'phone' } },
    decorators: [
        (Story) => (
            <div style={{ width: 390 }}>
                <Story />
            </div>
        ),
    ],
};

export const Desktop1440: Story = {
    args: { initialQuery: 'group chat', height: 820 },
    decorators: [
        (Story) => (
            <div style={{ width: 1440 }}>
                <Story />
            </div>
        ),
    ],
};

export const GermanQueryEnglishUi: Story = {
    name: 'Same thing: “Impressum” in the English UI',
    args: { initialQuery: 'Impressum', fixture: { role: 'platform', language: 'en', singleDomain: false } },
};

export const EnglishQueryGermanUi: Story = {
    name: 'Same thing: “imprint” in the German UI',
    args: { initialQuery: 'imprint', fixture: { role: 'platform', language: 'de', singleDomain: false } },
};

export const TraegerAdminLimited: Story = {
    name: 'Role: Träger admin sees no platform settings',
    args: { initialQuery: 'translation', fixture: { role: 'tenant', language: 'en', singleDomain: true } },
};

export const AgencyAdminLimited: Story = {
    name: 'Role: agency admin',
    args: { initialQuery: 'mail', fixture: { role: 'agency', language: 'en', singleDomain: true } },
};

export const ReadOnlyTraegerAdmin: Story = {
    name: 'Role: Träger admin without edit rights',
    args: { initialQuery: 'imprint', fixture: { role: 'tenantReadOnly', language: 'en', singleDomain: true } },
};

export const KeyboardNavigation: Story = {
    args: { height: 700 },
    play: async ({ canvas, userEvent, args }) => {
        const input = await canvas.findByRole('combobox');

        await userEvent.click(input);
        await userEvent.type(input, 'smtp');
        await waitFor(() => expect(canvas.getAllByRole('option').length).toBeGreaterThan(0));
        await userEvent.keyboard('{ArrowDown}');
        await expect(input.getAttribute('aria-activedescendant')).toBeTruthy();
        await userEvent.keyboard('{Enter}');
        await waitFor(() => expect(args.onOpen).toHaveBeenCalled());
        await userEvent.keyboard('{Escape}');
        await waitFor(() => expect(args.onClose).toHaveBeenCalled());
    },
};
