import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

const mocks = vi.hoisted(() => ({
    legalSettingsProps: [] as Array<Record<string, unknown>>,
}));

vi.mock('../../../../components/Tenants/LegalSettings', () => ({
    LegalSettings: (props: Record<string, unknown>) => {
        mocks.legalSettingsProps.push(props);
        return null;
    },
}));

import { SingleLegalSettings } from './index';

const lastProps = () => mocks.legalSettingsProps[mocks.legalSettingsProps.length - 1];

describe('SingleLegalSettings — the legal tab of a Träger in the platform admin', () => {
    beforeEach(() => {
        mocks.legalSettingsProps.length = 0;
    });

    it('opens the legal documents of the Träger from the route as tiles', () => {
        render(
            <MemoryRouter initialEntries={['/tenants/7/legal']}>
                <Routes>
                    <Route path="/tenants/:id/legal" element={<SingleLegalSettings />} />
                </Routes>
            </MemoryRouter>,
        );

        expect(lastProps().tenantId).toBe('7');
        expect(lastProps().collapsible).toBe(true);
    });
});
