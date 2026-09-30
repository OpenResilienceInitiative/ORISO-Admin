import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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

// TipTap is irrelevant here; only the function bar's consent slot is under test.
vi.mock('../../../../FormPluginEditor/M3RichTextEditor', () => ({
    M3RichTextEditor: ({ consentSlot, topicSlot }: { consentSlot?: React.ReactNode; topicSlot?: React.ReactNode }) => (
        <div data-testid="editor">
            <div data-testid="consent-slot">{consentSlot}</div>
            <div data-testid="topic-slot">{topicSlot}</div>
        </div>
    ),
}));

import { DepartmentDataProtectionCard } from './index';

const renderCard = (props: Record<string, unknown> = {}) =>
    render(<DepartmentDataProtectionCard onSave={vi.fn()} {...(props as never)} />);

/**
 * #914 — the consent trigger's place must not be empty just because the consent
 * editor is not on offer for the current selection.
 */
describe('DepartmentDataProtectionCard — consent unavailable', () => {
    it('left the slot empty before, and now holds the stand-in', () => {
        renderCard({ consentUnavailableReason: 'noDepartments' });

        expect(screen.getByTestId('consent-unavailable-trigger')).toBeInTheDocument();
    });

    it('puts the stand-in where the real consent control sits, not into the Fachbereich slot', () => {
        renderCard({ consentUnavailableReason: 'allDepartments' });

        expect(screen.getByTestId('consent-slot')).toContainElement(screen.getByTestId('consent-unavailable-trigger'));
    });

    it('keeps the live consent control whenever consent IS editable', () => {
        renderCard({ consentUnavailableReason: 'allDepartments', consentByLanguage: { de: 'Satz' } });

        expect(screen.getByTestId('consent-edit-trigger')).toBeInTheDocument();
        expect(screen.queryByTestId('consent-unavailable-trigger')).not.toBeInTheDocument();
    });

    // ADR-021 decision 7: the imprint is an information duty and never a consent gate,
    // so it must not grow a consent control — not even an inert one.
    it('never offers the stand-in on the imprint', () => {
        renderCard({ documentType: 'imprint', consentUnavailableReason: 'noDepartments' });

        expect(screen.queryByTestId('consent-unavailable-trigger')).not.toBeInTheDocument();
    });

    // A backend without the `consentText` field is not a state to explain to an admin.
    it('leaves the slot empty when no reason is given', () => {
        renderCard({});

        expect(screen.getByTestId('consent-slot')).toBeEmptyDOMElement();
    });

    it('shows the disclaimer in the language the editor is currently on', async () => {
        renderCard({
            consentUnavailableReason: 'noDepartments',
            languages: ['de', 'uk'],
            defaultLanguage: 'uk',
        });

        await userEvent.click(screen.getByTestId('consent-unavailable-trigger'));

        expect(await screen.findByTestId('consent-unavailable-disclaimer')).toHaveTextContent('Fachbereich');
        expect(screen.getByText('legal.consent.unavailable.noDepartments.disclaimerLabel:UK')).toBeInTheDocument();
    });
});
