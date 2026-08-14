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
        expect(screen.getAllByLabelText(label('keyFigures.asOfDate'))).toHaveLength(4);
    });

    /**
     * The card opens read-only and only editing exposes save/cancel. Asserted through the
     * buttons rather than the inputs' disabled attribute: MuiFormField reads antd's
     * DisabledContext through a deep import, which resolves to a second module instance
     * under Vitest, so the context never reaches the field in this environment.
     */
    it('offers no way to save until editing starts', async () => {
        const user = userEvent.setup({ delay: null });
        render(<DocumentMasterDataCard data={storedData} onSave={() => undefined} />);

        expect(screen.queryByRole('button', { name: 'card.edit.save' })).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'edit' }));

        expect(screen.getByRole('button', { name: 'card.edit.save' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'card.edit.cancel' })).toBeInTheDocument();
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
        expect(screen.queryByRole('button', { name: 'edit' })).not.toBeInTheDocument();
    });
});
