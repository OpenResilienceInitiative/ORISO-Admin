import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

// Keys, not prose: the assertions are about WHICH sentence is shown, and the
// interpolated form `key:value` keeps the language argument visible.
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

import { ConsentUnavailableNotice } from '.';
import { CONSENT_DISCLAIMER_BY_LANGUAGE } from '../../utils/consentUnavailable';

const renderNotice = (props: Partial<React.ComponentProps<typeof ConsentUnavailableNotice>> = {}) =>
    render(<ConsentUnavailableNotice reason="noDepartments" language="de" {...props} />);

const openDialog = async () => {
    await userEvent.click(screen.getByTestId('consent-unavailable-trigger'));
};

/**
 * #914 — where the consent editor is not on offer, the slot used to be empty. It now
 * holds a stand-in that explains itself on click.
 */
describe('ConsentUnavailableNotice', () => {
    it('keeps the consent action visible in its place, naming the action it stands for', () => {
        renderNotice();

        expect(screen.getByTestId('consent-unavailable-trigger')).toHaveTextContent('legal.consent.editButton');
    });

    // The accessible name has to carry the "not available" part; the visible label alone
    // would promise an editor that does not open.
    it('says in its accessible name that the action is not available', () => {
        renderNotice();

        expect(screen.getByTestId('consent-unavailable-trigger')).toHaveAccessibleName(
            'legal.consent.unavailable.trigger',
        );
    });

    // The house rule for an unavailable action is disable, never hide — so the control
    // has to stay operable, otherwise the explanation behind it is unreachable.
    it('stays operable rather than being rendered disabled', async () => {
        renderNotice();

        const trigger = screen.getByTestId('consent-unavailable-trigger');
        expect(trigger).not.toBeDisabled();

        await openDialog();
        expect(await screen.findByTestId('consent-unavailable-body')).toBeInTheDocument();
    });

    it('shows nothing until it is pressed', () => {
        renderNotice();

        expect(screen.queryByTestId('consent-unavailable-body')).not.toBeInTheDocument();
    });

    describe('with no Fachbereich at all', () => {
        it('carries the operator disclaimer of the active content language', async () => {
            renderNotice({ reason: 'noDepartments', language: 'uk' });
            await openDialog();

            expect(await screen.findByTestId('consent-unavailable-disclaimer')).toHaveTextContent(
                CONSENT_DISCLAIMER_BY_LANGUAGE.uk,
            );
        });

        // The disclaimer follows the CONTENT language, so it can be a language the admin
        // UI is not in — the dialog names it rather than dropping a foreign block of text.
        it('names the language the disclaimer is written in', async () => {
            renderNotice({ reason: 'noDepartments', language: 'ti' });
            await openDialog();

            expect(
                await screen.findByText('legal.consent.unavailable.noDepartments.disclaimerLabel:TI'),
            ).toBeInTheDocument();
        });

        // "No 'create a Fachbereich' link needed — disclaimer text alone" (#914).
        it('offers only an acknowledging action, no call to create a Fachbereich', async () => {
            renderNotice({ reason: 'noDepartments' });
            await openDialog();

            expect(await screen.findByText('legal.consent.unavailable.gotIt')).toBeInTheDocument();
            expect(screen.queryByText(/createDepartment|agency.topics/i)).not.toBeInTheDocument();
        });
    });

    describe('on "Alle Fachbereiche"', () => {
        it('explains that the sentence belongs to a single Fachbereich, without the disclaimer', async () => {
            renderNotice({ reason: 'allDepartments' });
            await openDialog();

            expect(await screen.findByText('legal.consent.unavailable.allDepartments.text')).toBeInTheDocument();
            expect(screen.queryByTestId('consent-unavailable-disclaimer')).not.toBeInTheDocument();
        });
    });

    it('closes again on the acknowledging action', async () => {
        renderNotice();
        await openDialog();

        await userEvent.click(await screen.findByText('legal.consent.unavailable.gotIt'));

        expect(screen.queryByTestId('consent-unavailable-body')).not.toBeInTheDocument();
    });
});
