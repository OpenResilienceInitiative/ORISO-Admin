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
}));

vi.mock('../../../../../hooks/useSingleTenantData', () => ({
    useSingleTenantData: () => ({
        data: {
            id: 1,
            content: { privacy: { de: '<p>Tenant DE</p>', en: '<p>Tenant EN</p>' } },
            settings: { activeLanguages: ['de', 'en'] },
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
        onPublish,
        helpSlot,
    }: {
        value?: string;
        onChange?: (html: string) => void;
        readOnly?: boolean;
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
                <button type="button" onClick={() => onPublish()}>
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
    it('publishes the complete merged map in the CardEditable formData structure', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        render(<LegalTextSettings agencyData={agencyData} field="privacy" onSave={onSave} />);

        // Agency override wins over the inherited tenant text for the active language.
        expect(screen.getByTestId('m3-editor')).toHaveAttribute('data-value', '<p>Agency DE</p>');

        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('button', { name: 'legal.m3Editor.publish' }));

        // Same structure the old CardEditable submitted; the untouched inherited
        // English text is kept.
        expect(onSave).toHaveBeenCalledWith({
            content: { privacy: { de: '<p>edited</p>', en: '<p>Tenant EN</p>' } },
        });
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
});
