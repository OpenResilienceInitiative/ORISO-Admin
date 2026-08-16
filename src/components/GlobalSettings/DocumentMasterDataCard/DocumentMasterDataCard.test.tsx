import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentMasterDataCard } from './index';
import { DpiaMasterData } from '../../../types/dpiaMasterData';

const translate = (key: string, options?: unknown) => {
    if (typeof options === 'string') {
        return options;
    }
    if (options && typeof options === 'object') {
        return `${key}:${Object.values(options).join(':')}`;
    }
    return key;
};

vi.mock('react-i18next', () => ({
    // Both call shapes are in use: this card destructures `{ t }`, while MuiSelectField
    // destructures `[t]`. Returning an array that also carries `t` satisfies both.
    useTranslation: () => Object.assign([translate], { t: translate }),
}));

const storedData: DpiaMasterData = {
    operator: {
        legalName: 'Deutscher Caritasverband e. V.',
        shortName: 'DCV',
        contactEmail: 'datenschutz@example.org',
    },
    supervisoryAuthority: {
        legalFramework: 'KDG',
        name: 'Katholisches Datenschutzzentrum Frankfurt',
    },
    document: { documentDate: '2026-06-01', nextReviewDate: '2027-06-01' },
    keyFigures: { tenants: { count: 12, asOfDate: '2026-06-01' } },
};

const label = (key: string) => `globalSettings.documentMasterData.${key}`;

describe('DocumentMasterDataCard', () => {
    it('shows the stored master data across all four field groups', () => {
        render(<DocumentMasterDataCard data={storedData} onSave={() => undefined} />);

        expect(screen.getByLabelText(label('operator.legalName'))).toHaveValue('Deutscher Caritasverband e. V.');
        expect(screen.getByLabelText(label('operator.contactEmail'))).toHaveValue('datenschutz@example.org');
        expect(screen.getByLabelText(label('supervisoryAuthority.name'))).toHaveValue(
            'Katholisches Datenschutzzentrum Frankfurt',
        );
        expect(screen.getByLabelText(label('document.nextReviewDate'))).toHaveValue('2027-06-01');
        expect(screen.getByLabelText(label('keyFigures.tenants'))).toHaveValue(12);
    });

    it('renders every key figure with its own reference date', () => {
        render(<DocumentMasterDataCard data={storedData} onSave={() => undefined} />);

        expect(screen.getByLabelText(label('keyFigures.counsellingCentres'))).toBeInTheDocument();
        expect(screen.getByLabelText(label('keyFigures.activeCounsellors'))).toBeInTheDocument();
        expect(screen.getByLabelText(label('keyFigures.registeredClients'))).toBeInTheDocument();

        // Each date field needs its own accessible name — a bare "As of date" repeated four
        // times is indistinguishable for a screen-reader user.
        expect(
            screen.getByLabelText(`${label('keyFigures.asOfDate')}:${label('keyFigures.tenants')}`),
        ).toBeInTheDocument();
        expect(
            screen.getByLabelText(`${label('keyFigures.asOfDate')}:${label('keyFigures.counsellingCentres')}`),
        ).toBeInTheDocument();
        expect(
            screen.getByLabelText(`${label('keyFigures.asOfDate')}:${label('keyFigures.activeCounsellors')}`),
        ).toBeInTheDocument();
        expect(
            screen.getByLabelText(`${label('keyFigures.asOfDate')}:${label('keyFigures.registeredClients')}`),
        ).toBeInTheDocument();
    });

    /** The card opens read-only: the fields are disabled and there is nothing to save with. */
    it('opens read-only and only becomes editable on demand', async () => {
        const user = userEvent.setup({ delay: null });
        render(<DocumentMasterDataCard data={storedData} onSave={() => undefined} />);

        expect(screen.getByLabelText(label('operator.legalName'))).toBeDisabled();
        expect(screen.getByLabelText(label('supervisoryAuthority.name'))).toBeDisabled();
        expect(screen.getByLabelText(label('document.nextReviewDate'))).toBeDisabled();
        expect(screen.getByLabelText(label('keyFigures.tenants'))).toBeDisabled();
        expect(screen.queryByRole('button', { name: 'card.edit.save' })).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'edit' }));

        expect(screen.getByLabelText(label('operator.legalName'))).toBeEnabled();
        expect(screen.getByLabelText(label('keyFigures.tenants'))).toBeEnabled();
        expect(screen.getByRole('button', { name: 'card.edit.save' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'card.edit.cancel' })).toBeInTheDocument();
    });

    /**
     * A refetch can replace the record while the card is mounted and neither `isLoading` nor
     * `disabled` changes. Because the card saves the whole record, showing the stale copy
     * would mean the next save silently writes it back over the newer one.
     */
    it('picks up a record that changed after mount', async () => {
        const user = userEvent.setup({ delay: null });
        const onSave = vi.fn();
        const { rerender } = render(<DocumentMasterDataCard data={storedData} onSave={onSave} />);

        const refetched: DpiaMasterData = {
            ...storedData,
            operator: { ...storedData.operator, legalName: 'Caritas Bundesverband e. V.' },
            keyFigures: { tenants: { count: 15, asOfDate: '2026-07-01' } },
        };
        rerender(<DocumentMasterDataCard data={refetched} onSave={onSave} />);

        await waitFor(() =>
            expect(screen.getByLabelText(label('operator.legalName'))).toHaveValue('Caritas Bundesverband e. V.'),
        );
        expect(screen.getByLabelText(label('keyFigures.tenants'))).toHaveValue(15);

        // The refreshed record — not the one from mount — is what a save now writes back.
        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));

        await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
        expect(onSave.mock.calls[0][0]).toMatchObject({
            operator: { legalName: 'Caritas Bundesverband e. V.' },
            keyFigures: { tenants: { count: 15 } },
        });
    });

    it('keeps an in-flight edit when the record changes underneath it', async () => {
        const user = userEvent.setup({ delay: null });
        const { rerender } = render(<DocumentMasterDataCard data={storedData} onSave={() => undefined} />);

        await user.click(screen.getByRole('button', { name: 'edit' }));
        const shortName = screen.getByLabelText(label('operator.shortName'));
        await user.clear(shortName);
        await user.type(shortName, 'Half-typed');

        rerender(
            <DocumentMasterDataCard
                data={{ ...storedData, operator: { ...storedData.operator, shortName: 'From the server' } }}
                onSave={() => undefined}
            />,
        );

        expect(screen.getByLabelText(label('operator.shortName'))).toHaveValue('Half-typed');
    });

    /**
     * A refetch that lands *while* the admin is editing is held back, and must stay held back
     * once they save: applying it on the way out of edit mode would drop what they submitted
     * back to the pre-save record until the response arrives.
     */
    it('does not fall back to the pre-save record after saving', async () => {
        const user = userEvent.setup({ delay: null });
        const onSave = vi.fn();
        const { rerender } = render(<DocumentMasterDataCard data={storedData} onSave={onSave} />);

        await user.click(screen.getByRole('button', { name: 'edit' }));
        const shortName = screen.getByLabelText(label('operator.shortName'));
        await user.clear(shortName);
        await user.type(shortName, 'Caritas');

        // A refetch lands mid-edit and is deferred.
        rerender(
            <DocumentMasterDataCard
                data={{ ...storedData, operator: { ...storedData.operator, shortName: 'Stale server copy' } }}
                onSave={onSave}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));
        await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));

        expect(screen.getByLabelText(label('operator.shortName'))).toHaveValue('Caritas');
    });

    it('saves the edited values in the grouped shape the endpoint expects', async () => {
        const user = userEvent.setup({ delay: null });
        const onSave = vi.fn();
        render(<DocumentMasterDataCard data={storedData} onSave={onSave} />);

        await user.click(screen.getByRole('button', { name: 'edit' }));

        const shortName = screen.getByLabelText(label('operator.shortName'));
        await user.clear(shortName);
        await user.type(shortName, 'Caritas');
        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));

        await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
        expect(onSave.mock.calls[0][0]).toMatchObject({
            operator: { legalName: 'Deutscher Caritasverband e. V.', shortName: 'Caritas' },
            supervisoryAuthority: { legalFramework: 'KDG' },
            document: { nextReviewDate: '2027-06-01' },
            keyFigures: { tenants: { count: 12 } },
        });
    });

    /** The native `min` attribute does not survive a scripted submit, so the rule has to. */
    it('rejects a negative key figure instead of saving it', async () => {
        const user = userEvent.setup({ delay: null });
        const onSave = vi.fn();
        render(<DocumentMasterDataCard data={storedData} onSave={onSave} />);

        await user.click(screen.getByRole('button', { name: 'edit' }));

        const tenants = screen.getByLabelText(label('keyFigures.tenants'));
        await user.clear(tenants);
        await user.type(tenants, '-1');
        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));

        await waitFor(() => expect(screen.getByText(label('keyFigures.count.negative'))).toBeInTheDocument());
        expect(onSave).not.toHaveBeenCalled();
    });

    it('rejects an invalid contact address instead of saving it', async () => {
        const user = userEvent.setup({ delay: null });
        const onSave = vi.fn();
        render(<DocumentMasterDataCard data={storedData} onSave={onSave} />);

        await user.click(screen.getByRole('button', { name: 'edit' }));

        const email = screen.getByLabelText(label('operator.contactEmail'));
        await user.clear(email);
        await user.type(email, 'not-an-address');
        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));

        await waitFor(() => expect(screen.getByText('message.error.email.incorrect')).toBeInTheDocument());
        expect(onSave).not.toHaveBeenCalled();
    });

    /** ORISO rule: superadmin-only settings stay visible for everyone, they just cannot be edited. */
    it('renders visible-but-not-editable when disabled', () => {
        render(<DocumentMasterDataCard data={storedData} onSave={() => undefined} disabled />);

        expect(screen.getByLabelText(label('operator.legalName'))).toHaveValue('Deutscher Caritasverband e. V.');
        expect(screen.getByLabelText(label('operator.legalName'))).toBeDisabled();
        expect(screen.queryByRole('button', { name: 'edit' })).not.toBeInTheDocument();
    });
});
