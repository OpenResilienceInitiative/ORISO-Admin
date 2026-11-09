import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- Storybook subpath export
import { expect, userEvent, within, waitFor } from 'storybook/test';
import { AssistantIdentity } from './index';
import { walkThroughTileHelp } from '../../../../TileHelp/tileHelpStory.matrix';
import { expectReadOnlyTile, PLATFORM_RELEASE_HINT } from '../../../../CardEditable/readOnlyTileStory.matrix';
import { asLockedForOrganisationAdmin, atPhoneWidth, inTheRaster } from '../appearanceStoryHarness.matrix';
import { TENANT_DATA_KEY } from '../../../../../hooks/useTenantData.hook';
import { baseTenantPublicEndpoint, tenantAdminEndpoint } from '../../../../../appConfig';

const storageKey = 'storybook:assistant-1150';
const defaultTenant = {
    id: 1,
    name: 'Example organisation',
    subdomain: 'example',
    adminEmails: [],
    settings: {},
    licensing: {},
    content: {},
    theming: { assistantName: 'Carimat', assistantIcon: 'default', primaryColor: '#a5000a' },
};
const tenant = () => {
    try {
        return JSON.parse(localStorage.getItem(storageKey) || 'null') || defaultTenant;
    } catch {
        return defaultTenant;
    }
};
/** The same organisation without an own name or icon: both come from the level above. */
const inheritingTenant = { ...defaultTenant, theming: { primaryColor: '#a5000a' } };
const Harness = ({ readOnly = false }: { readOnly?: boolean }) => {
    const [client] = useState(() => {
        const query = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
        query.setQueryData([TENANT_DATA_KEY, 'no-tenant-claim'], tenant());
        return query;
    });
    return (
        <QueryClientProvider client={client}>
            <AssistantIdentity tenantId="1" readOnly={readOnly} />
        </QueryClientProvider>
    );
};
const meta = {
    title: 'Organisms/Tenants/AssistantIdentity',
    component: Harness,
    // The tile spans the whole row of the raster, as on the Appearance tab.
    decorators: [(Story, { parameters }) => inTheRaster(Story, 3, parameters.rasterWidth)],
    beforeEach: () => {
        localStorage.removeItem(storageKey);
    },
    parameters: {
        layout: 'padded',
        msw: {
            handlers: [
                http.get(`${baseTenantPublicEndpoint}/id/1`, () => HttpResponse.json(tenant())),
                http.get(`${tenantAdminEndpoint}/1`, () => HttpResponse.json(tenant())),
                http.put(`${tenantAdminEndpoint}/1`, async ({ request }) => {
                    const saved = await request.json();
                    localStorage.setItem(storageKey, JSON.stringify(saved));
                    return HttpResponse.json(saved);
                }),
            ],
        },
    },
} satisfies Meta<typeof Harness>;
export default meta;
type Story = StoryObj<typeof meta>;
export const SaveAndReload: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole('button', { name: /Edit|Bearbeiten/i }));
        const name = canvas.getByLabelText(/Display name|Anzeigename/i);
        await userEvent.clear(name);
        await userEvent.type(name, 'Help companion');
        await userEvent.click(canvas.getByLabelText(/Robot 2|Roboter 2/i));
        await userEvent.click(canvas.getByRole('button', { name: /Save|Speichern/i }));
        await waitFor(() => expect(tenant().theming.assistantName).toBe('Help companion'));
        await waitFor(() => expect(tenant().theming.assistantIcon).toBe('robot-1184077'));
    },
};
export const ReadOnly: Story = {
    args: { readOnly: true },
    decorators: [asLockedForOrganisationAdmin],
    play: async ({ canvasElement }) => {
        await expectReadOnlyTile(canvasElement, PLATFORM_RELEASE_HINT);
        await expect(canvasElement.querySelector('input[type="file"]')).toBeNull();
    },
};

/** Own name and icon: the "Carimat (Standard)" tile is chosen, no note about the level above. */
export const Own: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const own = await canvas.findByRole('radio', { name: /Carimat/ }, { timeout: 8000 });
        await waitFor(() => expect(own).toBeChecked());
        await expect(canvas.queryByText(/übergeordneten Ebene|level above/)).toBeNull();
        const tile = own.closest('label') as HTMLElement;
        await expect(getComputedStyle(tile).borderTopWidth).toBe('2px');
    },
};

/** Nothing of its own: "Übernehmen" is chosen and shows the inherited icon, the name note says which name applies. */
export const Inherited: Story = {
    parameters: {
        msw: {
            handlers: [
                http.get(`${baseTenantPublicEndpoint}/id/1`, () => HttpResponse.json(defaultTenant)),
                http.get(`${tenantAdminEndpoint}/1`, () => HttpResponse.json(inheritingTenant)),
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await waitFor(() => expect(canvas.getByText(/aktuell „Carimat“|currently “Carimat”/)).toBeVisible(), {
            timeout: 8000,
        });
        await expect(canvas.getByRole('radio', { name: /Übernehmen|Inherit/ })).toBeChecked();
        await expect(canvas.getByRole('img', { name: /Übernommenes Symbol|Inherited icon/ })).toBeVisible();
    },
};

/** Editing: a tile is the target; choosing "Roboter 2" moves the 2 px frame there. */
export const EditingTiles: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole('button', { name: /Edit|Bearbeiten/i }, { timeout: 8000 }));
        await userEvent.click(canvas.getByText(/^(Robot 2|Roboter 2)$/));
        const chosen = canvas.getByRole('radio', { name: /Robot 2|Roboter 2/ });
        await expect(chosen).toBeChecked();
        await expect(getComputedStyle(chosen.closest('label') as HTMLElement).borderTopWidth).toBe('2px');
        await expect(canvas.getByRole('button', { name: /Eigenes Icon hinzufügen|Add Own icon/ })).toBeVisible();
    },
};

export const PhoneInherited: Story = {
    ...Inherited,
    ...atPhoneWidth,
    parameters: { ...Inherited.parameters, ...atPhoneWidth.parameters },
};

export const HelpSlideshow: Story = {
    play: async ({ canvasElement }) => walkThroughTileHelp(canvasElement, 3),
};
