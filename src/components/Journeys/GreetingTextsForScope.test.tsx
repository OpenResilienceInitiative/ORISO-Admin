import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { GreetingTextsForScope } from './GreetingTextsForScope';

vi.mock('../Tenants/AppSettings/ErstantwortSettings/PlatformGreeting', () => ({
    PlatformGreetingSettings: () => <p>platform greeting page</p>,
}));
vi.mock('../Tenants/AppSettings/ErstantwortSettings', () => ({
    ErstantwortSettings: ({ tenantId, readOnly }: { tenantId: string; readOnly?: boolean }) => (
        <p>{`träger ${tenantId} ${readOnly ? 'read' : 'write'}`}</p>
    ),
}));
vi.mock('../Tenants/AppSettings/ErstantwortSettings/AgencyErstantwort', () => ({
    AgencyErstantwortSettings: ({ agencyId, languageFormal }: { agencyId: string; languageFormal?: boolean }) => (
        <p>{`centre ${agencyId} formal=${String(languageFormal)}`}</p>
    ),
}));
vi.mock('../../hooks/useUserPermission', () => ({ useUserPermissions: () => ({ can: () => true }) }));
vi.mock('../../hooks/useSingleTenantData', () => ({
    useSingleTenantData: ({ id }: { id: string }) => ({
        data: id === '9' ? { settings: { extendedSettings: { languageFormal: false } } } : undefined,
    }),
}));

afterEach(cleanup);

/** ORISO-Admin#1660 gap 1: the greeting step edits the store of the level, like the old page. */
describe('GreetingTextsForScope', () => {
    it('shows the platform greeting page on the platform', () => {
        render(<GreetingTextsForScope scope={{ level: 'platform' }} />);
        expect(screen.getByText('platform greeting page')).toBeTruthy();
    });

    it("shows the Träger's own texts for a Träger", () => {
        render(<GreetingTextsForScope scope={{ level: 'tenant', tenantId: '9' }} />);
        expect(screen.getByText('träger 9 write')).toBeTruthy();
    });

    it("shows the centre's texts with its Träger's form of address", () => {
        render(<GreetingTextsForScope scope={{ level: 'agency', tenantId: '9', agencyId: '42' }} />);
        expect(screen.getByText('centre 42 formal=false')).toBeTruthy();
    });

    it('shows nothing while the Träger or centre is unknown', () => {
        const { container } = render(<GreetingTextsForScope scope={{ level: 'tenant' }} />);
        expect(container.textContent).toBe('');
    });
});
