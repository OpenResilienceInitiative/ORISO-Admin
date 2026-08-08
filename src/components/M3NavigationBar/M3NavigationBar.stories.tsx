import {
    Assessment,
    AssessmentOutlined,
    HolidayVillage,
    HolidayVillageOutlined,
    Link as LinkIcon,
    LinkOutlined,
    MoreVert,
    People,
    PeopleOutlined,
    RealEstateAgent,
    RealEstateAgentOutlined,
    Settings,
    SettingsOutlined,
} from '@mui/icons-material';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { M3NavigationBar, type M3NavigationBarItem } from './M3NavigationBar';

const settings: M3NavigationBarItem = {
    key: 'settings',
    label: 'Einstellungen',
    icon: <SettingsOutlined />,
    activeIcon: <Settings />,
};
const tenants: M3NavigationBarItem = {
    key: 'tenants',
    label: 'Träger',
    icon: <HolidayVillageOutlined />,
    activeIcon: <HolidayVillage />,
};
const agency: M3NavigationBarItem = {
    key: 'agency',
    label: 'Beratungsstellen',
    icon: <RealEstateAgentOutlined />,
    activeIcon: <RealEstateAgent />,
};
const users: M3NavigationBarItem = {
    key: 'users',
    label: 'Konten',
    icon: <PeopleOutlined />,
    activeIcon: <People />,
};
const statistics: M3NavigationBarItem = {
    key: 'statistics',
    label: 'Statistiken',
    icon: <AssessmentOutlined />,
    activeIcon: <Assessment />,
};
const links: M3NavigationBarItem = {
    key: 'links',
    label: 'Links',
    icon: <LinkOutlined />,
    activeIcon: <LinkIcon />,
};

const more = {
    label: 'Mehr',
    icon: <MoreVert />,
    onClick: () => {},
};

const meta = {
    title: 'Molecules/M3NavigationBar',
    component: M3NavigationBar,
    parameters: {
        layout: 'centered',
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/RTUi1rcrEWECXz8rNFmj7Q/Design-System-M3_ORISO?node-id=56576-34607',
        },
    },
    args: {
        ariaLabel: 'Hauptnavigation',
        activeKey: 'settings',
        lang: 'de',
        items: [settings, tenants],
        more,
    },
    decorators: [
        // The bar always sits on the M3 surface-container of AppBottomBar —
        // rendering it on Storybook's white canvas would hide contrast problems.
        // Width comes from the story so each segment count gets its real slot
        // width (Figma: 96px per segment).
        (Story, context) => (
            <div
                style={{
                    width: (context.parameters.barWidth as number | undefined) ?? 288,
                    padding: 16,
                    background: 'var(--m3-surface-container, #f0edee)',
                    borderRadius: '12px 12px 0 0',
                }}
            >
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof M3NavigationBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Figma parity: two destinations plus the overflow slot, "Einstellungen" selected. */
export const ThreeSegments: Story = {};

export const FourSegments: Story = {
    args: { items: [settings, tenants, agency], activeKey: 'tenants' },
    parameters: { barWidth: 384 },
};

/** M3 caps the bar at five destinations — this is the widest legal layout. */
export const FiveSegments: Story = {
    args: { items: [settings, tenants, agency, users], activeKey: 'users' },
    parameters: { barWidth: 480 },
};

/** Without overflow: every destination fits, so no "Mehr" segment is rendered. */
export const WithoutOverflow: Story = {
    args: { items: [settings, tenants, agency], more: undefined, activeKey: 'agency' },
};

/**
 * The labels that break today's bottom bar. They must wrap inside their segment
 * instead of pushing the neighbours around ("Nutzer* innen" in the old bar).
 */
export const LongLabels: Story = {
    args: {
        items: [
            { ...agency, label: 'Beratungsstellen' },
            { ...users, label: 'Konten' },
        ],
        activeKey: 'agency',
    },
};

/** Narrowest supported viewport: 320px minus the search pill and the bar padding. */
export const NarrowViewport: Story = {
    args: { items: [statistics, links], activeKey: 'statistics' },
    parameters: { barWidth: 200 },
};
