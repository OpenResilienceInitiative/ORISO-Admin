import React from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LegalTextSettings } from './index';
import { AgencyData } from '../../../../../types/agency';
import { PermissionAction } from '../../../../../enums/PermissionAction';
import { Resource } from '../../../../../enums/Resource';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

const mocks = vi.hoisted(() => ({
    canEdit: true,
    can: vi.fn((): boolean => mocks.canEdit),
    activeLanguages: ['de', 'en'] as string[],
}));

// The version history is an independent react-query call; this suite has no client.
vi.mock('../../../../../hooks/useLegalTextVersions.hook', () => ({ useLegalTextVersions: () => ({ data: [] }) }));
vi.mock('../../../../../hooks/useSingleTenantData', () => ({
    useSingleTenantData: () => ({
        data: {
            id: 1,
            content: { privacy: { de: '<p>Tenant DE</p>', en: '<p>Tenant EN</p>' } },
            settings: { activeLanguages: mocks.activeLanguages },
        },
        isLoading: false,
    }),
}));
vi.mock('../../../../../hooks/useUserPermission', () => ({
    useUserPermissions: () => ({ can: mocks.can }),
}));
vi.mock('../../../../../context/FeatureContext', () => ({
    useFeatureContext: () => ({ isEnabled: () => false }),
}));

// The M3 editor mock mirrors the real contract: echoes the value, emits an edit
// via onChange and exposes the publish action unless read-only.
vi.mock('../../../../../components/FormPluginEditor/M3RichTextEditor', () => ({
    M3RichTextEditor: ({
        value,
        onChange,
        readOnly,
        publishing,
        onPublish,
        helpSlot,
    }: {
        value?: string;
        onChange?: (html: string) => void;
        readOnly?: boolean;
        publishing?: boolean;
        onPublish?: () => void;
        helpSlot?: React.ReactNode;
    }) => (
        <div data-testid="m3-editor" data-value={value} data-readonly={readOnly ? 'true' : 'false'}>
            {helpSlot}
            {!readOnly && onChange && (
                <button type="button" onClick={() => onChange('<p>edited</p>')}>
                    edit
                </button>
            )}
            {!readOnly && onPublish && (
                <button type="button" disabled={publishing} onClick={() => onPublish()}>
                    legal.m3Editor.publish
                </button>
            )}
        </div>
    ),
}));

beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });
});

const agencyData = {
    id: 5,
    tenantId: '1',
    content: { privacy: { de: '<p>Agency DE</p>' } },
} as unknown as AgencyData;

describe('LegalTextSettings (M3 editor)', () => {
    it('publishes only agency overrides and local edits, not inherited tenant values', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        render(<LegalTextSettings agencyData={agencyData} field="privacy" onSave={onSave} />);

        // Agency override wins over the inherited tenant text for the active language.
        expect(screen.getByTestId('m3-editor')).toHaveAttribute('data-value', '<p>Agency DE</p>');

        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('button', { name: 'legal.m3Editor.publish' }));

        expect(onSave).toHaveBeenCalledWith({
            content: { privacy: { de: '<p>edited</p>' } },
        });
    });

    it('prevents duplicate publishing while the agency mutation is pending', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        render(<LegalTextSettings agencyData={agencyData} field="privacy" onSave={onSave} saving />);

        const publish = screen.getByRole('button', { name: 'legal.m3Editor.publish' });
        expect(publish).toBeDisabled();
        await user.click(publish);
        expect(onSave).not.toHaveBeenCalled();
    });

    it('renders read-only without a publish action when the permission is missing', () => {
        mocks.canEdit = false;
        const onSave = vi.fn();
        render(<LegalTextSettings agencyData={agencyData} field="privacy" onSave={onSave} />);

        expect(screen.getByTestId('m3-editor').dataset.readonly).toBe('true');
        expect(screen.queryByRole('button', { name: 'legal.m3Editor.publish' })).toBeNull();
        // The read-only state must come from the exact legal-text permission contract.
        expect(mocks.can).toHaveBeenCalledWith(PermissionAction.Update, Resource.LegalText);
        mocks.canEdit = true;
    });

    it('falls back to German when the tenant has an explicitly empty language list', () => {
        mocks.activeLanguages = [];
        render(<LegalTextSettings agencyData={agencyData} field="privacy" onSave={vi.fn()} />);
        expect(screen.getByTestId('m3-editor')).toHaveAttribute('data-value', '<p>Agency DE</p>');
        mocks.activeLanguages = ['de', 'en'];
    });

    it('drops unsaved edits when switching to another agency', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        const { rerender } = render(<LegalTextSettings agencyData={agencyData} field="privacy" onSave={onSave} />);
        await user.click(screen.getByRole('button', { name: 'edit' }));
        expect(screen.getByTestId('m3-editor')).toHaveAttribute('data-value', '<p>edited</p>');

        const otherAgency = {
            ...agencyData,
            id: 6,
            content: { privacy: { de: '<p>Other agency</p>' } },
        } as unknown as AgencyData;
        rerender(<LegalTextSettings agencyData={otherAgency} field="privacy" onSave={onSave} />);

        expect(screen.getByTestId('m3-editor')).toHaveAttribute('data-value', '<p>Other agency</p>');
        await user.click(screen.getByRole('button', { name: 'legal.m3Editor.publish' }));
        expect(onSave).toHaveBeenLastCalledWith({ content: { privacy: { de: '<p>Other agency</p>' } } });
    });

    it('drops unsaved edits when the agency moves to another tenant', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        const { rerender } = render(<LegalTextSettings agencyData={agencyData} field="privacy" onSave={onSave} />);
        await user.click(screen.getByRole('button', { name: 'edit' }));
        expect(screen.getByTestId('m3-editor')).toHaveAttribute('data-value', '<p>edited</p>');

        rerender(
            <LegalTextSettings
                agencyData={{ ...agencyData, tenantId: '2' } as unknown as AgencyData}
                field="privacy"
                onSave={onSave}
            />,
        );

        expect(screen.getByTestId('m3-editor')).toHaveAttribute('data-value', '<p>Agency DE</p>');
    });
});
