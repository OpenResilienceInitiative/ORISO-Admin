import { useState } from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { Form } from 'antd';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DpaFormSection } from './DpaFormSection';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, fallback?: string | Record<string, unknown>) =>
            typeof fallback === 'string' ? fallback : key,
        i18n: { language: 'de' },
    }),
}));

beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });
    Element.prototype.scrollIntoView = vi.fn();
});

const HTML = '<h2>§ 1 Gegenstand</h2><p>Text</p><h2>§ 2 Pflichten</h2><p>Text</p>';

const Host = ({ acceptTouched = false }: { acceptTouched?: boolean }) => {
    const [accepted, setAccepted] = useState(false);
    const [touched, setTouched] = useState(acceptTouched);
    return (
        <Form
            layout="vertical"
            initialValues={{ signerName: '', signerPosition: '', signerEmail: '', signerOrganisation: '' }}
        >
            <DpaFormSection
                dpaHtml={HTML}
                textLabel="AVV"
                accepted={accepted}
                acceptTouched={touched}
                onAcceptedChange={(value) => {
                    setAccepted(value);
                    setTouched(true);
                }}
            />
        </Form>
    );
};

describe('DpaFormSection — one canonical reader, no parallel navigation (#594.1)', () => {
    it('navigates chapters with the shared chip row and has no home-grown table of contents', async () => {
        const { container } = render(<Host />);

        await waitFor(() => expect(container.querySelectorAll('[data-anchor-chip]')).toHaveLength(2));
        expect(screen.queryByTestId('dpa-toc')).not.toBeInTheDocument();
        expect(screen.queryByTestId('dpa-toc-select')).not.toBeInTheDocument();
        // No ad-hoc native select anywhere in the block (#594.4).
        expect(container.querySelector('select')).toBeNull();
    });
});

describe('DpaFormSection — consent is the deliberate act (#594.5)', () => {
    it('renders the confirmation as its own block, not as a footnote next to the fields', async () => {
        render(<Host />);

        const consent = await screen.findByTestId('dpa-consent');
        const checkbox = screen.getByRole('checkbox', { name: 'tenantOnboarding.dpa.accept' });
        expect(consent).toContainElement(checkbox);
        // The block sits AFTER the signer fields — it is the closing act.
        const lastField = screen.getByLabelText('tenantOnboarding.dpa.signerOrganisation');
        // eslint-disable-next-line no-bitwise
        expect(lastField.compareDocumentPosition(consent) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('announces the confirmation exactly once (the visible wording is not read twice)', async () => {
        render(<Host />);

        await screen.findByTestId('dpa-consent');
        expect(screen.getAllByRole('checkbox', { name: 'tenantOnboarding.dpa.accept' })).toHaveLength(1);
        expect(screen.queryAllByText('tenantOnboarding.dpa.accept')[0]?.closest('[aria-hidden="true"]')).not.toBeNull();
    });

    it('marks the block when a submit was attempted without it, and clears on ticking', async () => {
        const user = userEvent.setup();
        render(<Host acceptTouched />);

        expect(await screen.findByTestId('dpa-consent-error')).toBeInTheDocument();

        await user.click(screen.getByRole('checkbox', { name: 'tenantOnboarding.dpa.accept' }));

        expect(screen.getByRole('checkbox', { name: 'tenantOnboarding.dpa.accept' })).toHaveAttribute(
            'aria-checked',
            'true',
        );
        expect(screen.queryByTestId('dpa-consent-error')).not.toBeInTheDocument();
    });

    it('toggles from the whole block, so the target is not just the 18px box', async () => {
        const user = userEvent.setup();
        render(<Host />);

        await screen.findByTestId('dpa-consent');
        await user.click(screen.getByText('tenantOnboarding.dpa.acceptHint'));

        expect(screen.getByRole('checkbox', { name: 'tenantOnboarding.dpa.accept' })).toHaveAttribute(
            'aria-checked',
            'true',
        );
    });
});
