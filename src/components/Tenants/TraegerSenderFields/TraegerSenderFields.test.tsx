import { Form } from 'antd';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TraegerSenderFields } from './index';
import de from '../../../locales/de/translation.json';
import en from '../../../locales/en/translation.json';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

const renderFields = (onFinish = vi.fn()) => {
    const Harness = () => {
        const [form] = Form.useForm();
        return (
            <Form form={form} onFinish={onFinish}>
                <TraegerSenderFields />
                <button type="submit">save</button>
            </Form>
        );
    };
    render(<Harness />);
    return onFinish;
};

/**
 * Frank, 2026-09-23: a Träger needs its own sender block for the mail footer — a full legal name
 * beside the 40-character display name, and a contact e-mail and phone. The limits and the e-mail
 * rule mirror the platform operator's "Betreiber" fields in Dokument-Stammdaten.
 */
describe('TraegerSenderFields', () => {
    it('offers the legal name, contact e-mail and phone with the operator fields’ limits', () => {
        renderFields();

        expect(screen.getByLabelText('tenants.form.sender.legalName')).toHaveAttribute('maxlength', '255');
        expect(screen.getByLabelText('tenants.form.sender.contactEmail')).toHaveAttribute('maxlength', '255');
        expect(screen.getByLabelText('tenants.form.sender.contactPhone')).toHaveAttribute('maxlength', '64');
    });

    it('shows no fallback help text under the fields', () => {
        renderFields();

        expect(screen.queryByText(/sender\.(legalName|contact)\.help/)).not.toBeInTheDocument();
    });

    it('is optional: an empty block submits', async () => {
        const onFinish = renderFields();
        await userEvent.click(screen.getByRole('button', { name: 'save' }));

        await waitFor(() => expect(onFinish).toHaveBeenCalled());
    });

    it('refuses a contact e-mail that is no e-mail address', async () => {
        const onFinish = renderFields();
        await userEvent.type(screen.getByLabelText('tenants.form.sender.contactEmail'), 'beratung at caritas');
        await userEvent.click(screen.getByRole('button', { name: 'save' }));

        expect(await screen.findByText('message.error.email.incorrect')).toBeInTheDocument();
        expect(onFinish).not.toHaveBeenCalled();
    });

    it('submits what was entered under the tenant API field names', async () => {
        const onFinish = renderFields();
        await userEvent.type(
            screen.getByLabelText('tenants.form.sender.legalName'),
            'Caritasverband für die Erzdiözese Musterstadt e.V.',
        );
        await userEvent.type(
            screen.getByLabelText('tenants.form.sender.contactEmail'),
            'beratung@caritas-musterstadt.de',
        );
        await userEvent.type(screen.getByLabelText('tenants.form.sender.contactPhone'), '+49 761 200-0');
        await userEvent.click(screen.getByRole('button', { name: 'save' }));

        await waitFor(() =>
            expect(onFinish).toHaveBeenCalledWith({
                legalName: 'Caritasverband für die Erzdiözese Musterstadt e.V.',
                contactEmail: 'beratung@caritas-musterstadt.de',
                contactPhone: '+49 761 200-0',
            }),
        );
    });

    it('has German and English texts for every key', () => {
        const keys = [
            'tenants.form.sender.legalName',
            'tenants.form.sender.contactEmail',
            'tenants.form.sender.contactPhone',
        ];
        keys.forEach((key) => {
            expect(de[key as keyof typeof de], `de ${key}`).toBeTruthy();
            expect(en[key as keyof typeof en], `en ${key}`).toBeTruthy();
        });
    });
});
