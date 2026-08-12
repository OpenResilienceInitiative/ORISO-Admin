import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { DataProcessingAgreementContainer } from './index';

/**
 * The wired DPA card — real container, real hooks, real localStorage, mocked HTTP.
 * This is the story to look at for ORISO-Admin#708: type into the editor, press
 * "Als Entwurf speichern", reload the page and the text is still there, announced
 * by the draft notice. Publishing (PUT .../dpa) is mocked and clears the draft.
 */
const meta = {
    title: 'Organisms/Legal/DataProcessingAgreementContainer',
    component: DataProcessingAgreementContainer,
    parameters: {
        layout: 'padded',
        msw: {
            handlers: [
                http.get('*/service/users/data', () => HttpResponse.json({ id: 'platform-admin-1' })),
                http.get('*/service/tenant/public/*', () =>
                    HttpResponse.json({ id: 1, subdomain: 'app', settings: { activeLanguages: ['de', 'en'] } }),
                ),
                http.get('*/service/tenant', () =>
                    HttpResponse.json({ id: 1, name: 'ORISO', settings: { activeLanguages: ['de', 'en'] } }),
                ),
                http.get('*/service/tenantadmin/:id/dpa/versions', () =>
                    HttpResponse.json([
                        {
                            activationDate: '2026-07-13T10:22:00',
                            content: JSON.stringify({
                                de:
                                    '<h1>Auftragsverarbeitungsvertrag</h1>' +
                                    '<p>Veröffentlichte Fassung: Weisungsbindung, Vertraulichkeit, TOMs, Löschung.</p>',
                                en:
                                    '<h1>Data processing agreement</h1>' +
                                    '<p>Published version: instruction binding, confidentiality, TOMs, deletion.</p>',
                            }),
                        },
                    ]),
                ),
                http.get('*/service/tenantadmin/:id/dpa/gate', () =>
                    HttpResponse.json({ dpaPublished: true, dpaSigned: false }),
                ),
                http.put('*/service/tenantadmin/:id/dpa', () =>
                    HttpResponse.json({ dpaPublished: true, dpaSigned: false }),
                ),
            ],
        },
    },
    args: { tenantId: 1 },
} satisfies Meta<typeof DataProcessingAgreementContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PlatformAdmin: Story = {};

/** Agency view: the DPA belongs to the Träger, so there is no draft action either. */
export const ReadOnly: Story = {
    args: { readOnly: true },
};
