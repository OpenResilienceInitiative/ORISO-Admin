import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TwoFactorStep } from './TwoFactorStep';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
    }),
}));

const RAW_SECRET = 'ORISOSECRET234567ABCDEFGHIJKLMNO';
const BASE32_SECRET = 'J5JESU2PKNCUGUSFKQZDGNBVGY3UCQSDIRCUMR2IJFFEWTCNJZHQ';

describe('TwoFactorStep', () => {
    it('shows the base32 form of the secret, not the raw value the service stores', () => {
        // Keycloak uses the raw characters as the HMAC key; an authenticator
        // needs their base32 form. Handing out the raw value produces codes
        // that never match, which is indistinguishable from "2FA is broken".
        render(
            <TwoFactorStep
                result={{ tenantId: 7, twoFactor: { secret: RAW_SECRET, qrCodeBase64: null }, resumed: false }}
                busy={false}
                showCodeError={false}
                showServiceError={false}
                onSubmit={() => {}}
            />,
        );

        const shown = screen.getByTestId('totp-secret').textContent ?? '';
        expect(shown).toBe(BASE32_SECRET);
    });

    it('renders the verify-only variant when a resumed link reissued no secret', () => {
        render(
            <TwoFactorStep
                result={{ tenantId: 7, twoFactor: null, resumed: true }}
                busy={false}
                showCodeError={false}
                showServiceError={false}
                onSubmit={() => {}}
            />,
        );

        expect(screen.queryByTestId('totp-secret')).not.toBeInTheDocument();
    });
});
