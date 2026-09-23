import type { Meta, StoryObj } from '@storybook/react-vite';
import { Form } from 'antd';
import { ThemeProvider } from '@mui/material/styles';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { TraegerSenderFields } from './index';
import { M3Button } from '../../M3Button';
import { orisoMuiTheme } from '../../../theme/orisoMuiTheme';

interface HarnessProps {
    initialValues?: Record<string, string>;
    onFinish?: (values: Record<string, string>) => void;
}

/** The fields inside an antd form, as Träger → Allgemein and the onboarding step host them. */
const Harness = ({ initialValues = {}, onFinish }: HarnessProps) => {
    const [form] = Form.useForm();
    return (
        <ThemeProvider theme={orisoMuiTheme}>
            <Form form={form} initialValues={initialValues} onFinish={onFinish} style={{ maxWidth: 425 }}>
                <TraegerSenderFields />
                <M3Button type="submit" variant="filled">
                    Speichern
                </M3Button>
            </Form>
        </ThemeProvider>
    );
};

const meta = {
    title: 'Molecules/Tenants/TraegerSenderFields',
    component: Harness,
    parameters: { layout: 'padded' },
    args: { onFinish: fn() },
} satisfies Meta<typeof Harness>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Nothing entered: the mail footer falls back to the Träger name and the operator's contact. */
export const Empty: Story = {};

export const Filled: Story = {
    args: {
        initialValues: {
            legalName: 'Caritasverband für die Erzdiözese Musterstadt e.V.',
            contactEmail: 'beratung@caritas-musterstadt.de',
            contactPhone: '+49 761 200-0',
        },
    },
    play: async ({ canvas, args }) => {
        await userEvent.click(canvas.getByRole('button', { name: 'Speichern' }));
        await waitFor(() =>
            expect(args.onFinish).toHaveBeenCalledWith({
                legalName: 'Caritasverband für die Erzdiözese Musterstadt e.V.',
                contactEmail: 'beratung@caritas-musterstadt.de',
                contactPhone: '+49 761 200-0',
            }),
        );
    },
};

/** A contact e-mail that is no e-mail address is refused before anything is saved. */
export const InvalidContactEmail: Story = {
    play: async ({ canvas, args }) => {
        await userEvent.type(canvas.getByLabelText('Kontakt-E-Mail-Adresse'), 'beratung at caritas');
        await userEvent.click(canvas.getByRole('button', { name: 'Speichern' }));
        await expect(await canvas.findByText('Die E-Mail-Adresse ist nicht gültig.')).toBeVisible();
        await expect(args.onFinish).not.toHaveBeenCalled();
    },
};
