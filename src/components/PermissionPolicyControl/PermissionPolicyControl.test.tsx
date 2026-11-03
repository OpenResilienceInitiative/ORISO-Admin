import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createInstance } from 'i18next';
import type { ComponentProps } from 'react';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';
import { PermissionPolicyControl } from './PermissionPolicyControl';
import translationDe from '../../locales/de/translation.json';
import translationEn from '../../locales/en/translation.json';

const createI18n = async (language: string) => {
    const i18n = createInstance().use(initReactI18next);
    await i18n.init({
        lng: language,
        fallbackLng: 'en',
        keySeparator: false,
        ns: ['translations'],
        defaultNS: 'translations',
        resources: {
            de: { translations: translationDe },
            en: { translations: translationEn },
        },
    });
    return i18n;
};

const POLICY = 'tenants.permissions.policy';
const suggestion = `${POLICY}.suggestion`;
const enforced = `${POLICY}.enforced`;

const renderControl = (
    props: Partial<ComponentProps<typeof PermissionPolicyControl>> &
        Pick<ComponentProps<typeof PermissionPolicyControl>, 'policy'>,
) => {
    const onChange = vi.fn();
    render(
        <PermissionPolicyControl
            featureKey="featureSupervisionEnabled"
            label="Supervision"
            level="tenant"
            onChange={onChange}
            {...props}
        />,
    );
    return onChange;
};

const switchName = (value: boolean) =>
    `Supervision: ${POLICY}.${value ? 'activated' : 'deactivated'} – ${POLICY}.${value ? 'deactivate' : 'activate'}`;
const lockName = (isEnforced: boolean) =>
    `Supervision: ${isEnforced ? enforced : suggestion} – ${POLICY}.${isEnforced ? 'makeAdjustable' : 'makeRequired'}`;

describe('PermissionPolicyControl', () => {
    it('renders the feature title directly above its policy status', () => {
        renderControl({ level: 'tenant', policy: { value: true, mode: 'SUGGESTED' } });

        const title = screen.getByText('Supervision');
        const status = screen.getByText(suggestion);
        expect(title.parentElement).toContainElement(status);
        expect(title.compareDocumentPosition(status)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it('keeps the on/off decision and the requirement decision on two separate buttons', async () => {
        const user = userEvent.setup();
        const onChange = renderControl({ level: 'tenant', policy: { value: true, mode: 'SUGGESTED' } });

        await user.click(screen.getByRole('button', { name: switchName(true) }));
        expect(onChange).toHaveBeenLastCalledWith({ value: false, mode: 'SUGGESTED' });

        await user.click(screen.getByRole('button', { name: lockName(false) }));
        expect(onChange).toHaveBeenLastCalledWith({ value: true, mode: 'ENFORCED' });
        expect(onChange).toHaveBeenCalledTimes(2);
    });

    it.each([{ level: 'platform' as const }, { level: 'tenant' as const }])(
        'turns a feature on and off without touching the mode at $level level',
        async ({ level }) => {
            const user = userEvent.setup();
            const onChange = renderControl({ level, policy: { value: false, mode: 'ENFORCED' } });

            await user.click(screen.getByRole('button', { name: switchName(false) }));
            expect(onChange).toHaveBeenCalledWith({ value: true, mode: 'ENFORCED' });
        },
    );

    it('turns the requirement off again from the lock without changing the value', async () => {
        const user = userEvent.setup();
        const onChange = renderControl({ level: 'platform', policy: { value: false, mode: 'ENFORCED' } });

        await user.click(screen.getByRole('button', { name: lockName(true) }));
        expect(onChange).toHaveBeenCalledWith({ value: false, mode: 'SUGGESTED' });
    });

    it.each([
        { value: true, mode: 'SUGGESTED' as const },
        { value: false, mode: 'SUGGESTED' as const },
        { value: true, mode: 'ENFORCED' as const },
        { value: false, mode: 'ENFORCED' as const },
    ])('exposes both states as pressed buttons: value=$value mode=$mode', ({ value, mode }) => {
        renderControl({ level: 'tenant', policy: { value, mode } });

        const round = screen.getByRole('button', { name: switchName(value) });
        expect(round).toHaveAttribute('aria-pressed', String(value));
        expect(round.querySelector(`[data-testid="${value ? 'CheckIcon' : 'BlockIcon'}"]`)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: lockName(mode === 'ENFORCED') })).toHaveAttribute(
            'aria-pressed',
            String(mode === 'ENFORCED'),
        );
    });

    it('uses filled right-opening ORISO locks for adjustable settings', () => {
        renderControl({ level: 'tenant', policy: { value: true, mode: 'SUGGESTED' } });

        const lock = screen.getByRole('button', { name: lockName(false) });
        expect(lock.querySelector('[data-icon="lock-open-right-filled"]')).toBeInTheDocument();
        expect(lock.querySelector('[data-icon="lock-open-right-400"]')).not.toBeInTheDocument();
    });

    it.each([{ value: true }, { value: false }])(
        'lets a Beratungsstelle only switch, never set a requirement: value=$value',
        async ({ value }) => {
            const user = userEvent.setup();
            const onChange = renderControl({ level: 'agency', policy: { value, mode: 'SUGGESTED' } });

            expect(screen.queryByRole('button', { name: /makeRequired|makeAdjustable/ })).not.toBeInTheDocument();
            expect(screen.getAllByRole('button')).toHaveLength(1);
            expect(screen.getByText(suggestion)).toBeInTheDocument();

            await user.click(screen.getByRole('button', { name: switchName(value) }));
            expect(onChange).toHaveBeenCalledWith({ value: !value, mode: 'SUGGESTED' });
        },
    );

    it('never writes an enforced mode from an agency, even if it was inherited as enforced data', async () => {
        const user = userEvent.setup();
        const onChange = renderControl({ level: 'agency', policy: { value: true, mode: 'ENFORCED' } });

        expect(screen.queryByRole('button', { name: /makeAdjustable|makeRequired/ })).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: switchName(true) }));
        expect(onChange).toHaveBeenCalledWith({ value: false, mode: 'SUGGESTED' });
    });

    it('shows a requirement inherited from above as a read-only state, with no lock and no dialog', async () => {
        const user = userEvent.setup();
        const onChange = renderControl({ level: 'tenant', policy: { value: true, mode: 'ENFORCED', inherited: true } });

        const round = screen.getByRole('button', { name: `Supervision: ${POLICY}.activated` });
        expect(round).toBeDisabled();
        expect(round).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getAllByRole('button')).toHaveLength(1);
        expect(screen.getByText(enforced)).toBeInTheDocument();

        await user.click(round);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(onChange).not.toHaveBeenCalled();
    });

    it('lets the platform change a requirement even when it carries the inherited flag', async () => {
        const user = userEvent.setup();
        const onChange = renderControl({
            level: 'platform',
            policy: { value: true, mode: 'ENFORCED', inherited: true },
        });

        await user.click(screen.getByRole('button', { name: switchName(true) }));
        expect(onChange).toHaveBeenCalledWith({ value: false, mode: 'ENFORCED' });
    });

    it('locks both buttons while a write is pending', async () => {
        const user = userEvent.setup();
        const onChange = renderControl({ level: 'tenant', policy: { value: true, mode: 'SUGGESTED' }, pending: true });

        const buttons = screen.getAllByRole('button');
        expect(buttons).toHaveLength(2);
        buttons.forEach((button) => expect(button).toBeDisabled());
        await Promise.all(buttons.map((button) => user.click(button)));
        expect(onChange).not.toHaveBeenCalled();
    });

    it('renders a disabled control as plain read-only state', async () => {
        const user = userEvent.setup();
        const onChange = renderControl({ level: 'tenant', policy: { value: true, mode: 'SUGGESTED' }, disabled: true });

        const round = screen.getByRole('button', { name: `Supervision: ${POLICY}.activated` });
        expect(round).toBeDisabled();
        expect(screen.getAllByRole('button')).toHaveLength(1);
        expect(screen.getByText(suggestion)).toBeInTheDocument();

        await user.click(round);
        expect(onChange).not.toHaveBeenCalled();
    });

    it('has no menu, information entry or dialog any more', async () => {
        const user = userEvent.setup();
        renderControl({ level: 'tenant', policy: { value: true, mode: 'SUGGESTED' } });

        await user.click(screen.getByRole('button', { name: switchName(true) }));
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /moreInformation/ })).not.toBeInTheDocument();
    });

    // Keep the language tests last: initReactI18next registers the global i18n instance for later tests.
    it.each([
        {
            language: 'de',
            status: 'Anpassbar',
            round: 'Supervision: Aktiviert – Deaktivieren',
            lock: 'Supervision: Anpassbar – Als Vorgabe festlegen',
        },
        {
            language: 'en',
            status: 'Adjustable',
            round: 'Supervision: Active – Deactivate',
            lock: 'Supervision: Adjustable – Make it a requirement',
        },
    ])('presents adjustable policies as adjustable in $language', async (copy) => {
        const i18n = await createI18n(copy.language);

        render(
            <I18nextProvider i18n={i18n}>
                <PermissionPolicyControl
                    featureKey="featureSupervisionEnabled"
                    label="Supervision"
                    level="tenant"
                    policy={{ value: true, mode: 'SUGGESTED' }}
                    onChange={vi.fn()}
                />
            </I18nextProvider>,
        );

        expect(screen.getByText(copy.status)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: copy.round })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: copy.lock })).toBeInTheDocument();
    });

    it.each([
        { language: 'de', status: 'Vorgabe', lock: 'Supervision: Vorgabe – Anpassbar machen' },
        { language: 'en', status: 'Requirement', lock: 'Supervision: Requirement – Make it adjustable' },
    ])('presents enforced policies as requirements in $language', async (copy) => {
        const i18n = await createI18n(copy.language);

        render(
            <I18nextProvider i18n={i18n}>
                <PermissionPolicyControl
                    featureKey="featureSupervisionEnabled"
                    label="Supervision"
                    level="tenant"
                    policy={{ value: true, mode: 'ENFORCED' }}
                    onChange={vi.fn()}
                />
            </I18nextProvider>,
        );

        expect(screen.getByText(copy.status)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: copy.lock })).toBeInTheDocument();
    });
});
