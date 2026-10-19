// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClosingAnimation } from './index';

const save = vi.fn();
type Choice = string | null | undefined;
const fixtures = vi.hoisted(() => ({
    own: {} as { closingAnimationDesktop?: unknown; closingAnimationMobile?: unknown },
    readError: false,
    staleDataOnError: false,
    inherited: undefined as undefined | { id?: number; theming: Record<string, unknown> },
    serverSettingsMeta: undefined as undefined | Record<string, { readOnly?: boolean }>,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../../../../hooks/useTenantAppearanceFormData', () => ({
    useTenantAppearanceFormData: () => ({
        data:
            fixtures.readError && !fixtures.staleDataOnError
                ? undefined
                : {
                      id: 1,
                      name: 'Tenant one',
                      theming: { ...fixtures.own, primaryColor: '#a5000a' },
                  },
        isLoading: false,
        isError: fixtures.readError,
        mutate: save,
    }),
}));
vi.mock('../../../../../hooks/usePublicTenantData.hook', () => ({
    usePublicTenantData: (tenantId?: string) => ({ data: tenantId === '1' ? fixtures.inherited : undefined }),
}));
vi.mock('../../../../../context/useAppConfig', () => ({
    useAppConfigContext: () => ({ settings: { serverSettingsMeta: fixtures.serverSettingsMeta } }),
}));
afterEach(() => {
    cleanup();
    save.mockClear();
    fixtures.own = {};
    fixtures.inherited = undefined;
    fixtures.readError = false;
    fixtures.staleDataOnError = false;
    fixtures.serverSettingsMeta = undefined;
});

const key = (suffix: string) => `settings.closingAnimation.${suffix}`;
const group = (device: 'desktop' | 'mobile') => screen.getByRole('radiogroup', { name: key(device) });
const choice = (device: 'desktop' | 'mobile', label: string) =>
    within(group(device)).getByRole('radio', { name: key(label) });
const edit = () => fireEvent.click(screen.getByRole('button', { name: 'edit' }));
const saveChanges = () => fireEvent.click(screen.getByText('card.edit.save'));
const inheritedAs = (desktop: Choice, mobile: Choice, id = 1) => {
    fixtures.inherited = {
        id,
        theming: { closingAnimationDesktop: desktop, closingAnimationMobile: mobile },
    };
};

describe('closing animation Appearance card', () => {
    it('offers one choice for desktop and one for mobile: the platform default plus the two designs', () => {
        render(<ClosingAnimation tenantId="1" />);
        expect(screen.getAllByRole('radiogroup')).toHaveLength(2);
        (['desktop', 'mobile'] as const).forEach((device) => {
            const radios = within(group(device)).getAllByRole('radio') as HTMLInputElement[];
            expect(radios.map((radio) => radio.value)).toEqual(['', 'CURTAIN', 'SLIDE_REVEAL']);
            expect(['inherit', 'design.CURTAIN', 'design.SLIDE_REVEAL'].map((label) => choice(device, label))).toEqual(
                radios,
            );
        });
    });

    it('describes every design in words, so the choice does not rest on a picture alone', () => {
        render(<ClosingAnimation tenantId="1" />);
        (['CURTAIN', 'SLIDE_REVEAL'] as const).forEach((design) => {
            expect(choice('desktop', `design.${design}`)).toHaveAccessibleDescription(
                key(`design.${design}.description`),
            );
        });
    });

    it('exposes nothing but the two choices: no toggle, text field, duration or colour', () => {
        const { container } = render(<ClosingAnimation tenantId="1" />);
        edit();
        expect(screen.getAllByRole('radio')).toHaveLength(6);
        ['checkbox', 'switch', 'textbox', 'spinbutton', 'slider', 'combobox'].forEach((role) => {
            expect(screen.queryAllByRole(role)).toEqual([]);
        });
        expect(container.querySelectorAll('input:not([type="radio"]), select, textarea')).toHaveLength(0);
    });

    it('selects what the tenant stored for each device', () => {
        fixtures.own = { closingAnimationDesktop: 'SLIDE_REVEAL', closingAnimationMobile: 'CURTAIN' };
        render(<ClosingAnimation tenantId="1" />);
        expect(choice('desktop', 'design.SLIDE_REVEAL')).toBeChecked();
        expect(choice('mobile', 'design.CURTAIN')).toBeChecked();
        expect(choice('desktop', 'inherit')).not.toBeChecked();
        expect(choice('mobile', 'inherit')).not.toBeChecked();
    });

    it('selects the platform default when nothing, null or an unknown value is stored', () => {
        fixtures.own = { closingAnimationDesktop: null, closingAnimationMobile: 'SPIRAL' };
        render(<ClosingAnimation tenantId="1" />);
        expect(choice('desktop', 'inherit')).toBeChecked();
        expect(choice('mobile', 'inherit')).toBeChecked();
    });

    it('reads a stored design that no longer exists (circle zoom) as the platform default', () => {
        fixtures.own = { closingAnimationDesktop: 'CIRCLE_ZOOM', closingAnimationMobile: 'CIRCLE_ZOOM' };
        render(<ClosingAnimation tenantId="1" />);
        (['desktop', 'mobile'] as const).forEach((device) => {
            expect(choice(device, 'inherit')).toBeChecked();
        });
    });

    it('shows the design the platform tenant has chosen, per device, next to the platform default', () => {
        inheritedAs('SLIDE_REVEAL', 'CURTAIN');
        render(<ClosingAnimation tenantId="1" />);
        expect(choice('desktop', 'inherit')).toHaveAccessibleDescription(
            `${key('inherit.description')} ${key('inherit.current')} ${key('design.SLIDE_REVEAL')}`,
        );
        expect(choice('mobile', 'inherit')).toHaveAccessibleDescription(
            `${key('inherit.description')} ${key('inherit.current')} ${key('design.CURTAIN')}`,
        );
    });

    it('never presents the tenant’s own design as the platform’s: the effective read already contains it', () => {
        fixtures.own = { closingAnimationDesktop: 'CURTAIN' };
        inheritedAs('CURTAIN', 'SLIDE_REVEAL');
        render(<ClosingAnimation tenantId="1" />);
        expect(choice('desktop', 'inherit')).toHaveAccessibleDescription(key('inherit.description'));
        expect(choice('mobile', 'inherit')).toHaveAccessibleDescription(
            expect.stringContaining(key('design.SLIDE_REVEAL')),
        );
    });

    it('names the curtain when the platform tenant has chosen nothing either', () => {
        inheritedAs(null, undefined);
        render(<ClosingAnimation tenantId="1" />);
        (['desktop', 'mobile'] as const).forEach((device) => {
            expect(choice(device, 'inherit')).toHaveAccessibleDescription(
                `${key('inherit.description')} ${key('inherit.current')} ${key('design.CURTAIN')}`,
            );
        });
    });

    it('names no design when the effective read is missing or belongs to another tenant', () => {
        inheritedAs('SLIDE_REVEAL', 'SLIDE_REVEAL', 2);
        render(<ClosingAnimation tenantId="1" />);
        (['desktop', 'mobile'] as const).forEach((device) => {
            expect(choice(device, 'inherit')).toHaveAccessibleDescription(key('inherit.description'));
        });
    });

    it('sends only the chosen field, so the other device and the rest of the tenant stay untouched', async () => {
        render(<ClosingAnimation tenantId="1" />);
        edit();
        fireEvent.click(choice('desktop', 'design.SLIDE_REVEAL'));
        saveChanges();
        await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
        expect(save.mock.calls[0][0]).toEqual({ theming: { closingAnimationDesktop: 'SLIDE_REVEAL' } });
    });

    it('sends both fields when both devices change', async () => {
        render(<ClosingAnimation tenantId="1" />);
        edit();
        fireEvent.click(choice('desktop', 'design.SLIDE_REVEAL'));
        fireEvent.click(choice('mobile', 'design.CURTAIN'));
        saveChanges();
        await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
        expect(save.mock.calls[0][0]).toEqual({
            theming: { closingAnimationDesktop: 'SLIDE_REVEAL', closingAnimationMobile: 'CURTAIN' },
        });
    });

    it('sends null when the administrator goes back to the platform default', async () => {
        fixtures.own = { closingAnimationDesktop: 'CURTAIN', closingAnimationMobile: 'SLIDE_REVEAL' };
        render(<ClosingAnimation tenantId="1" />);
        edit();
        fireEvent.click(choice('desktop', 'inherit'));
        saveChanges();
        await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
        expect(save.mock.calls[0][0]).toEqual({ theming: { closingAnimationDesktop: null } });
    });

    it('does not write anything when the choice ends where it started', async () => {
        fixtures.own = { closingAnimationDesktop: 'CURTAIN' };
        render(<ClosingAnimation tenantId="1" />);
        edit();
        fireEvent.click(choice('desktop', 'design.SLIDE_REVEAL'));
        fireEvent.click(choice('desktop', 'design.CURTAIN'));
        saveChanges();
        await waitFor(() => expect(screen.getByRole('button', { name: 'edit' })).toBeVisible());
        expect(save).not.toHaveBeenCalled();
    });

    it('leaves an unknown stored value alone instead of rewriting it', async () => {
        fixtures.own = { closingAnimationDesktop: 'SPIRAL' };
        render(<ClosingAnimation tenantId="1" />);
        edit();
        fireEvent.click(choice('mobile', 'design.CURTAIN'));
        saveChanges();
        await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
        expect(save.mock.calls[0][0]).toEqual({ theming: { closingAnimationMobile: 'CURTAIN' } });
    });

    it('enables both groups only while editing', () => {
        render(<ClosingAnimation tenantId="1" />);
        expect(screen.getAllByRole('radio').every((radio) => (radio as HTMLInputElement).disabled)).toBe(true);
        edit();
        expect(screen.getAllByRole('radio').every((radio) => !(radio as HTMLInputElement).disabled)).toBe(true);
    });

    it('keeps a restricted Appearance card read-only: no edit button, both groups disabled', () => {
        render(<ClosingAnimation tenantId="1" readOnly />);
        expect(screen.queryByRole('button', { name: 'edit' })).toBeNull();
        expect(screen.getAllByRole('radio')).toHaveLength(6);
        expect(screen.getAllByRole('radio').every((radio) => (radio as HTMLInputElement).disabled)).toBe(true);
    });

    it.each(['theming.closingAnimationDesktop', 'theming.closingAnimationMobile', 'appearance'])(
        'honours the server read-only flag %s',
        (setting) => {
            fixtures.serverSettingsMeta = { [setting]: { readOnly: true } };
            render(<ClosingAnimation tenantId="1" />);
            expect(screen.queryByRole('button', { name: 'edit' })).toBeNull();
            expect(screen.getAllByRole('radio').every((radio) => (radio as HTMLInputElement).disabled)).toBe(true);
        },
    );

    it('also locks the card when a refresh failed although earlier data is still around', () => {
        fixtures.readError = true;
        fixtures.staleDataOnError = true;
        render(<ClosingAnimation tenantId="1" />);
        expect(screen.getByRole('alert')).toHaveTextContent(key('loadError'));
        expect(screen.queryByRole('button', { name: 'edit' })).toBeNull();
    });

    it('shows a read failure and prevents editing unverified values', () => {
        fixtures.readError = true;
        render(<ClosingAnimation tenantId="1" />);
        expect(screen.getByRole('alert')).toHaveTextContent(key('loadError'));
        expect(screen.queryByRole('button', { name: 'edit' })).toBeNull();
        expect(screen.getAllByRole('radio').every((radio) => (radio as HTMLInputElement).disabled)).toBe(true);
    });
});
