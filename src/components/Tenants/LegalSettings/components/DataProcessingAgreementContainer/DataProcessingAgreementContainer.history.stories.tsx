import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- Storybook subpath export
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test';
import i18n from 'i18next';
import { UserRole } from '../../../../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../../../../utils/storybook/adminStoryDecorators';
import { DataProcessingAgreementContainer } from './index';

const currentVersion = '2026-09-30T12:00:00';
const signedVersion = '2026-07-01T12:00:00';
const meta = {
    title: 'Organisms/Legal/DataProcessingAgreementContainer/Signature history',
    component: DataProcessingAgreementContainer,
    decorators: [(Story) => withAdminProviders(Story)],
    parameters: {
        layout: 'padded',
        msw: {
            handlers: [
                http.get('*/service/users/data', () => HttpResponse.json({ id: 'signature-history-admin' })),
                http.get('*/service/tenant/public/*', () =>
                    HttpResponse.json({ id: 7, settings: { activeLanguages: ['de', 'en'] } }),
                ),
                http.get('*/service/tenant', () =>
                    HttpResponse.json({ id: 7, settings: { activeLanguages: ['de', 'en'] } }),
                ),
                http.post('*/service/useradmin/dpa-invites/preview', () =>
                    HttpResponse.json({ subject: 'Contract documents', html: '<p>Forwarding preview</p>' }),
                ),
                http.get('*/service/tenantadmin/7/dpa/versions', () =>
                    HttpResponse.json([
                        {
                            activationDate: currentVersion,
                            signingDeadlineAt: '2026-10-01T12:00:00Z',
                            content: JSON.stringify({
                                de: '<h1>Vertragsunterlagen</h1><p>Aktuelle Fassung zur Prüfung und Bestätigung.</p>',
                                en: '<h1>Contract documents</h1><p>Current version for review and confirmation.</p>',
                            }),
                        },
                    ]),
                ),
                http.get('*/service/tenantadmin/7/dpa/gate', () =>
                    HttpResponse.json({
                        dpaPublished: true,
                        dpaSigned: false,
                        dpaStatus: 'OUTDATED',
                        currentDpaVersion: currentVersion,
                        signingDeadlineAt: '2026-10-01T12:00:00Z',
                        renewalGraceActive: false,
                        newCounsellingAllowed: false,
                    }),
                ),
                http.get('*/service/tenantadmin/7/dpa/status', () =>
                    HttpResponse.json({
                        tenantId: 7,
                        status: 'OUTDATED',
                        currentDpaVersion: currentVersion,
                        signedDpaVersion: signedVersion,
                        signedAt: '2026-07-02T10:30:00Z',
                        signedBy: 'Erika Mustermann',
                    }),
                ),
            ],
        },
    },
    args: { tenantId: 7 },
    beforeEach: async (context) => {
        setStoryAuth([UserRole.TenantAdmin], 7);
        await i18n.changeLanguage(context.parameters.locale ?? 'de');
    },
} satisfies Meta<typeof DataProcessingAgreementContainer>;
export default meta;
type Story = StoryObj<typeof meta>;

const historyPlay: NonNullable<Story['play']> = async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(String(i18n.t('legal.dpa.sign.previousRetained')))).toBeVisible();
    await expect(canvas.getByText(/Erika Mustermann/)).toBeVisible();
    await expect(canvas.queryByRole('button', { name: 'Veröffentlichen' })).not.toBeInTheDocument();
    await expect(canvas.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
    await expect(canvasElement.querySelector('[contenteditable="true"]')).toBeNull();
    const forwardButton = canvas.getByRole('button', { name: String(i18n.t('legal.dpa.sign.sendLink')) });
    await expect(forwardButton).toBeVisible();
    const tabToForwardButton = async (remainingTabs: number): Promise<void> => {
        if (canvasElement.ownerDocument.activeElement === forwardButton || remainingTabs === 0) return;
        await userEvent.tab();
        await tabToForwardButton(remainingTabs - 1);
    };
    await tabToForwardButton(12);
    await expect(forwardButton).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    const dialog = await within(canvasElement.ownerDocument.body).findByRole('dialog');
    await waitFor(() => expect(within(dialog).getByText(String(i18n.t('dpaForward.dialog.title')))).toBeVisible());
    await waitFor(() => expect(dialog).toBeVisible());
    await waitFor(() => expect(dialog.contains(canvasElement.ownerDocument.activeElement)).toBe(true));
    const { activeElement } = canvasElement.ownerDocument;
    if (activeElement) fireEvent.keyDown(activeElement, { key: 'Escape', code: 'Escape', keyCode: 27 });
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
};

export const RetainedOutdatedSignature: Story = { play: historyPlay };
export const RetainedOutdatedSignatureEnglish: Story = { parameters: { locale: 'en' }, play: historyPlay };
