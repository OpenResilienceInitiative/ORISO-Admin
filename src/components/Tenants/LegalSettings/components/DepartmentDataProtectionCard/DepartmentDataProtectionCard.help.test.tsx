import React from 'react';
import { beforeAll, describe, expect, it, vi } from 'vite-plus/test';
import { render, screen } from '@testing-library/react';
import { DepartmentDataProtectionCard } from './index';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        i18n: { language: 'de' },
        t: (key: string, options?: unknown) => (typeof options === 'string' ? options : key),
    }),
}));

// The real editor pulls TipTap; this stub only exposes the header slot the help button sits in.
vi.mock('../../../../FormPluginEditor/M3RichTextEditor', () => ({
    M3RichTextEditor: ({ headerAction }: { headerAction?: React.ReactNode }) => (
        <div data-testid="editor">{headerAction}</div>
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

const renderCard = (documentType: 'privacy' | 'imprint') =>
    render(
        <DepartmentDataProtectionCard
            documentType={documentType}
            initialContentByLanguage={{ de: '<p>Text</p>' }}
            languages={['de']}
            onSave={() => undefined}
        />,
    );

// Träger cards pass `tileHelp` to the same editor (LegalText); a Beratungsstelle card must offer
// the same explanation instead of an editor without the info button.
describe('DepartmentDataProtectionCard — tile help', () => {
    it.each(['privacy', 'imprint'] as const)('offers the help button on the %s editor', (documentType) => {
        renderCard(documentType);

        expect(screen.getByRole('button', { name: 'tileHelp.open' })).toBeInTheDocument();
    });
});
