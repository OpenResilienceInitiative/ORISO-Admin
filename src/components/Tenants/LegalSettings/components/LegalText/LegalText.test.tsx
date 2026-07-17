import React from 'react';
import { describe, expect, it, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LegalText } from './index';
import { PermissionAction } from '../../../../../enums/PermissionAction';
import { Resource } from '../../../../../enums/Resource';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
    Trans: ({ i18nKey }: { i18nKey: string }) => <span>{i18nKey}</span>,
}));

const DEFAULT_IMPRINT: unknown = { de: '<p>Impressum DE</p>', en: '<p>Imprint EN</p>', fr: '<p>Imprint FR</p>' };

const mocks = vi.hoisted(() => ({
    updateTenant: vi.fn(),
    canEdit: true,
    can: vi.fn((): boolean => mocks.canEdit),
    imprint: undefined as unknown,
    activeLanguages: ['de', 'en'] as string[],
}));

vi.mock('../../../../../hooks/useTenantAppearanceFormData', () => ({
    useTenantAppearanceFormData: () => ({
        data: {
            content: {
                imprint: mocks.imprint,
            },
            settings: { activeLanguages: mocks.activeLanguages },
        },
        isLoading: false,
        mutate: mocks.updateTenant,
        isPending: false,
    }),
}));
vi.mock('../../../../../hooks/useUserPermission', () => ({
    useUserPermissions: () => ({ can: mocks.can }),
}));

// The M3 editor mock mirrors the real contract: echoes the value, renders the
// slots, emits an edit via onChange and exposes the publish action.
vi.mock('../../../../FormPluginEditor/M3RichTextEditor', () => ({
    M3RichTextEditor: ({
        value,
        onChange,
        readOnly,
        onPublish,
        helpSlot,
        aboveEditorSlot,
        belowSlot,
    }: {
        value?: string;
        onChange?: (html: string) => void;
        readOnly?: boolean;
        onPublish?: () => void;
        helpSlot?: React.ReactNode;
        aboveEditorSlot?: React.ReactNode;
        belowSlot?: React.ReactNode;
    }) => (
        <div data-testid="m3-editor" data-value={value} data-readonly={readOnly ? 'true' : 'false'}>
            {helpSlot}
            {aboveEditorSlot}
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
            {belowSlot}
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

    const originalGetComputedStyle = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el: Element) => originalGetComputedStyle(el));
});

beforeEach(() => {
    mocks.imprint = DEFAULT_IMPRINT;
    mocks.activeLanguages = ['de', 'en'];
    mocks.canEdit = true;
});

describe('LegalText (M3 editor)', () => {
    it('publishes the complete language map — untouched and unknown languages survive an edit', async () => {
        const user = userEvent.setup();
        mocks.updateTenant.mockClear();
        render(
            <LegalText
                tenantId="1"
                fieldName={['content', 'imprint']}
                titleKey="imprint.title"
                subTitle="imprint.subTitle"
                placeHolderKey="settings.imprint.placeholder"
            />,
        );

        // The editor shows the active (default: de) language content.
        expect(screen.getByTestId('m3-editor')).toHaveAttribute('data-value', '<p>Impressum DE</p>');

        // Edit only German, then publish.
        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('button', { name: 'legal.m3Editor.publish' }));

        expect(mocks.updateTenant).toHaveBeenCalledTimes(1);
        // en (untouched active language) and fr (stored but not even offered) are kept.
        expect(mocks.updateTenant.mock.calls[0][0]).toEqual({
            content: {
                imprint: { de: '<p>edited</p>', en: '<p>Imprint EN</p>', fr: '<p>Imprint FR</p>' },
            },
        });
    });

    it('routes publish through the confirmation modal and stamps the confirm field', async () => {
        const user = userEvent.setup();
        mocks.updateTenant.mockClear();
        render(
            <LegalText
                tenantId="1"
                fieldName={['content', 'imprint']}
                titleKey="privacy.title"
                subTitle="privacy.subTitle"
                placeHolderKey="settings.privacy.placeholder"
                showConfirmationModal={{
                    titleKey: 'privacy.confirmation.title',
                    contentKey: 'privacy.confirmation.content',
                    cancelLabelKey: 'privacy.confirmation.confirm',
                    okLabelKey: 'privacy.confirmation.cancel',
                    field: ['content', 'confirmPrivacy'],
                }}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'legal.m3Editor.publish' }));

        // No save yet — the modal must decide first.
        await screen.findByText('privacy.confirmation.content');
        expect(mocks.updateTenant).not.toHaveBeenCalled();

        await user.click(screen.getByRole('button', { name: 'privacy.confirmation.cancel' }));

        await vi.waitFor(() => expect(mocks.updateTenant).toHaveBeenCalledTimes(1));
        expect(mocks.updateTenant.mock.calls[0][0]).toMatchObject({
            content: {
                confirmPrivacy: false,
                // fr (stored but not even offered) must survive the modal save path too.
                imprint: { de: '<p>Impressum DE</p>', en: '<p>Imprint EN</p>', fr: '<p>Imprint FR</p>' },
            },
        });
    });

    it('renders read-only without a publish action when the permission is missing', () => {
        mocks.canEdit = false;
        render(
            <LegalText
                tenantId="1"
                fieldName={['content', 'imprint']}
                titleKey="imprint.title"
                subTitle="imprint.subTitle"
                placeHolderKey="settings.imprint.placeholder"
            />,
        );

        expect(screen.getByTestId('m3-editor').dataset.readonly).toBe('true');
        expect(screen.queryByRole('button', { name: 'legal.m3Editor.publish' })).toBeNull();
        // The read-only state must come from the exact legal-text permission contract.
        expect(mocks.can).toHaveBeenCalledWith(PermissionAction.Update, Resource.LegalText);
        mocks.canEdit = true;
    });

    it('preserves legacy plain-string content on load and publish (not dropped to {})', async () => {
        const user = userEvent.setup();
        mocks.updateTenant.mockClear();
        // Stored content from before the language-map migration is a bare HTML string.
        mocks.imprint = '<p>Legacy Impressum</p>';
        render(
            <LegalText
                tenantId="1"
                fieldName={['content', 'imprint']}
                titleKey="imprint.title"
                subTitle="imprint.subTitle"
                placeHolderKey="settings.imprint.placeholder"
            />,
        );

        // The legacy string is shown under the first configured language, not empty.
        expect(screen.getByTestId('m3-editor')).toHaveAttribute('data-value', '<p>Legacy Impressum</p>');

        // Publishing without touching it keeps the content instead of overwriting with {}.
        await user.click(screen.getByRole('button', { name: 'legal.m3Editor.publish' }));

        expect(mocks.updateTenant).toHaveBeenCalledTimes(1);
        expect(mocks.updateTenant.mock.calls[0][0]).toEqual({
            content: { imprint: { de: '<p>Legacy Impressum</p>' } },
        });
    });
});
