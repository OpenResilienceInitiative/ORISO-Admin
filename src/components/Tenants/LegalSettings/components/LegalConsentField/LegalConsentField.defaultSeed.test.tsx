import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LegalConsentField } from './index';

const PLATFORM_TEXT = 'Standardsatz {{legal_links}}.';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, options?: unknown) => {
            // The platform's standard sentence is the one string whose CONTENT
            // this component reacts to: it seeds an empty editor and carries the
            // mandatory token. Echoing the key here would seed a sentence the
            // product never ships and trip the missing-token alert.
            if (key === 'legal.consent.template.platform.text') {
                return PLATFORM_TEXT;
            }
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

describe('LegalConsentField — the first sentence is not written on a blank page (#929)', () => {
    it('opens with the platform sentence when this level has none of its own', async () => {
        render(<LegalConsentField language="de" value="" onChange={() => undefined} />);

        await userEvent.click(screen.getByTestId('consent-edit-trigger'));

        /* An empty box asks the admin to author a legal sentence from nothing,
           and the sentence that actually governs stays invisible. Offering the
           standard wording to adjust is the answer in the great majority of
           cases; it carries {{legal_links}}, so it cannot be published invalid. */
        expect(screen.getByRole('textbox')).toHaveValue(PLATFORM_TEXT);
        // What the admin starts from must be publishable: the standard sentence
        // carries {{legal_links}}, so seeding can never open on a sentence the
        // publish rule would reject.
        expect(screen.queryByTestId('consent-missing-token-error')).not.toBeInTheDocument();
    });

    it('says the text is the standard sentence, not that the box is empty', async () => {
        render(<LegalConsentField language="de" value="" onChange={() => undefined} />);

        await userEvent.click(screen.getByTestId('consent-edit-trigger'));

        expect(screen.getByTestId('consent-inherited-notice')).toHaveTextContent('legal.consent.seededFromPlatform');
    });

    it('leaves an existing sentence alone', async () => {
        render(<LegalConsentField language="de" value="Eigener Satz {{legal_links}}." onChange={() => undefined} />);

        await userEvent.click(screen.getByTestId('consent-edit-trigger'));

        expect(screen.getByRole('textbox')).toHaveValue('Eigener Satz {{legal_links}}.');
    });

    it('leaves an inherited sentence alone', async () => {
        render(
            <LegalConsentField
                language="de"
                value="Satz des Trägers {{legal_links}}."
                inheritedFrom="Träger"
                onChange={() => undefined}
            />,
        );

        await userEvent.click(screen.getByTestId('consent-edit-trigger'));

        expect(screen.getByRole('textbox')).toHaveValue('Satz des Trägers {{legal_links}}.');
        expect(screen.getByTestId('consent-inherited-notice')).toHaveTextContent('legal.consent.inherited');
    });

    it('shows a viewer the blank as it is', async () => {
        // A read-only surface reports what is stored. Seeding there would show
        // someone who cannot save a sentence this level does not have.
        render(<LegalConsentField language="de" value="" readOnly onChange={() => undefined} />);

        await userEvent.click(screen.getByTestId('consent-edit-trigger'));

        expect(screen.getByRole('textbox')).toHaveValue('');
        expect(screen.getByTestId('consent-inherited-notice')).toHaveTextContent('legal.consent.emptyMeansInherited');
    });

    it('leaves a level that owns a blank sentence alone', async () => {
        // A stored blank is a decision — at runtime it means the level above
        // governs. Seeding it would let one press of Apply re-author a sentence
        // somebody deliberately removed.
        render(<LegalConsentField language="de" value="" hasOwnSentence onChange={() => undefined} />);

        await userEvent.click(screen.getByTestId('consent-edit-trigger'));

        expect(screen.getByRole('textbox')).toHaveValue('');
        expect(screen.getByTestId('consent-inherited-notice')).toHaveTextContent('legal.consent.emptyMeansInherited');
    });

    it('does not author the seeded sentence until the admin applies it', async () => {
        const onChange = vi.fn();
        render(<LegalConsentField language="de" value="" onChange={onChange} />);

        await userEvent.click(screen.getByTestId('consent-edit-trigger'));
        await userEvent.click(screen.getByRole('button', { name: 'cancel' }));

        expect(onChange).not.toHaveBeenCalled();
    });
});
