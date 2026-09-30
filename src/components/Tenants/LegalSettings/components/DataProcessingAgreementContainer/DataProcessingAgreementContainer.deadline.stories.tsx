import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test';
import i18n from 'i18next';
import { UserRole } from '../../../../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../../../../utils/storybook/adminStoryDecorators';
import { legalDraftKey } from '../../utils/legalDraftStorage';
import { DataProcessingAgreementContainer } from './index';

const USER_ID = 'deadline-story-admin';
const DRAFT_KEY = legalDraftKey('dpa', `7:${USER_ID}`)!;
const content = {
    de: '<p>Deutscher Vertragsentwurf</p>',
    en: '<p>English draft</p>',
    fr: '<p>Texte conservé</p>',
    de__meta: '{"original":true}',
};
const initialVersion = {
    activationDate: '2026-07-01T12:00:00',
    content: JSON.stringify(content),
    signingDeadlineAt: '2099-10-30T14:30:00Z',
};
let published = false;
let publishedContent: Record<string, string> = content;
let requests: Array<{ content: unknown; deadline: string | null }> = [];
let gateReads = 0;
let graceActive = false;

const handlers = [
    http.get('*/service/users/data', () => HttpResponse.json({ id: USER_ID })),
    http.get('*/service/tenant/public/*', () =>
        HttpResponse.json({ id: 7, settings: { activeLanguages: ['de', 'en'] } }),
    ),
    http.get('*/service/tenant', () => HttpResponse.json({ id: 7, settings: { activeLanguages: ['de', 'en'] } })),
    http.get('*/service/tenantadmin/7/dpa/versions', () =>
        HttpResponse.json(published ? [{ ...initialVersion, content: JSON.stringify(publishedContent) }] : []),
    ),
    http.get('*/service/tenantadmin/7/dpa/gate', () => {
        gateReads += 1;
        return HttpResponse.json({
            dpaPublished: true,
            dpaSigned: false,
            dpaStatus: 'OUTDATED',
            signingDeadlineAt: graceActive ? initialVersion.signingDeadlineAt : '2020-01-01T12:00:00Z',
            renewalGraceActive: graceActive,
            newCounsellingAllowed: graceActive,
        });
    }),
    http.post('*/service/tenantadmin/translate', () =>
        HttpResponse.json({
            translations: { en: { content: '<p>Translated contract</p>' }, fr: { content: '<p>Contrat traduit</p>' } },
            provider: 'story',
            model: 'story',
        }),
    ),
    http.put('*/service/tenantadmin/7/dpa/v2', async ({ request }) => {
        publishedContent = (await request.json()) as typeof content;
        requests.push({
            content: publishedContent,
            deadline: new URL(request.url).searchParams.get('signingDeadlineAt'),
        });
        published = true;
        return HttpResponse.json({ dpaPublished: true, dpaSigned: false, signingDeadlineAt: '2099-10-30T14:30:00Z' });
    }),
];

const meta = {
    title: 'Organisms/Legal/DataProcessingAgreementContainer/Signing deadline',
    component: DataProcessingAgreementContainer,
    decorators: [(Story) => withAdminProviders(Story)],
    parameters: { layout: 'padded', msw: { handlers } },
    args: { tenantId: 7 },
    beforeEach: (context) => {
        published = !!context.parameters.renewal;
        publishedContent = content;
        requests = [];
        gateReads = 0;
        graceActive = !!context.parameters.grace;
        const roles = context.args.readOnly
            ? [UserRole.RestrictedAgencyAdmin]
            : [UserRole.TenantAdmin, UserRole.AgencyAdmin];
        setStoryAuth(
            context.parameters.singleTenantRecipient ? [UserRole.SingleTenantAdmin] : roles,
            context.args.readOnly || context.parameters.singleTenantRecipient ? 7 : 0,
        );
        localStorage.setItem(
            DRAFT_KEY,
            JSON.stringify({
                content,
                savedAt: '2026-09-30T10:00:00Z',
                baseVersionId: published ? initialVersion.activationDate : undefined,
            }),
        );
        return () => localStorage.removeItem(DRAFT_KEY);
    },
} satisfies Meta<typeof DataProcessingAgreementContainer>;
export default meta;
type Story = StoryObj<typeof meta>;

const openDeadline = async (canvasElement: HTMLElement, translate = false) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole('button', { name: 'Veröffentlichen' }));
    const body = within(canvasElement.ownerDocument.body);
    const translation = await body.findByRole('dialog', { name: 'Automatisch übersetzen & veröffentlichen' });
    await userEvent.click(
        within(translation).getByRole('button', {
            name: translate ? 'Übersetzen & veröffentlichen' : 'Ohne Übersetzung veröffentlichen',
        }),
    );
    const deadline = await body.findByRole('dialog', { name: /AVV veröffentlichen/ });
    await waitFor(() => expect(deadline.contains(canvasElement.ownerDocument.activeElement)).toBe(true));
    return deadline;
};

const publishPlay: NonNullable<Story['play']> = async ({ canvasElement, parameters }) => {
    const canvas = within(canvasElement);
    await canvas.findByText('Deutscher Vertragsentwurf');
    const draftBefore = localStorage.getItem(DRAFT_KEY);
    const dismissWithoutPublishing = async (dismiss: 'cancel' | 'escape' | 'close') => {
        const dialog = await openDeadline(canvasElement);
        await expect(within(dialog).getByLabelText('Unterschriftsfrist (Europe/Berlin)')).toHaveValue('');
        if (dismiss === 'cancel') await userEvent.click(within(dialog).getByRole('button', { name: 'Abbrechen' }));
        // rc-dialog reads native keyCode; userEvent's synthetic Escape leaves it zero.
        if (dismiss === 'escape')
            fireEvent.keyDown(canvasElement.ownerDocument.activeElement!, {
                key: 'Escape',
                code: 'Escape',
                keyCode: 27,
            });
        if (dismiss === 'close') await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
        await waitFor(() => expect(dialog, dismiss).not.toBeInTheDocument());
        await expect(requests).toHaveLength(0);
        await expect(localStorage.getItem(DRAFT_KEY)).toBe(draftBefore);
    };
    await dismissWithoutPublishing('cancel');
    await dismissWithoutPublishing('escape');
    await dismissWithoutPublishing('close');
    const dialog = await openDeadline(canvasElement, !parameters.renewal);
    const input = within(dialog).getByLabelText('Unterschriftsfrist (Europe/Berlin)');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Veröffentlichen' }));
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(requests).toHaveLength(0);
    fireEvent.change(input, { target: { value: '2099-10-30T15:30' } });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Veröffentlichen' }));
    await waitFor(() => expect(requests).toHaveLength(1));
    await expect(requests[0].deadline).toBe('2099-10-30T15:30:00+01:00');
    if (parameters.renewal) await expect(requests[0].content).toEqual(content);
    else {
        await expect(publishedContent.de).toBe(content.de);
        await expect(publishedContent.de__meta).toBe(content.de__meta);
        await expect(publishedContent.en).toBe('<p>Translated contract</p>');
        await expect(publishedContent.fr).toBe('<p>Contrat traduit</p>');
        await expect(JSON.parse(publishedContent.en__meta)).toMatchObject({ mt: true, src: 'de' });
    }
    await waitFor(() => expect(localStorage.getItem(DRAFT_KEY)).toBeNull());
    await expect(await canvas.findByText(/Unterschriftsfrist:.*Europe\/Berlin/)).toBeVisible();
};

export const FirstPublication: Story = { play: publishPlay };
export const Renewal: Story = { parameters: { renewal: true }, play: publishPlay };
export const FailedPublicationKeepsDraft: Story = {
    parameters: {
        renewal: true,
        msw: {
            handlers: [
                http.put('*/service/tenantadmin/7/dpa/v2', async ({ request }) => {
                    requests.push({
                        content: await request.json(),
                        deadline: new URL(request.url).searchParams.get('signingDeadlineAt'),
                    });
                    return new HttpResponse(null, { status: 500 });
                }),
                ...handlers,
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await canvas.findByText('Deutscher Vertragsentwurf');
        const draftBefore = localStorage.getItem(DRAFT_KEY);
        const dialog = await openDeadline(canvasElement);
        fireEvent.change(within(dialog).getByLabelText('Unterschriftsfrist (Europe/Berlin)'), {
            target: { value: '2099-10-30T15:30' },
        });
        await userEvent.click(within(dialog).getByRole('button', { name: 'Veröffentlichen' }));
        await expect(await canvas.findByText(String(i18n.t('tenants.legal.version.publishError')))).toBeVisible();
        await expect(localStorage.getItem(DRAFT_KEY)).toBe(draftBefore);
        await expect(requests).toHaveLength(1);
        await expect(publishedContent).toEqual(content);
        await expect(canvasElement.ownerDocument.querySelector('.ant-notification-notice-error')).toBeNull();
    },
};
export const AgencyRecipientAfterExpiry: Story = {
    args: { readOnly: true },
    parameters: { renewal: true },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByText(/Unterschriftsfrist:.*Europe\/Berlin/)).toBeVisible();
        await expect(await canvas.findByText('Die neue AVV-Fassung muss erneut unterschrieben werden.')).toBeVisible();
        await expect(canvas.getByText(/Neue Beratungen sind gesperrt/)).toBeVisible();
        await expect(canvas.queryByRole('button', { name: 'Veröffentlichen' })).not.toBeInTheDocument();
        await expect(canvas.queryByRole('button', { name: 'Bearbeiten' })).not.toBeInTheDocument();
        await expect(gateReads).toBeGreaterThan(0);
        await expect(requests).toHaveLength(0);
    },
};

export const AgencyRecipientDuringGrace: Story = {
    args: { readOnly: true },
    parameters: { renewal: true, grace: true },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByText(String(i18n.t('legal.dpa.deadline.grace')))).toBeVisible();
        await expect(canvas.getByText(String(i18n.t('legal.dpa.deadline.state.OUTDATED')))).toBeVisible();
        await expect(canvas.queryByText(String(i18n.t('legal.dpa.deadline.state.VALID')))).not.toBeInTheDocument();
        await expect(canvas.queryByRole('button', { name: 'Veröffentlichen' })).not.toBeInTheDocument();
        await expect(requests).toHaveLength(0);
    },
};

export const SingleTenantRecipientAfterExpiry: Story = {
    parameters: {
        renewal: true,
        singleTenantRecipient: true,
        msw: {
            handlers: [
                http.post('*/service/tenantadmin/7/dpa/invite', () =>
                    HttpResponse.json({
                        signLink: 'https://example.org/dpa?token=renewed-contract',
                        expiresAt: '2099-11-01T12:00:00Z',
                    }),
                ),
                http.post('*/service/useradmin/dpa-invites/preview', () =>
                    HttpResponse.json({ subject: 'AVV', html: '<p>Mail preview</p>' }),
                ),
                ...handlers,
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await canvas.findByText('Deutscher Vertragsentwurf');
        await expect(await canvas.findByText(/Neue Beratungen sind gesperrt/)).toBeVisible();
        await expect(canvas.queryByRole('button', { name: 'Veröffentlichen' })).not.toBeInTheDocument();
        await expect(
            canvas.queryByRole('button', { name: /^(Bearbeiten|Entwurf bearbeiten)$/ }),
        ).not.toBeInTheDocument();
        await expect(canvasElement.querySelector('[contenteditable="true"]')).toBeNull();
        await userEvent.click(await canvas.findByRole('button', { name: String(i18n.t('legal.dpa.sign.sendLink')) }));
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(
            await body.findByRole('button', { name: String(i18n.t('dpaForward.dialog.linkCreate')) }),
        );
        const link = await body.findByDisplayValue('https://example.org/dpa?token=renewed-contract');
        await waitFor(() => expect(link).toBeVisible());
        await userEvent.click(body.getByRole('button', { name: String(i18n.t('dpaForward.dialog.confirm')) }));
        await expect(
            await canvas.findByRole('button', { name: String(i18n.t('legal.dpa.sign.openLink')) }),
        ).toBeVisible();
        await expect(requests).toHaveLength(0);
    },
};

/** Admin can be released before the backend extends gate-reader permissions. */
export const LegacyAgencyRecipient: Story = {
    args: { readOnly: true },
    parameters: {
        renewal: true,
        msw: {
            handlers: [
                http.get('*/service/tenantadmin/7/dpa/gate', () => {
                    gateReads += 1;
                    return new HttpResponse(null, { status: 403 });
                }),
                http.get('*/service/tenantadmin/7/dpa/versions', () =>
                    HttpResponse.json([
                        { activationDate: initialVersion.activationDate, content: initialVersion.content },
                    ]),
                ),
                ...handlers,
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await canvas.findByText('Deutscher Vertragsentwurf');
        await waitFor(() => expect(gateReads).toBeGreaterThan(0));
        await expect(canvas.queryByText(/Unterschriftsfrist:/)).not.toBeInTheDocument();
        await expect(canvas.queryByText(String(i18n.t('legal.dpa.deadline.grace')))).not.toBeInTheDocument();
        await expect(canvas.queryByRole('button', { name: 'Veröffentlichen' })).not.toBeInTheDocument();
    },
};
