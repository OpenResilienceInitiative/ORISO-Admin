import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createInstance } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';
import { PermissionPolicyControl } from './PermissionPolicyControl';
import translationDe from '../../locales/de/translation.json';
import translationEn from '../../locales/en/translation.json';

describe('PermissionPolicyControl', () => {
    it('renders the feature title directly above its policy status', () => {
        render(
            <PermissionPolicyControl
                featureKey="featureSupervisionEnabled"
                label="Supervision"
                level="tenant"
                policy={{ value: true, mode: 'SUGGESTED' }}
                open={false}
                onOpenChange={vi.fn()}
                onChange={vi.fn()}
            />,
        );

        const title = screen.getByText('Supervision');
        const status = screen.getByText('tenants.permissions.policy.suggestion');
        expect(title.parentElement).toContainElement(status);
        expect(title.compareDocumentPosition(status)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it('offers all four states to upper roles and auto-reports the selection', async () => {
        const onChange = vi.fn();
        const user = userEvent.setup();
        render(
            <PermissionPolicyControl
                featureKey="featureSupervisionEnabled"
                label="Supervision"
                level="tenant"
                policy={{ value: true, mode: 'SUGGESTED' }}
                open
                onOpenChange={vi.fn()}
                onChange={onChange}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'tenants.permissions.policy.deactivationEnforced' }));
        expect(onChange).toHaveBeenCalledWith({ value: false, mode: 'ENFORCED' });
    });

    it('uses filled right-opening ORISO locks throughout the active suggestion menu', () => {
        render(
            <PermissionPolicyControl
                featureKey="featureSupervisionEnabled"
                label="Supervision"
                level="tenant"
                policy={{ value: true, mode: 'SUGGESTED' }}
                open
                onOpenChange={vi.fn()}
                onChange={vi.fn()}
            />,
        );

        const status = screen.getByText('tenants.permissions.policy.suggestion');
        expect(status.parentElement?.querySelector('[data-icon="lock-open-right-filled"]')).toBeInTheDocument();

        const selectedSuggestion = screen.getByRole('button', {
            name: 'tenants.permissions.policy.activationSuggested',
        });
        expect(selectedSuggestion).toHaveAttribute('aria-current', 'page');
        expect(selectedSuggestion.querySelector('[data-icon="lock-open-right-filled"]')).toBeInTheDocument();

        const alternativeSuggestion = screen.getByRole('button', {
            name: 'tenants.permissions.policy.deactivationSuggested',
        });
        expect(alternativeSuggestion.querySelector('[data-icon="lock-open-right-filled"]')).toBeInTheDocument();
        expect(alternativeSuggestion.querySelector('[data-icon="lock-open-right-400"]')).not.toBeInTheDocument();
    });

    it.each([
        {
            language: 'de',
            status: 'Empfehlung',
            activation: 'Aktivierung (anpassbar)',
            deactivation: 'Deaktivierung (anpassbar)',
        },
        {
            language: 'en',
            status: 'Recommendation',
            activation: 'Activation (adjustable)',
            deactivation: 'Deactivation (adjustable)',
        },
    ])('presents suggested policies as recommendations in $language', async (copy) => {
        const i18n = createInstance().use(initReactI18next);
        await i18n.init({
            lng: copy.language,
            fallbackLng: 'en',
            keySeparator: false,
            ns: ['translations'],
            defaultNS: 'translations',
            resources: {
                de: { translations: translationDe },
                en: { translations: translationEn },
            },
        });

        render(
            <I18nextProvider i18n={i18n}>
                <PermissionPolicyControl
                    featureKey="featureSupervisionEnabled"
                    label="Supervision"
                    level="tenant"
                    policy={{ value: true, mode: 'SUGGESTED' }}
                    open
                    onOpenChange={vi.fn()}
                    onChange={vi.fn()}
                />
            </I18nextProvider>,
        );

        expect(screen.getByText(copy.status)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: copy.activation })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: copy.deactivation })).toBeInTheDocument();
    });

    it.each([
        { language: 'de', status: 'Vorgabe' },
        { language: 'en', status: 'Requirement' },
    ])('presents enforced policies as requirements in $language', async (copy) => {
        const i18n = createInstance().use(initReactI18next);
        await i18n.init({
            lng: copy.language,
            fallbackLng: 'en',
            keySeparator: false,
            ns: ['translations'],
            defaultNS: 'translations',
            resources: {
                de: { translations: translationDe },
                en: { translations: translationEn },
            },
        });

        render(
            <I18nextProvider i18n={i18n}>
                <PermissionPolicyControl
                    featureKey="featureSupervisionEnabled"
                    label="Supervision"
                    level="tenant"
                    policy={{ value: true, mode: 'ENFORCED' }}
                    open={false}
                    onOpenChange={vi.fn()}
                    onChange={vi.fn()}
                />
            </I18nextProvider>,
        );

        expect(screen.getByText(copy.status)).toBeInTheDocument();
    });

    it('opens information directly for inherited enforced values', async () => {
        const user = userEvent.setup();
        render(
            <PermissionPolicyControl
                featureKey="featureSupervisionEnabled"
                label="Supervision"
                level="tenant"
                policy={{ value: true, mode: 'ENFORCED', inherited: true }}
                open={false}
                onOpenChange={vi.fn()}
                onChange={vi.fn()}
            />,
        );

        await user.click(screen.getByRole('button', { name: /Supervision/i }));
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it.each([{ pending: true }, { disabled: true }])('locks the menu while unavailable: %o', async (lock) => {
        const user = userEvent.setup();
        const onOpenChange = vi.fn();
        const onChange = vi.fn();
        render(
            <PermissionPolicyControl
                featureKey="featureSupervisionEnabled"
                label="Supervision"
                level="tenant"
                policy={{ value: true, mode: 'SUGGESTED' }}
                open={false}
                onOpenChange={onOpenChange}
                onChange={onChange}
                {...lock}
            />,
        );

        const button = screen.getByRole('button', { name: /Supervision/ });
        expect(button).toBeDisabled();
        await user.click(button);
        expect(onOpenChange).not.toHaveBeenCalled();
        expect(onChange).not.toHaveBeenCalled();
    });
});
