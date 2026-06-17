import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Privacy } from '../Privacy';
import routePathNames from '../../appConfig';

vi.mock('../../api/tenant/getPublicTenantData', () => ({
    default: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../context/useAppConfig', () => ({
    useAppConfigContext: () => ({
        settings: {
            useApiClusterSettings: false,
            useConsultingTypesForAgencies: false,
        },
    }),
}));

describe('Privacy', () => {
    it('PrivacyPageExists renders at /datenschutz without a blank screen', () => {
        render(
            <MemoryRouter initialEntries={[routePathNames.privacy]}>
                <Routes>
                    <Route path={routePathNames.privacy} element={<Privacy />} />
                </Routes>
            </MemoryRouter>,
        );

        expect(screen.getByText('Privacy')).toBeInTheDocument();
    });
});
