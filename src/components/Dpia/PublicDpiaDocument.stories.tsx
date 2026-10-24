import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { delay, http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 exports this entry via package conditions.
import { expect, within } from 'storybook/test';
import { baseTenantPublicEndpoint } from '../../appConfig';
import { PublicDpiaDocument } from './PublicDpiaDocument';
import { populatedMasterData } from './__fixtures__/masterData';

const IsolatedPublicDocument = () => {
    const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
    return (
        <QueryClientProvider client={client}>
            <PublicDpiaDocument />
        </QueryClientProvider>
    );
};
const endpoint = `${baseTenantPublicEndpoint}/dpia`;
const meta = {
    title: 'Dpia/PublicDpiaDocument',
    component: IsolatedPublicDocument,
    parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof IsolatedPublicDocument>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Populated: Story = {
    parameters: { msw: { handlers: [http.get(endpoint, () => HttpResponse.json(populatedMasterData))] } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByText('Beispielberatung Test gGmbH')).toBeVisible();
        await expect(
            within(canvas.getByRole('radiogroup', { name: 'Compliance-Preset' })).getByRole('radio', {
                name: 'DSGVO',
            }),
        ).toHaveAttribute('aria-checked', 'true');
    },
};
export const Loading: Story = {
    parameters: {
        msw: {
            handlers: [
                http.get(endpoint, async () => {
                    await delay('infinite');
                    return HttpResponse.json(null);
                }),
            ],
        },
    },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByRole('status')).toHaveTextContent('werden geladen');
    },
};
export const Unavailable: Story = {
    parameters: { msw: { handlers: [http.get(endpoint, () => new HttpResponse(null, { status: 503 }))] } },
    play: async ({ canvasElement }) => {
        await expect(await within(canvasElement).findByRole('alert')).toHaveTextContent('derzeit nicht verfügbar');
    },
};
export const Null: Story = {
    parameters: { msw: { handlers: [http.get(endpoint, () => HttpResponse.json(null))] } },
    play: async ({ canvasElement }) => {
        await expect(await within(canvasElement).findByRole('main')).toHaveTextContent('Nicht hinterlegt');
    },
};
export const Blank: Story = {
    parameters: {
        msw: {
            handlers: [
                http.get(endpoint, () =>
                    HttpResponse.json({
                        operator: { legalName: ' ', shortName: '' },
                        keyFigures: { tenants: { count: null, asOfDate: ' ' } },
                    }),
                ),
            ],
        },
    },
    play: Null.play,
};
