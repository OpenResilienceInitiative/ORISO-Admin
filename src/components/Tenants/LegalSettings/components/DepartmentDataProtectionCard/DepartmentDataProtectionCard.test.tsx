import React from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DepartmentDataProtectionCard } from './index';

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

const publishButtonName = 'tenants.legal.departmentDataProtection.publish';
const draftButtonName = 'tenants.legal.departmentDataProtection.saveDraft';

describe('DepartmentDataProtectionCard', () => {
    it('publishes the complete content map (publish=true)', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        render(<DepartmentDataProtectionCard initialContentByLanguage={{ de: '<p>x</p>' }} onSave={onSave} />);

        await user.click(screen.getByRole('button', { name: publishButtonName }));

        expect(onSave).toHaveBeenCalledWith({ de: '<p>x</p>' }, true);
    });

    it('stores a draft (publish=false)', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        render(<DepartmentDataProtectionCard initialContentByLanguage={{ de: '<p>x</p>' }} onSave={onSave} />);

        await user.click(screen.getByRole('button', { name: draftButtonName }));

        expect(onSave).toHaveBeenCalledWith({ de: '<p>x</p>' }, false);
    });

    it('keeps the other languages when saving after editing only one language', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        render(
            <DepartmentDataProtectionCard
                initialContentByLanguage={{ de: '<p>DE</p>', en: '<p>EN</p>' }}
                languages={['de', 'en']}
                defaultLanguage="en"
                onSave={onSave}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('button', { name: publishButtonName }));

        expect(onSave).toHaveBeenCalledWith({ de: '<p>DE</p>', en: '<p>edited</p>' }, true);
    });

    it('passes unknown keys through untouched on save', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        render(
            <DepartmentDataProtectionCard
                initialContentByLanguage={{ de: '<p>DE</p>', de__meta: 'meta' }}
                languages={['de', 'en']}
                defaultLanguage="de"
                onSave={onSave}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('button', { name: draftButtonName }));

        expect(onSave).toHaveBeenCalledWith({ de: '<p>edited</p>', de__meta: 'meta' }, false);
    });

    it('switches the edited language via the language select', async () => {
        const user = userEvent.setup();
        render(
            <DepartmentDataProtectionCard
                initialContentByLanguage={{ de: '<p>DE</p>', en: '<p>EN</p>' }}
                languages={['de', 'en']}
                defaultLanguage="de"
                onSave={() => undefined}
            />,
        );

        expect(screen.getByTestId('editor')).toHaveAttribute('data-value', '<p>DE</p>');

        await user.click(screen.getByRole('combobox'));
        await user.click(await screen.findByTitle('en'));

        expect(screen.getByTestId('editor')).toHaveAttribute('data-value', '<p>EN</p>');
    });

    it('shows the published status tag', () => {
        render(<DepartmentDataProtectionCard publicationStatus="PUBLISHED" onSave={() => undefined} />);
        expect(screen.getByText('tenants.legal.departmentDataProtection.status.published')).toBeInTheDocument();
    });

    it('shows the draft status tag by default', () => {
        render(<DepartmentDataProtectionCard onSave={() => undefined} />);
        expect(screen.getByText('tenants.legal.departmentDataProtection.status.draft')).toBeInTheDocument();
    });

    it('renders the department name when provided', () => {
        render(<DepartmentDataProtectionCard departmentName="Suchtberatung" onSave={() => undefined} />);
        expect(screen.getByText('Suchtberatung')).toBeInTheDocument();
    });
});
