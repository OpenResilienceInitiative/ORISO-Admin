import {
    Assessment,
    AssessmentOutlined,
    HolidayVillage,
    HolidayVillageOutlined,
    History,
    HistoryOutlined,
    Link as LinkIcon,
    LinkOutlined,
    ListAlt,
    ListAltOutlined,
    MoreVert,
    People,
    PeopleOutlined,
    RealEstateAgent,
    RealEstateAgentOutlined,
    Settings,
    SettingsOutlined,
} from '@mui/icons-material';
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { GlobalSearchBar } from '../GlobalSearch';
import { M3NavigationBar, type M3NavigationBarItem } from '../M3NavigationBar';
import { useNavOverflow } from '../../hooks/useNavOverflow.hook';
import { AppBottomBar } from './AppBottomBar';

const destinations: M3NavigationBarItem[] = [
    { key: 'settings', label: 'Einstellungen', icon: <SettingsOutlined />, activeIcon: <Settings /> },
    { key: 'tenants', label: 'Träger', icon: <HolidayVillageOutlined />, activeIcon: <HolidayVillage /> },
];

/** The full set a super admin sees today — the seven that break the old bar. */
const superAdminDestinations: M3NavigationBarItem[] = [
    ...destinations,
    { key: 'agency', label: 'Beratungsstelle', icon: <RealEstateAgentOutlined />, activeIcon: <RealEstateAgent /> },
    { key: 'users', label: 'Konten', icon: <PeopleOutlined />, activeIcon: <People /> },
    { key: 'statistics', label: 'Statistiken', icon: <AssessmentOutlined />, activeIcon: <Assessment /> },
    { key: 'links', label: 'Links', icon: <LinkOutlined />, activeIcon: <LinkIcon /> },
    { key: 'logs', label: 'Logs', icon: <ListAltOutlined />, activeIcon: <ListAlt /> },
    { key: 'activity-logs', label: 'Aktivitäts-Logs', icon: <HistoryOutlined />, activeIcon: <History /> },
];

const nav = (
    <M3NavigationBar
        ariaLabel="Hauptnavigation"
        items={destinations}
        activeKey="settings"
        lang="de"
        more={{ label: 'Mehr', icon: <MoreVert />, onClick: () => {} }}
    />
);

const search = <GlobalSearchBar variant="pill" searchPlaceholder="Suchen" />;

const meta = {
    title: 'Organisms/AppBottomBar',
    component: AppBottomBar,
    parameters: {
        layout: 'fullscreen',
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/RTUi1rcrEWECXz8rNFmj7Q/Design-System-M3_ORISO?node-id=56576-34607',
        },
    },
    args: {
        search,
        children: nav,
    },
    decorators: [
        // Phone-width frame on the workspace background, so the bar's top
        // corners and its contrast against the page are both visible.
        (Story, context) => (
            <div
                style={{
                    width: (context.parameters.deviceWidth as number | undefined) ?? 412,
                    paddingTop: 24,
                    background: 'var(--admin-workspace-background, #e4e2e2)',
                }}
            >
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof AppBottomBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Figma parity at 412px: search pill, two destinations and the overflow slot. */
export const Default: Story = {};

/** Screens where searching has no meaning: the navigation takes the full width. */
export const WithoutSearch: Story = {
    args: { search: undefined },
};

/**
 * The rule Frank set: however far the search expands, it may never displace the
 * overflow button. The search takes the free width, the navigation shrinks to a
 * single 48×48 "Mehr" icon — and tapping that icon opens the full destination
 * list *without* closing the search, so the two destinations the search
 * swallowed are still one tap away.
 *
 * Interactive: expand the search, then open the overflow. The real list arrives
 * with `MoreMenuSheet`; this story only proves the layout contract.
 */
export const SearchExpandedKeepsOverflow: Story = {
    render: function SearchExpandedKeepsOverflowStory() {
        const [expanded, setExpanded] = useState(true);
        const [menuOpen, setMenuOpen] = useState(false);

        return (
            <>
                <AppBottomBar
                    searchExpanded={expanded}
                    search={
                        <GlobalSearchBar
                            variant="pill"
                            searchPlaceholder="Suchen"
                            defaultExpanded
                            onExpandedChange={setExpanded}
                        />
                    }
                >
                    <M3NavigationBar
                        ariaLabel="Hauptnavigation"
                        items={destinations}
                        activeKey="settings"
                        lang="de"
                        collapsed={expanded}
                        more={{
                            label: 'Mehr',
                            icon: <MoreVert />,
                            expanded: menuOpen,
                            // Deliberately does NOT touch the search state.
                            onClick: () => setMenuOpen((open) => !open),
                        }}
                    />
                </AppBottomBar>
                {menuOpen && (
                    <ul style={{ margin: 0, padding: '8px 16px', listStyle: 'none', fontSize: 14 }}>
                        {destinations.map((item) => (
                            <li key={item.key} style={{ padding: '8px 0' }}>
                                {item.label}
                            </li>
                        ))}
                        <li style={{ padding: '8px 0' }}>Statistiken</li>
                        <li style={{ padding: '8px 0' }}>Links</li>
                    </ul>
                )}
            </>
        );
    },
};

/** Smallest supported phone, fixed two destinations — the pre-overflow layout. */
export const NarrowPhone: Story = {
    parameters: { deviceWidth: 320 },
    args: {
        children: (
            <M3NavigationBar
                ariaLabel="Hauptnavigation"
                items={[
                    {
                        key: 'agency',
                        label: 'Beratungsstelle',
                        icon: <RealEstateAgentOutlined />,
                        activeIcon: <RealEstateAgent />,
                    },
                    { key: 'users', label: 'Konten', icon: <PeopleOutlined />, activeIcon: <People /> },
                ]}
                activeKey="agency"
                lang="de"
                more={{ label: 'Mehr', icon: <MoreVert />, onClick: () => {} }}
            />
        ),
    },
};

/**
 * The seven destinations a super admin has, run through `useNavOverflow`. This
 * is the case that breaks today's bar: it renders all seven regardless of width
 * and lets the labels collide. Here the bar keeps as many as genuinely fit and
 * pushes the rest behind "Mehr" — 1 at 320px, 2 at 412px, 4 from ~500px up.
 */
const ResponsiveBar = () => {
    const { ref, visibleCount, hasOverflow } = useNavOverflow({ itemCount: superAdminDestinations.length });

    return (
        <AppBottomBar navSlotRef={ref} search={search}>
            <M3NavigationBar
                ariaLabel="Hauptnavigation"
                items={superAdminDestinations.slice(0, visibleCount)}
                activeKey="settings"
                lang="de"
                more={hasOverflow ? { label: 'Mehr', icon: <MoreVert />, onClick: () => {} } : undefined}
            />
        </AppBottomBar>
    );
};

export const ResponsiveOverflow: Story = {
    render: () => <ResponsiveBar />,
};

export const ResponsiveOverflowNarrowPhone: Story = {
    parameters: { deviceWidth: 320 },
    render: () => <ResponsiveBar />,
};

export const ResponsiveOverflowTablet: Story = {
    parameters: { deviceWidth: 768 },
    render: () => <ResponsiveBar />,
};
