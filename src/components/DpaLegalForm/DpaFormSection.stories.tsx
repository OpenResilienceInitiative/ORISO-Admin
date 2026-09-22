import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Form } from 'antd';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../theme/orisoMuiTheme';
import { DpaFormSection } from './DpaFormSection';
import type { DpaUnavailableReason } from '../../api/tenantOnboarding/tenantOnboarding';
import { LONG_DPA_HTML, PHONE_390 } from './dpaStoryText';

/** The desktop reading column every story renders the section in. */
const ReadingColumn = ({ children }: { children: ReactNode }) => (
    <div style={{ width: 'min(700px, 94vw)', padding: '16px 0' }}>{children}</div>
);

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
        <ReadingColumn>
            <InteractiveSection />
        </ReadingColumn>
    ),
};

/** The signed state: consent given — the block switches to the primary tone. */
export const ConsentGiven: Story = {
    render: () => (
        <ReadingColumn>
            <InteractiveSection />
        </ReadingColumn>
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
        <ReadingColumn>
            <InteractiveSection initiallyTouched />
        </ReadingColumn>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByTestId('dpa-consent-error')).toBeVisible();
    },
};

/**
 * The empty-agreement states. `dpaHtml=""` withholds reader, signer fields and
 * consent act; `unavailableReason` decides WHICH explanation is shown. The
 * three variants exist because their remedies are different: tell the
 * operator their server is misconfigured, wait for the operator to publish,
 * or the legacy catch-all against a backend that does not send the field.
 */
const UnavailableSection = ({ reason }: { reason?: DpaUnavailableReason }) => {
    const [form] = Form.useForm();

    return (
        <ThemeProvider theme={orisoMuiTheme}>
            <Form form={form} layout="vertical" requiredMark={false}>
                <DpaFormSection
                    dpaHtml=""
                    unavailableReason={reason}
                    textLabel="Vertragsunterlagen"
                    accepted={false}
                    acceptTouched={false}
                    onAcceptedChange={() => {}}
                />
            </Form>
        </ThemeProvider>
    );
};

/** The backend's own read of the published text failed — a platform defect. */
export const UnavailableUpstreamError: Story = {
    render: () => (
        <ReadingColumn>
            <UnavailableSection reason="UPSTREAM_ERROR" />
        </ReadingColumn>
    ),
    play: async ({ canvas }) => {
        const alert = await canvas.findByTestId('dpa-content-unavailable');
        // Naming the cause is the whole point: no "please reload" here.
        await expect(alert).toHaveTextContent(/Plattform-Konfiguration/);
        await expect(alert).toHaveTextContent(/Neuladen der Seite hilft hier nicht/);
        await expect(canvas.queryByRole('checkbox')).not.toBeInTheDocument();
    },
};

/** Nothing published yet — the operator owes a contract text, not a fix. */
export const UnavailableNotPublished: Story = {
    render: () => (
        <ReadingColumn>
            <UnavailableSection reason="NOT_PUBLISHED" />
        </ReadingColumn>
    ),
    play: async ({ canvas }) => {
        const alert = await canvas.findByTestId('dpa-content-unavailable');
        await expect(alert).toHaveTextContent(/noch keine Vertragsunterlagen veröffentlicht/);
        await expect(canvas.queryByRole('checkbox')).not.toBeInTheDocument();
    },
};

/** No reason from the backend (older deployment): the generic wording stands. */
export const UnavailableWithoutReason: Story = {
    render: () => (
        <ReadingColumn>
            <UnavailableSection />
        </ReadingColumn>
    ),
    play: async ({ canvas }) => {
        const alert = await canvas.findByTestId('dpa-content-unavailable');
        await expect(alert).toHaveTextContent(/Bitte laden Sie die Seite neu/);
        await expect(canvas.queryByRole('checkbox')).not.toBeInTheDocument();
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
