import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { UserRole } from '../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../utils/storybook/adminStoryDecorators';
import type { TopicInviteLinkDTO } from '../../api/invitelinks/topicInviteLinks';
import { UseAppConfigProvider } from '../../context/useAppConfig';
import { PermissionsSettingsView } from '../Tenants/AppSettings/PermissionsSettings/PermissionsSettingsView';
import { DEFAULT_PERMISSION_SETTINGS } from '../Tenants/AppSettings/PermissionsSettings/permissionsSettingsUtils';
import { LiveChatLinks } from './LiveChatLinks';

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
        status: 'DISABLED',
        createDate: '2026-07-21T05:34:57Z',
        expiresAt: null,
        createdByUsername: 'chucknorris',
    },
] as TopicInviteLinkDTO[];

const linksResponse = (content: TopicInviteLinkDTO[]) =>
    HttpResponse.json({ content, page: 0, size: 20, totalElements: content.length, totalPages: 1 });

/** A small server in memory, so create, switch off, switch on and delete can be clicked through. */
const statefulHandlers = () => {
    let links: TopicInviteLinkDTO[] = [...LINKS];
    const setStatus = (id: string | readonly string[] | undefined, status: TopicInviteLinkDTO['status']) => {
        links = links.map((link) => (String(link.id) === id ? { ...link, status } : link));
        return HttpResponse.json(links.find((link) => String(link.id) === id));
    };
    return [
        http.get(TOPICS_ENDPOINT, () => HttpResponse.json(TOPICS)),
        http.get(LINKS_ENDPOINT, ({ request }) => {
            const status = new URL(request.url).searchParams.get('status');
            return linksResponse(status ? links.filter((link) => link.status === status) : links);
        }),
        http.post(LINKS_ENDPOINT, async ({ request }) => {
            const body = (await request.json()) as { topicId: number };
            const created = {
                ...LINKS[0],
                id: Date.now(),
                topicId: body.topicId,
                topicName: TOPICS.find((topic) => topic.id === body.topicId)?.name ?? '',
                createDate: new Date().toISOString(),
            } as TopicInviteLinkDTO;
            links = [created, ...links];
            return HttpResponse.json(created, { status: 201 });
        }),
        http.post(`${LINKS_ENDPOINT}/:id/deactivate`, ({ params }) => setStatus(params.id, 'DISABLED')),
        http.post(`${LINKS_ENDPOINT}/:id/reactivate`, ({ params }) => setStatus(params.id, 'ACTIVE')),
        http.delete(`${LINKS_ENDPOINT}/:id`, ({ params }) => {
            links = links.filter((link) => String(link.id) !== params.id);
            return new HttpResponse(null, { status: 204 });
        }),
    ];
};

const defaultHandlers = statefulHandlers();

const meta = {
    title: 'Organisms/LiveChatLinks',
    component: LiveChatLinks,
    args: { mode: 'manage' },
    parameters: { layout: 'padded' },
    render: (args) => (
        // As wide as a tile on the settings page.
        <div style={{ maxWidth: 361 }}>
            <LiveChatLinks {...args} />
        </div>
    ),
    decorators: [
        withAdminProviders,
        (Story) => {
            setStoryAuth([UserRole.TenantAdmin]);
            return <Story />;
        },
    ],
} satisfies Meta<typeof LiveChatLinks>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The live-chat tile as it stands in Funktionszugriff, with the links in it. */
const LiveChatTile = ({ mode }: { mode: 'manage' | 'read' }) => (
    <UseAppConfigProvider>
        <PermissionsSettingsView
            tenantId="tenant-1"
            isLoading={false}
            excludeCardKeys={[]}
            formStateKey="story"
            restrictedFields={new Set<string>()}
            onToggleUpdate={() => undefined}
            initialValues={{ settings: { ...DEFAULT_PERMISSION_SETTINGS } }}
            liveChatLinks={<LiveChatLinks mode={mode} />}
        />
    </UseAppConfigProvider>
);

/** Platform admin: pick a topic, create the link, copy or deactivate it on the tile. */
export const OnTilePlatformAdmin: Story = {
    name: 'Kachel: Plattform-Admin (erstellen, deaktivieren, löschen)',
    render: () => <LiveChatTile mode="manage" />,
    parameters: { msw: { handlers: defaultHandlers } },
};

/** Träger or Beratungsstellen admin: the same tile, copy only. */
export const OnTileReadOnly: Story = {
    name: 'Kachel: Träger und Beratungsstelle (nur kopieren)',
    render: () => <LiveChatTile mode="read" />,
    parameters: { msw: { handlers: defaultHandlers } },
};

/** Platform admin (ORISO-Admin#1321): create row, list, copy and deactivate. */
export const Filled: Story = {
    parameters: { msw: { handlers: defaultHandlers } },
};

/** Platform admin, nothing created yet. */
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

/** Träger or Beratungsstellen admin: active links of their area, copy only. */
export const ReadOnly: Story = {
    args: { mode: 'read' },
    parameters: { msw: { handlers: defaultHandlers } },
};

/** Träger or Beratungsstellen admin without links: an explanation, not an empty table. */
export const ReadOnlyEmpty: Story = {
    args: { mode: 'read' },
    parameters: {
        msw: {
            handlers: [
                http.get(TOPICS_ENDPOINT, () => HttpResponse.json(TOPICS)),
                http.get(LINKS_ENDPOINT, () => linksResponse([])),
            ],
        },
    },
};
