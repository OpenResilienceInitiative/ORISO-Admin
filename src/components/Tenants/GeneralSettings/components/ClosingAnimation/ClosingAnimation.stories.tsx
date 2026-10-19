import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- Storybook subpath export
import { expect, userEvent, within, waitFor } from 'storybook/test';
import { ClosingAnimation } from './index';
import { TENANT_DATA_KEY } from '../../../../../hooks/useTenantData.hook';
import { baseTenantPublicEndpoint, tenantAdminEndpoint } from '../../../../../appConfig';

const storageKey = 'storybook:closing-animation-1737';
/** What the platform tenant has chosen: a tenant that stores nothing inherits exactly this. */
const platform = { closingAnimationDesktop: 'SLIDE_REVEAL', closingAnimationMobile: 'CURTAIN' };
const baseTenant = {
    id: 1,
    name: 'Example organisation',
    subdomain: 'example',
    adminEmails: [],
    settings: {},
    licensing: {},
    content: {},
    theming: { assistantName: 'Carimat', primaryColor: '#a5000a' } as Record<string, unknown>,
};
type Tenant = typeof baseTenant;
const stored = (): Tenant => {
    try {
        return JSON.parse(localStorage.getItem(storageKey) || 'null') || baseTenant;
    } catch {
        return baseTenant;
    }
};
/** The public read applies inheritance, like TenantService's EffectiveThemingApplier. */
const effective = (): Tenant => {
    const own = stored();
    return {
        ...own,
        theming: {
            ...own.theming,
            closingAnimationDesktop: own.theming.closingAnimationDesktop ?? platform.closingAnimationDesktop,
            closingAnimationMobile: own.theming.closingAnimationMobile ?? platform.closingAnimationMobile,
        },
    };
};
const own = (theming: Record<string, unknown>) => () => {
    localStorage.setItem(storageKey, JSON.stringify({ ...baseTenant, theming: { ...baseTenant.theming, ...theming } }));
};

const Harness = ({ readOnly = false }: { readOnly?: boolean }) => {
    const [client] = useState(() => {
        const query = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
        query.setQueryData([TENANT_DATA_KEY, 'no-tenant-claim'], stored());
        return query;
    });
    return (
        <QueryClientProvider client={client}>
            <ClosingAnimation tenantId="1" readOnly={readOnly} />
        </QueryClientProvider>
    );
};

/**
 * The administrator's closing-animation choice: one design for desktop and one for mobile, each
 * "Platform default" or one of two designs. The mock answers like TenantService: the admin read
 * returns only what the tenant stored, the public read adds the platform tenant's value
 * (desktop Slide reveal, mobile Curtain). Check it at Phone 390 and Desktop 1440.
 */
const meta = {
    title: 'Organisms/Tenants/ClosingAnimation',
    component: Harness,
    beforeEach: () => {
        localStorage.removeItem(storageKey);
    },
    parameters: {
        layout: 'padded',
        msw: {
            handlers: [
                http.get(`${baseTenantPublicEndpoint}/id/1`, () => HttpResponse.json(effective())),
                http.get(`${tenantAdminEndpoint}/1`, () => HttpResponse.json(stored())),
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

/** The card shows a spinner until the tenant is read, so the group is looked up asynchronously. */
const groupOf = (canvas: ReturnType<typeof within>, device: RegExp) =>
    canvas.findByRole('radiogroup', { name: device }).then((element) => within(element));
const DESKTOP = /Desktop/i;
const MOBILE = /Mobile|Mobil/i;
const PLATFORM_DEFAULT = /Platform default|Plattform-Standard/i;
const CURTAIN = /^(Curtain|Vorhang)$/i;
const SLIDE_REVEAL = /^(Slide reveal|Wegschieben)$/i;
/** Re-reads the group on every try, because the card remounts when the saved tenant arrives. */
const checkedIn = (canvas: ReturnType<typeof within>, device: RegExp, name: RegExp) =>
    waitFor(async () => expect((await groupOf(canvas, device)).getByRole('radio', { name })).toBeChecked());

/** Nothing stored: both groups sit on "Platform default" and name what the platform tenant chose. */
export const InheritsPlatformValue: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const desktop = await groupOf(canvas, DESKTOP);
        const mobile = await groupOf(canvas, MOBILE);
        await expect(desktop.getByRole('radio', { name: PLATFORM_DEFAULT })).toBeChecked();
        await expect(mobile.getByRole('radio', { name: PLATFORM_DEFAULT })).toBeChecked();
        await waitFor(() =>
            expect(desktop.getByRole('radio', { name: PLATFORM_DEFAULT })).toHaveAccessibleDescription(
                /Slide reveal|Wegschieben/,
            ),
        );
        await expect(mobile.getByRole('radio', { name: PLATFORM_DEFAULT })).toHaveAccessibleDescription(
            /Curtain|Vorhang/,
        );
        // The card is a read-only view until the pencil is pressed.
        await expect(canvas.getAllByRole('radio')).toHaveLength(6);
        await expect(desktop.getByRole('radio', { name: CURTAIN })).toBeDisabled();
    },
};

/** Arrow keys move the choice inside a group; Save writes exactly the fields that changed. */
export const SaveAndReload: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole('button', { name: /Edit|Bearbeiten/i }));
        // Desktop by keyboard only: Platform default -> Curtain -> Slide reveal.
        const desktop = await groupOf(canvas, DESKTOP);
        desktop.getByRole('radio', { name: PLATFORM_DEFAULT }).focus();
        await userEvent.keyboard('{ArrowDown}{ArrowDown}');
        await expect(desktop.getByRole('radio', { name: SLIDE_REVEAL })).toBeChecked();
        // Mobile by pointer.
        const mobile = await groupOf(canvas, MOBILE);
        await userEvent.click(mobile.getByRole('radio', { name: CURTAIN }));
        await userEvent.click(canvas.getByRole('button', { name: /Save|Speichern/i }));
        await waitFor(() => expect(stored().theming.closingAnimationDesktop).toBe('SLIDE_REVEAL'));
        expect(stored().theming.closingAnimationMobile).toBe('CURTAIN');
        // After the save the card shows what is stored.
        await checkedIn(canvas, DESKTOP, SLIDE_REVEAL);
        await checkedIn(canvas, MOBILE, CURTAIN);
    },
};

/** Going back to "Platform default" stores null, so the platform tenant's choice applies again. */
export const BackToPlatformDefault: Story = {
    beforeEach: own({ closingAnimationDesktop: 'CURTAIN', closingAnimationMobile: 'SLIDE_REVEAL' }),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole('button', { name: /Edit|Bearbeiten/i }));
        const desktop = await groupOf(canvas, DESKTOP);
        await expect(desktop.getByRole('radio', { name: CURTAIN })).toBeChecked();
        await userEvent.click(desktop.getByRole('radio', { name: PLATFORM_DEFAULT }));
        await userEvent.click(canvas.getByRole('button', { name: /Save|Speichern/i }));
        await waitFor(() => expect(stored().theming.closingAnimationDesktop).toBeNull());
        expect(stored().theming.closingAnimationMobile).toBe('SLIDE_REVEAL');
        // The untouched device keeps its own choice on screen after the save.
        await checkedIn(canvas, MOBILE, SLIDE_REVEAL);
        await checkedIn(canvas, DESKTOP, PLATFORM_DEFAULT);
    },
};

/** A tenant admin without the Appearance permission sees the choice but cannot change it. */
export const ReadOnly: Story = {
    args: { readOnly: true },
    beforeEach: own({ closingAnimationDesktop: 'SLIDE_REVEAL' }),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await checkedIn(canvas, DESKTOP, SLIDE_REVEAL);
        await expect(canvas.queryByRole('button', { name: /Edit|Bearbeiten/i })).toBeNull();
        canvas.getAllByRole('radio').forEach((radio) => expect(radio).toBeDisabled());
    },
};
