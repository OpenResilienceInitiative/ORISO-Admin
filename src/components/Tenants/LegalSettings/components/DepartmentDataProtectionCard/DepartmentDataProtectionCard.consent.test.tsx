import React from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DepartmentDataProtectionCard } from './index';
import { LegalTextVersion } from '../../../../../types/legalVersion';

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
        onViewVersionChange,
        topicSlot,
        belowSlot,
    }: {
        value?: string;
        versions?: { id: string; label: string; content: string; restorable?: boolean }[];
        onPublish?: (html: string) => void;
        onSaveDraft?: (html: string) => void;
        onViewVersionChange?: (versionId: string | null) => void;
        topicSlot?: React.ReactNode;
        belowSlot?: React.ReactNode;
    }) => (
        <div data-testid="editor" data-value={value}>
            <ul data-testid="versions">
                {(versions ?? []).map((version) => (
                    <li key={version.id} data-restorable={String(version.restorable)}>
                        {version.label} — {version.content}
                        {/* Stands in for picking this entry in the real version menu. */}
                        <button type="button" onClick={() => onViewVersionChange?.(version.id)}>
                            view {version.id}
                        </button>
                    </li>
                ))}
            </ul>
            <button type="button" onClick={() => onViewVersionChange?.(null)}>
                back to draft
            </button>
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
            {topicSlot}
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

/** ADR-021/ORISO-AgencyService#256: a version is identified by a surrogate id. */
const version = (id: number, publishedAt: string, content: string, consentText?: string): LegalTextVersion => ({
    id,
    kind: 'DPP',
    ownerLevel: 'DEPARTMENT',
    ownerId: 3,
    publishedAt,
    content,
    ...(consentText === undefined ? {} : { consentText }),
});

const versions = [
    version(42, '2026-07-13T10:22:00Z', JSON.stringify({ de: '<p>neu</p>' })),
    version(17, '2026-05-02T09:00:00Z', JSON.stringify({ de: '<p>alt</p>' })),
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
    const openConsent = async () => {
        await userEvent.click(screen.getByTestId('consent-edit-trigger'));
    };

    it('is not offered while the backend does not carry the field', () => {
        render(
            <DepartmentDataProtectionCard
                initialContentByLanguage={{ de: '<p>x</p>' }}
                languages={['de']}
                onSave={() => undefined}
            />,
        );
        expect(screen.queryByTestId('consent-edit-trigger')).not.toBeInTheDocument();
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
        expect(screen.queryByTestId('consent-edit-trigger')).not.toBeInTheDocument();
    });

    it('opens the consent dialog with the fixed cookie notice (#862)', async () => {
        render(
            <DepartmentDataProtectionCard
                consentByLanguage={{ de: 'Ich habe {{legal_links}} gelesen.' }}
                initialContentByLanguage={{ de: '<p>x</p>' }}
                languages={['de']}
                onSave={() => undefined}
            />,
        );
        expect(screen.queryByTestId('consent-fixed-addendum')).not.toBeInTheDocument();
        await openConsent();
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

/**
 * ADR-021 decision 4 ties the consent sentence to one policy version. A look-back
 * that swaps the body but leaves today's editable sentence underneath tells the
 * admin something that was never true of that version.
 */
describe('DepartmentDataProtectionCard — consent follows the selected version', () => {
    const versionedConsent = [
        version(
            42,
            '2026-07-13T10:22:00Z',
            JSON.stringify({ de: '<p>neu</p>' }),
            JSON.stringify({ de: 'Neuer Satz mit {{legal_links}}.' }),
        ),
        version(
            17,
            '2026-05-02T09:00:00Z',
            JSON.stringify({ de: '<p>alt</p>' }),
            JSON.stringify({ de: 'Alter Satz mit {{legal_links}}.' }),
        ),
    ];

    const renderCard = () =>
        render(
            <DepartmentDataProtectionCard
                consentByLanguage={{ de: 'Heutiger Satz mit {{legal_links}}.' }}
                initialContentByLanguage={{ de: '<p>aktuell</p>' }}
                languages={['de']}
                versions={versionedConsent}
                onSave={() => undefined}
            />,
        );

    const openConsent = async () => {
        await userEvent.click(screen.getByTestId('consent-edit-trigger'));
    };

    const consentInput = () => screen.getByRole('textbox') as HTMLTextAreaElement;

    it('shows the archived sentence while that version is on screen', async () => {
        renderCard();
        await openConsent();
        expect(consentInput()).toHaveValue('Heutiger Satz mit {{legal_links}}.');
        await userEvent.click(screen.getByRole('button', { name: 'cancel' }));

        await userEvent.click(screen.getByRole('button', { name: 'view 17' }));
        await openConsent();

        expect(consentInput()).toHaveValue('Alter Satz mit {{legal_links}}.');
    });

    it('makes the archived sentence read-only — the published chain is append-only', async () => {
        renderCard();
        await userEvent.click(screen.getByRole('button', { name: 'view 17' }));
        await openConsent();

        expect(consentInput()).toBeDisabled();
    });

    it('returns to the editable current sentence when the look-back ends', async () => {
        renderCard();
        await userEvent.click(screen.getByRole('button', { name: 'view 17' }));
        await userEvent.click(screen.getByRole('button', { name: 'back to draft' }));
        await openConsent();

        expect(consentInput()).toHaveValue('Heutiger Satz mit {{legal_links}}.');
        expect(consentInput()).not.toBeDisabled();
    });
});

describe('DepartmentDataProtectionCard — unreadable version history', () => {
    it('says the history failed rather than showing an empty look-back', () => {
        render(
            <DepartmentDataProtectionCard
                initialContentByLanguage={{ de: '<p>x</p>' }}
                languages={['de']}
                versions={[]}
                versionsUnavailable
                onSave={() => undefined}
            />,
        );
        expect(screen.getByTestId('legal-versions-unavailable')).toBeInTheDocument();
    });

    it('stays silent when the history is genuinely empty', () => {
        render(
            <DepartmentDataProtectionCard
                initialContentByLanguage={{ de: '<p>x</p>' }}
                languages={['de']}
                versions={[]}
                onSave={() => undefined}
            />,
        );
        expect(screen.queryByTestId('legal-versions-unavailable')).not.toBeInTheDocument();
    });
});

/**
 * ADR-021 decision 4: the consent sentence is a FIELD of the data-protection
 * policy. Editing only the sentence must therefore still produce a new policy
 * version — the body going out unchanged is the point, not a reason to skip it.
 */
describe('DepartmentDataProtectionCard — a consent-only edit still publishes the policy', () => {
    it('sends the byte-identical body together with the new sentence', async () => {
        const onSave = vi.fn();
        render(
            <DepartmentDataProtectionCard
                consentByLanguage={{ de: 'Alter Satz mit {{legal_links}}.' }}
                initialContentByLanguage={{ de: '<p>unveraendert</p>', en: '<p>unchanged</p>' }}
                languages={['de']}
                onSave={onSave}
            />,
        );

        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Neuer Satz mit {{legal_links}}.' } });
        await userEvent.click(screen.getByRole('button', { name: 'publish' }));

        expect(onSave).toHaveBeenCalledWith({ de: '<p>unveraendert</p>', en: '<p>unchanged</p>' }, true, {
            de: 'Neuer Satz mit {{legal_links}}.',
        });
    });
});

/**
 * The rule arrived after texts were already live (ADR-021 decision 2), so a stored
 * sentence can fail today's validation without anybody having touched it. The card
 * has to say so when it OPENS — an admin who has to press Publish, and then hunt
 * through the language switcher, is being told about a blocked document by accident.
 */
describe('DepartmentDataProtectionCard — a stored sentence that fails the rule', () => {
    it('names the affected language before Publish is ever pressed', () => {
        render(
            <DepartmentDataProtectionCard
                consentByLanguage={{ de: 'Ich habe {{legal_links}} gelesen.', en: 'I agree.' }}
                initialContentByLanguage={{ de: '<p>x</p>', en: '<p>x</p>' }}
                languages={['de', 'en']}
                onSave={() => undefined}
            />,
        );

        // `de` is the active language and is fine — without this notice the `en`
        // violation is invisible until the publish attempt fails.
        expect(screen.getByTestId('consent-publish-blocked')).toBeInTheDocument();
        expect(screen.getByTestId('consent-publish-blocked')).toHaveTextContent(
            'legal.consent.publishBlocked.description:EN',
        );
    });

    it('names the languages the admin reads, not the wire codes', async () => {
        render(
            <DepartmentDataProtectionCard
                consentByLanguage={{ de: 'Ich stimme zu.' }}
                initialContentByLanguage={{ de: '<p>x</p>' }}
                languages={['de']}
                onSave={() => undefined}
            />,
        );

        expect(screen.getByTestId('consent-publish-blocked')).toHaveTextContent(
            'legal.consent.publishBlocked.description:DE',
        );
    });

    it('goes away once the sentence carries the token again', async () => {
        render(
            <DepartmentDataProtectionCard
                consentByLanguage={{ de: 'Ich stimme zu.' }}
                initialContentByLanguage={{ de: '<p>x</p>' }}
                languages={['de']}
                onSave={() => undefined}
            />,
        );
        expect(screen.getByTestId('consent-publish-blocked')).toBeInTheDocument();

        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Ich habe {{legal_links}} gelesen.' } });

        expect(screen.queryByTestId('consent-publish-blocked')).not.toBeInTheDocument();
    });

    it('stays silent while every authored sentence is valid — blank is not a violation', () => {
        render(
            <DepartmentDataProtectionCard
                consentByLanguage={{ de: 'Ich habe {{legal_links}} gelesen.', en: '' }}
                initialContentByLanguage={{ de: '<p>x</p>' }}
                languages={['de', 'en']}
                onSave={() => undefined}
            />,
        );

        expect(screen.queryByTestId('consent-publish-blocked')).not.toBeInTheDocument();
    });
});

/**
 * ADR-021 decision 2 at the field itself. The blocked-publish notice above says WHICH
 * languages; this one says WHERE in the sentence — and, just as importantly, stays away
 * from a blank field, because blank means the level above still governs (decision 1).
 */
describe('DepartmentDataProtectionCard — the mandatory token on the field being edited', () => {
    it('marks an authored sentence that lacks the token', () => {
        render(
            <DepartmentDataProtectionCard
                consentByLanguage={{ de: 'Ich stimme zu.' }}
                initialContentByLanguage={{ de: '<p>x</p>' }}
                languages={['de']}
                onSave={() => undefined}
            />,
        );

        expect(screen.getByTestId('consent-missing-token-error')).toHaveTextContent(
            'legal.consent.error.missingLegalLinks.title',
        );
        expect(screen.getByTestId('consent-missing-token-error')).toHaveTextContent('{{legal_links}}');
    });

    it('reads a blank sentence as inheritance, never as an error', () => {
        render(
            <DepartmentDataProtectionCard
                consentByLanguage={{ de: '   ' }}
                initialContentByLanguage={{ de: '<p>x</p>' }}
                languages={['de']}
                onSave={() => undefined}
            />,
        );

        expect(screen.queryByTestId('consent-missing-token-error')).not.toBeInTheDocument();
        expect(screen.getByTestId('consent-inherited-notice')).toHaveTextContent('legal.consent.emptyMeansInherited');
    });

    it('clears the mark as soon as the token is typed back in', () => {
        render(
            <DepartmentDataProtectionCard
                consentByLanguage={{ de: 'Ich stimme zu.' }}
                initialContentByLanguage={{ de: '<p>x</p>' }}
                languages={['de']}
                onSave={() => undefined}
            />,
        );

        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Ich habe {{legal_links}} gelesen.' } });

        expect(screen.queryByTestId('consent-missing-token-error')).not.toBeInTheDocument();
    });
});
