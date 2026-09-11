import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DepartmentDataProtectionCard } from './index';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        i18n: { language: 'de' },
        t: (key: string, options?: unknown) => {
            if (typeof options === 'string') return options;
            if (options && typeof options === 'object') {
                const values = Object.entries(options as Record<string, unknown>)
                    .filter(([name]) => name !== 'lng')
                    .map(([, value]) => value);
                if (values.length === 0) return key;
                return `${key}:${values.join(':')}`;
            }
            return key;
        },
    }),
}));

// TipTap is far too heavy for a wiring test; the stub renders the one slot this
// test is about, so the assertions are about what the AGENCY card puts there.
vi.mock('../../../../FormPluginEditor/M3RichTextEditor', () => ({
    M3RichTextEditor: ({
        consentSlot,
        topicSlot,
        languageSlot,
        onViewVersionChange,
        versions,
    }: {
        consentSlot?: React.ReactNode;
        topicSlot?: React.ReactNode;
        languageSlot?: React.ReactNode;
        onViewVersionChange?: (versionId: string | null) => void;
        versions?: { id: string }[];
    }) => (
        <div data-testid="editor">
            <div data-testid="language-slot">{languageSlot}</div>
            <div data-testid="consent-slot">{consentSlot}</div>
            <div data-testid="topic-slot">{topicSlot}</div>
            {(versions ?? []).map((version) => (
                <button key={version.id} type="button" onClick={() => onViewVersionChange?.(version.id)}>
                    view {version.id}
                </button>
            ))}
        </div>
    ),
}));

const consentByLanguage = { de: 'Ich habe die {{legal_links}} gelesen.' };

/** The chevron of the consent template split button — the mocked `t` yields the German fallback. */
const chooser = () => screen.getByRole('button', { name: 'Vorlagenmenü öffnen' });

const renderCard = (props: Partial<Parameters<typeof DepartmentDataProtectionCard>[0]> = {}) =>
    render(
        <DepartmentDataProtectionCard
            departmentName="Sucht"
            initialContentByLanguage={{ de: '<p>Text</p>' }}
            languages={['de']}
            consentByLanguage={consentByLanguage}
            onSave={vi.fn()}
            {...props}
        />,
    );

/**
 * ADR-021 decision 4 — the consent sentence is a FIELD of the department policy,
 * so its template chooser belongs in that policy editor's function bar. The owner
 * settled this for the AGENCY level only (2026-08-19); the tenant/platform editor
 * is deliberately left alone (see LegalText.test.tsx).
 */
describe('DepartmentDataProtectionCard consent template chooser', () => {
    it('puts a consent template split button into the editor function bar', async () => {
        renderCard();

        const slot = await screen.findByTestId('consent-slot');
        expect(slot).toContainElement(chooser());
        // Exactly one chooser on the surface — the consent dialog must not draw a
        // second one driving the same field.
        expect(screen.getAllByRole('button', { name: 'Vorlagenmenü öffnen' })).toHaveLength(1);
    });

    it('does not offer the chooser when the level carries no consent field', () => {
        renderCard({ consentByLanguage: undefined });

        expect(screen.getByTestId('consent-slot')).toBeEmptyDOMElement();
    });

    it('applies a picked template to the consent sentence of the active language', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        renderCard({ onSave });

        await user.click(chooser());
        await user.click(await screen.findByText('legal.consent.template.platform.name'));

        // The template's text lands in the consent field of the active language …
        await user.click(screen.getByTestId('consent-edit-trigger'));
        expect(screen.getByRole('textbox')).toHaveValue('legal.consent.template.platform.text');
        // … and picking a template is an edit, not a save.
        expect(onSave).not.toHaveBeenCalled();
    });

    it('stays visible but inert for an admin without the legal-text permission', async () => {
        renderCard({ readOnly: true });

        const trigger = await screen.findByRole('button', { name: 'Vorlagenmenü öffnen' });
        expect(trigger).toBeInTheDocument();
        expect(trigger).toBeDisabled();
    });

    it('clears the selected template when the content language changes', async () => {
        const user = userEvent.setup();
        renderCard({
            languages: ['de', 'en'],
            initialContentByLanguage: { de: '<p>Text</p>', en: '<p>Text</p>' },
            consentByLanguage: { de: 'Ich habe die {{legal_links}} gelesen.', en: 'I have read the {{legal_links}}.' },
        });

        await user.click(chooser());
        await user.click(await screen.findByText('legal.consent.template.platform.name'));
        expect(screen.getByRole('button', { name: 'legal.consent.template.platform.name' })).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /languages:/i }));
        await user.click(await screen.findByRole('menuitem', { name: 'en' }));

        expect(screen.queryByRole('button', { name: 'legal.consent.template.platform.name' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Vorlage wählen' })).toBeInTheDocument();
    });

    it('clears the selected template when the department changes', async () => {
        const user = userEvent.setup();
        const { rerender } = renderCard();

        await user.click(chooser());
        await user.click(await screen.findByText('legal.consent.template.platform.name'));
        expect(screen.getByRole('button', { name: 'legal.consent.template.platform.name' })).toBeInTheDocument();

        rerender(
            <DepartmentDataProtectionCard
                departmentName="Schuldner"
                initialContentByLanguage={{ de: '<p>Text</p>' }}
                languages={['de']}
                consentByLanguage={consentByLanguage}
                onSave={vi.fn()}
            />,
        );

        expect(screen.queryByRole('button', { name: 'legal.consent.template.platform.name' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Vorlage wählen' })).toBeInTheDocument();
    });

    it('stays visible but inert while an archived version is on screen', async () => {
        const user = userEvent.setup();
        renderCard({
            versions: [
                {
                    id: 1,
                    kind: 'DPP',
                    ownerLevel: 'DEPARTMENT',
                    ownerId: 7,
                    content: JSON.stringify({ de: '<p>alt</p>' }),
                    consentText: JSON.stringify({ de: 'alter Satz {{legal_links}}' }),
                    publishedAt: '2026-07-01T10:00:00Z',
                },
            ],
        });

        expect(await screen.findByRole('button', { name: 'Vorlagenmenü öffnen' })).toBeEnabled();

        await user.click(screen.getByRole('button', { name: 'view 1' }));

        expect(chooser()).toBeDisabled();
    });
});
