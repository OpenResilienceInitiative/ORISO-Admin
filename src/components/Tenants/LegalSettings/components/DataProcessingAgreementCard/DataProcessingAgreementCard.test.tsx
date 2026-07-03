import React from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataProcessingAgreementCard } from './index';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (_k: string, fallback?: string) => fallback ?? _k }),
}));

// TipTap pulls heavy editor deps; stub it to a plain node that echoes its value
// and lets the test emit an edit when an onChange handler is wired.
vi.mock('../../../../FormPluginEditor/TiptapEditor', () => ({
    default: ({ value, onChange }: { value: string; onChange?: (html: string) => void }) => (
        <div data-testid="editor" data-value={value}>
            {onChange && (
                <button type="button" onClick={() => onChange('<p>edited</p>')}>
                    edit
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

const publishButtonName = 'tenants.legal.dataProcessingAgreement.publish';

describe('DataProcessingAgreementCard', () => {
    it('keeps the other languages when publishing after editing only one language', async () => {
        const user = userEvent.setup();
        const onPublish = vi.fn();
        render(
            <DataProcessingAgreementCard
                initialContentByLanguage={{ de: '<p>DE</p>', en: '<p>EN</p>' }}
                languages={['de', 'en']}
                defaultLanguage="en"
                versions={[]}
                onPublish={onPublish}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('button', { name: publishButtonName }));

        expect(onPublish).toHaveBeenCalledWith({ de: '<p>DE</p>', en: '<p>edited</p>' });
    });

    it('passes unknown keys through untouched on publish', async () => {
        const user = userEvent.setup();
        const onPublish = vi.fn();
        render(
            <DataProcessingAgreementCard
                initialContentByLanguage={{ de: '<p>DE</p>', de__meta: 'meta', fr: '<p>FR</p>' }}
                languages={['de', 'en']}
                defaultLanguage="de"
                versions={[]}
                onPublish={onPublish}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('button', { name: publishButtonName }));

        expect(onPublish).toHaveBeenCalledWith({ de: '<p>edited</p>', de__meta: 'meta', fr: '<p>FR</p>' });
    });

    it('does not add a language the admin never filled', async () => {
        const user = userEvent.setup();
        const onPublish = vi.fn();
        render(
            <DataProcessingAgreementCard
                initialContentByLanguage={{ de: '<p>DE</p>' }}
                languages={['de', 'en']}
                defaultLanguage="de"
                versions={[]}
                onPublish={onPublish}
            />,
        );

        await user.click(screen.getByRole('button', { name: publishButtonName }));

        expect(onPublish).toHaveBeenCalledWith({ de: '<p>DE</p>' });
    });

    it('switches the shown language via the language select', async () => {
        const user = userEvent.setup();
        render(
            <DataProcessingAgreementCard
                initialContentByLanguage={{ de: '<p>DE</p>', en: '<p>EN</p>' }}
                languages={['de', 'en']}
                defaultLanguage="de"
                versions={[]}
                onPublish={() => undefined}
            />,
        );

        expect(screen.getByTestId('editor')).toHaveAttribute('data-value', '<p>DE</p>');

        await user.click(screen.getByRole('combobox'));
        await user.click(await screen.findByTitle('en'));

        expect(screen.getByTestId('editor')).toHaveAttribute('data-value', '<p>EN</p>');
    });

    it('hides the language select when only one language is active', () => {
        render(
            <DataProcessingAgreementCard
                initialContentByLanguage={{ de: '<p>DE</p>' }}
                languages={['de']}
                versions={[]}
                onPublish={() => undefined}
            />,
        );
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('renders read-only without a publish button or editable editor', () => {
        render(
            <DataProcessingAgreementCard
                initialContentByLanguage={{ de: '<p>DE</p>' }}
                languages={['de']}
                versions={[]}
                onPublish={() => undefined}
                readOnly
            />,
        );

        expect(screen.queryByRole('button', { name: publishButtonName })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'edit' })).not.toBeInTheDocument();
        expect(screen.getByText('tenants.legal.dataProcessingAgreement.managedByTenant')).toBeInTheDocument();
        expect(screen.getByTestId('editor')).toHaveAttribute('data-value', '<p>DE</p>');
    });
});
