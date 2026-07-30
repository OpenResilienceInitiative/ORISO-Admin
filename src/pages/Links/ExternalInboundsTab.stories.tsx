import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { UserRole } from '../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../utils/storybook/adminStoryDecorators';
import type { TopicInviteLinkDTO } from '../../api/invitelinks/topicInviteLinks';
import { ExternalInboundsTab } from './ExternalInboundsTab';

const LINKS_ENDPOINT = '*/service/useradmin/invitelinks';
const TOPICS_ENDPOINT = '*/service/topic/';

const TOPICS = [
    { id: 1, name: 'U25 Suizidprävention', status: 'ACTIVE' },
    { id: 2, name: 'Kinder- und Jugendlichenberatung', status: 'ACTIVE' },
    { id: 3, name: 'Schwangerschaftsberatung', status: 'ACTIVE' },
];

const LINKS: TopicInviteLinkDTO[] = [
    {
        id: 501,
        token: 'inbound-token-501',
        topicId: 1,
        topicName: 'U25 Suizidprävention',
        linkKind: 'EXTERNAL_INBOUND',
        chatType: 'LIVE_CHAT',
        anonymity: 'FULL',
        status: 'ACTIVE',
        createDate: '2026-07-28T11:26:56Z',
        expiresAt: null,
        createdByUsername: 'testingadmin',
    },
    {
        id: 502,
        token: 'inbound-token-502',
        topicId: 1,
        topicName: 'U25 Suizidprävention',
        linkKind: 'EXTERNAL_INBOUND',
        chatType: 'LIVE_CHAT',
        anonymity: 'FULL',
        status: 'ACTIVE',
        createDate: '2026-07-26T09:33:32Z',
        expiresAt: '2026-08-27T17:31:48Z',
        createdByUsername: 'chucknorris',
    },
    {
        id: 503,
        token: 'inbound-token-503',
        topicId: 2,
        topicName: 'Kinder- und Jugendlichenberatung',
        linkKind: 'EXTERNAL_INBOUND',
        chatType: 'LIVE_CHAT',
        anonymity: 'FULL',
        status: 'EXPIRED',
        createDate: '2026-07-21T05:34:57Z',
        expiresAt: '2026-07-25T05:34:57Z',
        createdByUsername: 'chucknorris',
    },
] as TopicInviteLinkDTO[];

const linksResponse = (content: TopicInviteLinkDTO[]) =>
    HttpResponse.json({ content, page: 0, size: 20, totalElements: content.length, totalPages: 1 });

const defaultHandlers = [
    http.get(TOPICS_ENDPOINT, () => HttpResponse.json(TOPICS)),
    http.get(LINKS_ENDPOINT, () => linksResponse(LINKS)),
    http.post(LINKS_ENDPOINT, () => HttpResponse.json({ ...LINKS[0], id: 599 }, { status: 201 })),
];

const meta = {
    title: 'Organisms/Pages/Links/ExternalInbounds',
    component: ExternalInboundsTab,
    parameters: { layout: 'padded' },
    decorators: [
        withAdminProviders,
        (Story) => {
            setStoryAuth([UserRole.TenantAdmin]);
            return <Story />;
        },
    ],
} satisfies Meta<typeof ExternalInboundsTab>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The tab as an admin meets it: the create row runs the M3 outlined selects with
 * floating labels (the same control the invite composer uses), the create action is
 * an M3 filled button, and the status/anonymity chips are tonal — no traffic lights.
 */
export const Filled: Story = {
    parameters: { msw: { handlers: defaultHandlers } },
};

/** Nothing created yet — the create row is the only thing on the page. */
export const Empty: Story = {
    parameters: {
        msw: {
            handlers: [
                http.get(TOPICS_ENDPOINT, () => HttpResponse.json(TOPICS)),
                http.get(LINKS_ENDPOINT, () => linksResponse([])),
            ],
        },
    },
};
