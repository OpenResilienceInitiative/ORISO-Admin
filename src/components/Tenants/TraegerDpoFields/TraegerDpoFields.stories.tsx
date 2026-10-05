import type { Meta, StoryObj } from '@storybook/react-vite';
import { Form } from 'antd';
import { ThemeProvider } from '@mui/material/styles';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { TraegerDpoFields } from './index';
import { M3Button } from '../../M3Button';
import { orisoMuiTheme } from '../../../theme/orisoMuiTheme';

interface HarnessProps {
    initialValues?: Record<string, unknown>;
    onFinish?: (values: Record<string, unknown>) => void;
}

/** The fields inside an antd form, as Träger → Allgemein (Stammdaten) hosts them. */
const Harness = ({ initialValues = {}, onFinish }: HarnessProps) => {
    const [form] = Form.useForm();
    return (
        <ThemeProvider theme={orisoMuiTheme}>
            <Form form={form} initialValues={initialValues} onFinish={onFinish} style={{ maxWidth: 425 }}>
                <TraegerDpoFields />
                <M3Button type="submit" variant="filled">
                    Speichern
                </M3Button>
            </Form>
        </ThemeProvider>
    );
};

const meta = {
    title: 'Molecules/Tenants/TraegerDpoFields',
    component: Harness,
    parameters: { layout: 'padded' },
    args: { onFinish: fn() },
} satisfies Meta<typeof Harness>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Admin#1067: optional — an empty block saves, and the placeholder then renders empty. */
export const Empty: Story = {
    play: async ({ canvas, args }) => {
        await userEvent.click(canvas.getByRole('button', { name: 'Speichern' }));
        await waitFor(() => expect(args.onFinish).toHaveBeenCalled());
    },
};

export const Filled: Story = {
    args: {
        initialValues: {
            dataProtectionOfficer: {
                nameAndLegalForm: 'Dr. Maria Muster',
                street: 'Musterstraße 1',
                postcode: '79106',
                city: 'Freiburg',
                phoneNumber: '+49 761 200-0',
                email: 'datenschutz@caritas-musterstadt.de',
            },
        },
    },
};
