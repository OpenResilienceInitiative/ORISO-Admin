import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Form } from 'antd';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../theme/orisoMuiTheme';
import { DpaFormSection } from './DpaFormSection';
import { LONG_DPA_HTML, PHONE_390 } from './dpaStoryText';

const InteractiveSection = ({ initiallyTouched = false }: { initiallyTouched?: boolean }) => {
    const [accepted, setAccepted] = useState(false);
    const [touched, setTouched] = useState(initiallyTouched);
    const [form] = Form.useForm();

    return (
        <ThemeProvider theme={orisoMuiTheme}>
            <Form
                form={form}
                layout="vertical"
                requiredMark={false}
                initialValues={{ signerName: '', signerPosition: '', signerEmail: '', signerOrganisation: '' }}
            >
                <DpaFormSection
                    dpaHtml={LONG_DPA_HTML}
                    textLabel="Vertragsunterlagen"
                    textDescription="Bitte prüfen Sie die Vertragsunterlagen und bestätigen Sie sie für Ihre Organisation."
                    accepted={accepted}
                    acceptTouched={touched}
                    onAcceptedChange={(value) => {
                        setAccepted(value);
                        setTouched(true);
                    }}
                />
            </Form>
        </ThemeProvider>
    );
};

/**
 * The ONE shared DPA/AVV form block (#569 hardening, reworked in #594): the
 * canonical read-only reader with its chapter chips, the signer fields, and
 * the consent act. Ticking "I confirm" IS the signature, so it is an outlined
 * block of its own with a large hit area — not a footnote beside the fields.
 */
const meta = {
    title: 'Molecules/DpaLegalForm',
    component: DpaFormSection,
    parameters: { layout: 'centered' },
} satisfies Meta<typeof DpaFormSection>;

export default meta;
// render-only stories (interactive local state) — no meta-typed args needed
type Story = StoryObj;

/** Desktop reading column: chapter chips, signer fields, consent block. */
export const Desktop: Story = {
    render: () => (
        <div style={{ width: 'min(700px, 94vw)', padding: '16px 0' }}>
            <InteractiveSection />
        </div>
    ),
};

/** The signed state: consent given — the block switches to the primary tone. */
export const ConsentGiven: Story = {
    render: () => (
        <div style={{ width: 'min(700px, 94vw)', padding: '16px 0' }}>
            <InteractiveSection />
        </div>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole('checkbox'));
        await waitFor(() => expect(canvas.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true'));
    },
};

/** Submit was pressed without the confirmation: the block is marked. */
export const ConsentMissing: Story = {
    render: () => (
        <div style={{ width: 'min(700px, 94vw)', padding: '16px 0' }}>
            <InteractiveSection initiallyTouched />
        </div>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByTestId('dpa-consent-error')).toBeVisible();
    },
};

/** 390x844: same block, same prominence — nothing collapses into a footnote. */
export const Mobile: Story = {
    render: () => (
        <div style={{ width: '100%', padding: '16px 0' }}>
            <InteractiveSection />
        </div>
    ),
    ...PHONE_390,
    parameters: { ...PHONE_390.parameters, layout: 'padded' },
};
