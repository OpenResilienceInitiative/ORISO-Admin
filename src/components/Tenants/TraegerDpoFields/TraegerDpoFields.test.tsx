import { Form } from 'antd';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TraegerDpoFields } from './index';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

const renderFields = (onFinish = vi.fn()) => {
    const Harness = () => {
        const [form] = Form.useForm();
        return (
            <Form form={form} onFinish={onFinish}>
                <TraegerDpoFields />
                <button type="submit">save</button>
            </Form>
        );
    };
    render(<Harness />);
    return onFinish;
};

/** Admin#1067: a Träger may enter a DPO; its Beratungsstellen inherit it. Never required. */
describe('TraegerDpoFields', () => {
    it('is optional: an empty block submits', async () => {
        const onFinish = renderFields();
        await userEvent.click(screen.getByRole('button', { name: 'save' }));
        await waitFor(() => expect(onFinish).toHaveBeenCalled());
    });

    it('submits the agency-shaped contact object under dataProtectionOfficer', async () => {
        const onFinish = renderFields();
        await userEvent.type(screen.getByLabelText('agency.edit.settings.legal.contact.name'), 'Dr. Maria Muster');
        await userEvent.type(screen.getByLabelText('agency.edit.settings.legal.contact.email'), 'dsb@example.org');
        await userEvent.click(screen.getByRole('button', { name: 'save' }));

        await waitFor(() =>
            expect(onFinish).toHaveBeenCalledWith(
                expect.objectContaining({
                    dataProtectionOfficer: expect.objectContaining({
                        nameAndLegalForm: 'Dr. Maria Muster',
                        email: 'dsb@example.org',
                    }),
                }),
            ),
        );
    });

    it('says that Beratungsstellen inherit it', () => {
        renderFields();
        expect(screen.getByText('tenants.form.dpo.title')).toBeInTheDocument();
        expect(screen.getByText('tenants.form.dpo.help')).toBeInTheDocument();
    });

    it('refuses an e-mail that is no e-mail address', async () => {
        const onFinish = renderFields();
        await userEvent.type(screen.getByLabelText('agency.edit.settings.legal.contact.email'), 'dsb at caritas');
        await userEvent.click(screen.getByRole('button', { name: 'save' }));

        expect(await screen.findByText('message.error.email.incorrect')).toBeInTheDocument();
        expect(onFinish).not.toHaveBeenCalled();
    });
});
