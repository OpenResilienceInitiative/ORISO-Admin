import { Form } from 'antd';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vite-plus/test';
import { MuiSwitchField } from '../mui/MuiSwitchField';
import { MuiSelectField } from '../mui/MuiSelectField';
import { FormSwitchField } from '../FormSwitchField';
import { useSupervisionPrivacyConfirm } from '.';

vi.mock('react-i18next', () => {
    const t = (key?: string) => key ?? '';
    return { useTranslation: () => Object.assign([t, {}, true], { t }) };
});

/*
 * OBP 2.1 #107: everyone in a chat now sees every role, and a supervisor reads along. Whoever
 * switches supervision on is reminded that it has to be named in the privacy policy
 * (Datenschutzerklärung) of the platform or Träger.
 */
const TITLE = 'supervision.privacyConfirm.title';
const CONFIRM = 'supervision.privacyConfirm.confirm';
const CANCEL = 'supervision.privacyConfirm.cancel';

let form: ReturnType<typeof Form.useForm>[0];

const SwitchHarness = ({ initial }: { initial: boolean }) => {
    const [instance] = Form.useForm();
    form = instance;
    const { confirmEnable, dialog } = useSupervisionPrivacyConfirm();
    return (
        <Form form={instance} initialValues={{ isSupervisor: initial }}>
            <MuiSwitchField name="isSupervisor" label="supervisor" confirmEnable={confirmEnable} />
            {dialog}
        </Form>
    );
};

const switchControl = () => screen.getByRole('switch', { name: 'supervisor' });

describe('switching supervision on asks about the privacy policy', () => {
    it('asks when supervision is switched on, and keeps it off until confirmed', async () => {
        render(<SwitchHarness initial={false} />);

        await userEvent.click(switchControl());

        expect(await screen.findByText(TITLE)).toBeTruthy();
        expect(screen.getByText('supervision.privacyConfirm.text')).toBeTruthy();
        expect(form.getFieldValue('isSupervisor')).toBe(false);
    });

    it('turns supervision on after confirming', async () => {
        render(<SwitchHarness initial={false} />);

        await userEvent.click(switchControl());
        await userEvent.click(await screen.findByRole('button', { name: CONFIRM }));

        expect(form.getFieldValue('isSupervisor')).toBe(true);
    });

    it('leaves supervision off after cancelling', async () => {
        render(<SwitchHarness initial={false} />);

        await userEvent.click(switchControl());
        await userEvent.click(await screen.findByRole('button', { name: CANCEL }));

        await waitFor(() => expect(screen.queryByRole('button', { name: CONFIRM })).toBeNull());
        expect(form.getFieldValue('isSupervisor')).toBe(false);
    });

    it('does not ask when supervision is switched off', async () => {
        render(<SwitchHarness initial />);

        await userEvent.click(switchControl());

        expect(form.getFieldValue('isSupervisor')).toBe(false);
        expect(screen.queryByText(TITLE)).toBeNull();
    });
});

const TenantHarness = () => {
    const [instance] = Form.useForm();
    form = instance;
    const { confirmEnable, dialog } = useSupervisionPrivacyConfirm();
    return (
        <Form form={instance} initialValues={{ settings: { featureSupervisionEnabled: false } }}>
            <FormSwitchField
                name={['settings', 'featureSupervisionEnabled']}
                switchLabel="supervision"
                confirmEnable={confirmEnable}
            />
            {dialog}
        </Form>
    );
};

describe('the Träger-wide supervision switch', () => {
    it('asks first, and switches on only after confirming', async () => {
        render(<TenantHarness />);

        await userEvent.click(screen.getByRole('switch', { name: 'supervision' }));
        expect(await screen.findByText(TITLE)).toBeTruthy();
        expect(form.getFieldValue(['settings', 'featureSupervisionEnabled'])).toBe(false);

        await userEvent.click(screen.getByRole('button', { name: CONFIRM }));
        expect(form.getFieldValue(['settings', 'featureSupervisionEnabled'])).toBe(true);
    });
});

const SelectHarness = ({ initial }: { initial?: string }) => {
    const [instance] = Form.useForm();
    form = instance;
    const { confirmEnable, dialog } = useSupervisionPrivacyConfirm();
    return (
        <Form form={instance} initialValues={{ assignedSupervisorId: initial }}>
            <MuiSelectField
                name="assignedSupervisorId"
                label="standing"
                options={[
                    { value: 's1', label: 'Clara Stein' },
                    { value: 's2', label: 'Jonas Weber' },
                ]}
                allowClear
                confirmEnable={confirmEnable}
            />
            {dialog}
        </Form>
    );
};

const pick = async (label: string) => {
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(await screen.findByRole('option', { name: label }));
};

describe('assigning a standing supervisor', () => {
    it('asks before the first supervisor is assigned; cancel leaves none', async () => {
        render(<SelectHarness />);

        await pick('Clara Stein');
        expect(await screen.findByText(TITLE)).toBeTruthy();
        await userEvent.click(screen.getByRole('button', { name: CANCEL }));

        expect(form.getFieldValue('assignedSupervisorId')).toBeUndefined();
    });

    it('assigns after confirming', async () => {
        render(<SelectHarness />);

        await pick('Clara Stein');
        await userEvent.click(await screen.findByRole('button', { name: CONFIRM }));

        expect(form.getFieldValue('assignedSupervisorId')).toBe('s1');
    });

    it('does not ask again when one supervisor replaces another', async () => {
        render(<SelectHarness initial="s1" />);

        await pick('Jonas Weber');

        expect(form.getFieldValue('assignedSupervisorId')).toBe('s2');
        expect(screen.queryByText(TITLE)).toBeNull();
    });
});
