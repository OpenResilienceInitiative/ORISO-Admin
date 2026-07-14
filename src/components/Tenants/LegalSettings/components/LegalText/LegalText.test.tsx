import React from 'react';
import { describe, expect, it, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LegalText } from './index';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
    Trans: ({ i18nKey }: { i18nKey: string }) => <span>{i18nKey}</span>,
}));

const mocks = vi.hoisted(() => ({
    updateTenant: vi.fn(),
    canEdit: true,
}));

vi.mock('../../../../../hooks/useSingleTenantData', () => ({
    useSingleTenantData: () => ({
        data: { content: { imprint: { de: '<p>Impressum DE</p>', en: '<p>Imprint EN</p>' } } },
        isLoading: false,
    }),
}));
vi.mock('../../../../../hooks/useTenantAdminData.hook', () => ({
    useTenantAdminData: () => ({ data: { settings: { activeLanguages: ['de', 'en'] } } }),
}));
vi.mock('../../../../../hooks/useTenantAdminDataMutation.hook', () => ({
    useTenantAdminDataMutation: () => ({ mutate: mocks.updateTenant, isPending: false }),
}));
vi.mock('../../../../../hooks/useUserPermission', () => ({
    useUserPermissions: () => ({ can: () => mocks.canEdit }),
}));

// The M3 shell mock mirrors the real contract: slots render, publish submits.
vi.mock('../../../../FormPluginEditor/M3RichTextEditor', () => ({
    M3RichTextEditor: ({
        readOnly,
        onPublish,
        languageSlot,
        aboveEditorSlot,
        editorSlot,
        belowSlot,
    }: {
        readOnly?: boolean;
        onPublish?: () => void;
        languageSlot?: React.ReactNode;
        aboveEditorSlot?: React.ReactNode;
        editorSlot?: React.ReactNode;
        belowSlot?: React.ReactNode;
    }) => (
        <div data-testid="m3-shell" data-readonly={readOnly ? 'true' : 'false'}>
            {languageSlot}
            {aboveEditorSlot}
            {editorSlot}
            {!readOnly && onPublish && (
                <button type="button" onClick={() => onPublish()}>
                    legal.m3Editor.publish
                </button>
            )}
            {belowSlot}
        </div>
    ),
}));

vi.mock('../../../../FormPluginEditor/FormPluginEditor', async () => {
    const { Form } = await import('antd');

    return {
        default: ({ name }: { name?: string | string[] }) => (
            <Form.Item name={name} noStyle>
                <input />
            </Form.Item>
        ),
    };
});

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

describe('LegalText (M3 shell)', () => {
    it('submits the form values through the tenant mutation on publish', async () => {
        const user = userEvent.setup();
        render(
            <LegalText
                tenantId="1"
                fieldName={['content', 'imprint']}
                titleKey="imprint.title"
                subTitle="imprint.subTitle"
                placeHolderKey="settings.imprint.placeholder"
            />,
        );

        // The editor slot keeps one registered input per active language, so
        // publish collects them all.
        expect(document.querySelector('input#content_imprint_de')).toHaveValue('<p>Impressum DE</p>');
        expect(document.querySelector('input#content_imprint_en')).toHaveValue('<p>Imprint EN</p>');

        await user.click(screen.getByRole('button', { name: 'legal.m3Editor.publish' }));

        await vi.waitFor(() => expect(mocks.updateTenant).toHaveBeenCalledTimes(1));
        expect(mocks.updateTenant.mock.calls[0][0]).toMatchObject({
            content: { imprint: { de: '<p>Impressum DE</p>', en: '<p>Imprint EN</p>' } },
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
            content: { confirmPrivacy: false },
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

        expect(screen.getByTestId('m3-shell').dataset.readonly).toBe('true');
        expect(screen.queryByRole('button', { name: 'legal.m3Editor.publish' })).toBeNull();
        mocks.canEdit = true;
    });
});
