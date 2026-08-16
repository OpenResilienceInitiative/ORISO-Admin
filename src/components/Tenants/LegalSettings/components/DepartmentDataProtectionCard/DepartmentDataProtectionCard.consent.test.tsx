import React from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DepartmentDataProtectionCard } from './index';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        i18n: { language: 'de' },
        t: (key: string, options?: unknown) => {
            if (typeof options === 'string') {
                return options;
            }
            if (options && typeof options === 'object') {
                return `${key}:${Object.values(options).join(':')}`;
            }
            return key;
        },
    }),
}));

// TipTap pulls heavy editor deps; stub the M3 shell to a plain node that mirrors the
// part of its contract this test needs: the version look-back list and the slots.
vi.mock('../../../../FormPluginEditor/M3RichTextEditor', () => ({
    M3RichTextEditor: ({
        value,
        versions,
        onPublish,
        onSaveDraft,
        belowSlot,
    }: {
        value?: string;
        versions?: { id: string; label: string; content: string; restorable?: boolean }[];
        onPublish?: (html: string) => void;
        onSaveDraft?: (html: string) => void;
        belowSlot?: React.ReactNode;
    }) => (
        <div data-testid="editor" data-value={value}>
            <ul data-testid="versions">
                {(versions ?? []).map((version) => (
                    <li key={version.id} data-restorable={String(version.restorable)}>
                        {version.label} — {version.content}
                    </li>
                ))}
            </ul>
            {onPublish && (
                <button type="button" onClick={() => onPublish(value)}>
                    publish
                </button>
            )}
            {onSaveDraft && (
                <button type="button" onClick={() => onSaveDraft(value)}>
                    saveDraft
                </button>
            )}
            {belowSlot}
        </div>
    ),
}));

beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: () => undefined,
            removeListener: () => undefined,
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
            dispatchEvent: () => false,
        }),
    });
});

const versions = [
    { activationDate: '2026-07-13T10:22:00Z', content: JSON.stringify({ de: '<p>neu</p>' }) },
    { activationDate: '2026-05-02T09:00:00Z', content: JSON.stringify({ de: '<p>alt</p>' }) },
];

describe('DepartmentDataProtectionCard — version look-back', () => {
    it('offers every published version of the active language', () => {
        render(
            <DepartmentDataProtectionCard
                initialContentByLanguage={{ de: '<p>aktuell</p>' }}
                languages={['de']}
                versions={versions}
                onSave={() => undefined}
            />,
        );
        const entries = screen.getByTestId('versions').querySelectorAll('li');
        expect(entries).toHaveLength(2);
        expect(entries[0].textContent).toContain('<p>neu</p>');
        expect(entries[1].textContent).toContain('<p>alt</p>');
    });
});

describe('DepartmentDataProtectionCard — consent field', () => {
    it('is not offered while the backend does not carry the field', () => {
        render(
            <DepartmentDataProtectionCard
                initialContentByLanguage={{ de: '<p>x</p>' }}
                languages={['de']}
                onSave={() => undefined}
            />,
        );
        expect(screen.queryByTestId('consent-fixed-addendum')).not.toBeInTheDocument();
    });

    it('is never offered on the imprint — the imprint is no consent gate (ADR-021 decision 7)', () => {
        render(
            <DepartmentDataProtectionCard
                consentByLanguage={{}}
                documentType="imprint"
                initialContentByLanguage={{ de: '<p>x</p>' }}
                languages={['de']}
                onSave={() => undefined}
            />,
        );
        expect(screen.queryByTestId('consent-fixed-addendum')).not.toBeInTheDocument();
    });

    it('shows the fixed, non-editable cookie notice next to the sentence', () => {
        render(
            <DepartmentDataProtectionCard
                consentByLanguage={{ de: 'Ich habe {{legal_links}} gelesen.' }}
                initialContentByLanguage={{ de: '<p>x</p>' }}
                languages={['de']}
                onSave={() => undefined}
            />,
        );
        expect(screen.getByTestId('consent-fixed-addendum')).toHaveTextContent('legal.consent.cookieNotice.caption');
    });

    it('publishes the consent sentence together with the policy', async () => {
        const onSave = vi.fn();
        render(
            <DepartmentDataProtectionCard
                consentByLanguage={{ de: 'Ich habe {{legal_links}} gelesen.' }}
                initialContentByLanguage={{ de: '<p>x</p>' }}
                languages={['de']}
                onSave={onSave}
            />,
        );
        await userEvent.click(screen.getByRole('button', { name: 'publish' }));
        expect(onSave).toHaveBeenCalledWith({ de: '<p>x</p>' }, true, { de: 'Ich habe {{legal_links}} gelesen.' });
    });

    it('refuses to publish a sentence without {{legal_links}} and names the languages', async () => {
        const onSave = vi.fn();
        render(
            <DepartmentDataProtectionCard
                consentByLanguage={{ de: 'Ich stimme zu.' }}
                initialContentByLanguage={{ de: '<p>x</p>' }}
                languages={['de']}
                onSave={onSave}
            />,
        );
        await userEvent.click(screen.getByRole('button', { name: 'publish' }));
        expect(onSave).not.toHaveBeenCalled();
        expect(screen.getByText(/legal.consent.publishBlocked.description/)).toHaveTextContent('de');
    });
});
