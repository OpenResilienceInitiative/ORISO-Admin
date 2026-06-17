import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Imprint } from '../Imprint';
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

describe('Imprint', () => {
    it('ImprintPageExists renders at /impressum without a blank screen', () => {
        render(
            <MemoryRouter initialEntries={[routePathNames.imprint]}>
                <Routes>
                    <Route path={routePathNames.imprint} element={<Imprint />} />
                </Routes>
            </MemoryRouter>,
        );

        expect(screen.getByText('Impressum')).toBeInTheDocument();
    });
});
