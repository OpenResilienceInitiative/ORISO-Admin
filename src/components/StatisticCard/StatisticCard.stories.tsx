import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { StatisticCard } from './StatisticCard';
import { ReactComponent as ConversationsIcon } from '../../resources/img/svg/statistics-dashboard/conversations.svg';
import { ReactComponent as RequestsIcon } from '../../resources/img/svg/statistics-dashboard/requests.svg';
import { ReactComponent as TopicIcon } from '../../resources/img/svg/statistics-dashboard/topic.svg';
import { ReactComponent as VideoCallsIcon } from '../../resources/img/svg/statistics-dashboard/video-calls.svg';
import type { StatisticCardDefinition } from '../../pages/Statistic/types';

// The dashboard translates German seed labels via i18n; in isolation we just echo
// the provided fallback so the card renders the real Figma copy.
const echoTranslate = (key: string, options?: Record<string, unknown>) => (options?.defaultValue as string) ?? key;

const requestsCard: StatisticCardDefinition = {
    key: 'requests',
    title: 'Anfragen',
    value: '870',
    detail: 'Vormonat gesamt 1.050',
    trend: { value: '~ 20%', tone: 'red' },
    icon: RequestsIcon,
    size: 'large',
    menuLabel: 'Chattyp',
    menuAriaLabel: 'Anfragen nach Chattyp filtern',
    defaultMenuKey: 'all',
    menuOptions: [
        {
            key: 'all',
            label: 'Alle Chattypen',
            value: '870',
            detail: 'Vormonat gesamt 1.050',
            trend: { value: '~ 20%', tone: 'red' },
        },
        {
            key: 'oneToOne',
            label: 'Nähe (1:1)',
            value: '420',
            detail: '1:1-Anfragen',
            trend: { value: '~ 18%', tone: 'blue' },
        },
        {
            key: 'liveChat',
            label: 'Live-Chat',
            value: '250',
            detail: 'Live-Chat-Anfragen',
            trend: { value: '~ 11%', tone: 'blue' },
        },
        {
            key: 'groups',
            label: 'Gruppen',
            value: '200',
            detail: 'Gruppen-Anfragen',
            trend: { value: '~ 9%', tone: 'red' },
        },
    ],
};

const conversationsCard: StatisticCardDefinition = {
    key: 'conversations',
    title: 'aktive Gespräche',
    value: '555',
    detail: 'heute aktiv',
    trend: { value: '~ 4%', tone: 'blue' },
    icon: ConversationsIcon,
    iconTone: 'muted',
    size: 'medium',
};

const videoCard: StatisticCardDefinition = {
    key: 'video-calls',
    title: 'Videoanrufe',
    value: '4%',
    trend: { value: '~ 67%', tone: 'dark' },
    icon: VideoCallsIcon,
    iconTone: 'danger',
    size: 'small',
};

const topicCard: StatisticCardDefinition = {
    key: 'top-topic',
    title: 'Häufigstes Thema',
    value: 'Schulden',
    detail: 'Dieser Monat',
    trend: { value: '~ 59%', tone: 'dark' },
    icon: TopicIcon,
    size: 'small',
};

// A single metric card from the statistic dashboard (Figma Admin.ORISO 1-34903).
const meta = {
    title: 'Organisms/Statistic/StatisticCard',
    component: StatisticCard,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component:
                    'One metric card of the statistic dashboard: icon + title, animated value, a trend badge and — when `menuOptions` are provided — a per-slot metric picker. Styling comes from the global `statisticDashboard__*` rules; the value counts up on mount.',
            },
        },
    },
    args: {
        locale: 'de-DE',
        translate: echoTranslate,
    },
    decorators: [
        (Story) => (
            <div style={{ width: 320 }}>
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof StatisticCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Large card with a rising (red = down vs. previous month) trend and a metric menu.
export const Large: Story = {
    args: { card: requestsCard },
};

// Medium card, muted icon tone, positive trend.
export const Medium: Story = {
    args: { card: conversationsCard },
};

// Small cards: a share metric (danger tone) and a text metric (no menu).
export const Small: Story = {
    args: { card: videoCard },
};

export const TextValue: Story = {
    args: { card: topicCard },
};

// The metric picker: opening the menu lists every slot option; selecting one
// swaps the card's title/value/trend (wired via onMenuChange in the dashboard).
export const WithMetricMenu: Story = {
    args: { card: requestsCard },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: 'Anfragen nach Chattyp filtern' }));
        await waitFor(() => {
            expect(canvas.getByRole('menu')).toBeInTheDocument();
            expect(canvas.getByRole('menuitemradio', { name: /Live-Chat/ })).toBeInTheDocument();
        });
    },
};
