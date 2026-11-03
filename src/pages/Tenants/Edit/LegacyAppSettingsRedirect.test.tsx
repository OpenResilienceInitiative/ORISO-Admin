import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { LegacyAppSettingsRedirect } from './LegacyAppSettingsRedirect';

// The tab behind `app-settings` was labelled "Email Server". The functionality tiles moved to their
// own route, so a bookmark of the old URL lands on the Email Server tab it was named after.
describe('LegacyAppSettingsRedirect', () => {
    it('sends the old app-settings URL of a Träger to its Email Server tab', () => {
        render(
            <MemoryRouter initialEntries={['/admin/tenants/42/app-settings']}>
                <Routes>
                    <Route path="/admin/tenants/:id/app-settings" element={<LegacyAppSettingsRedirect />} />
                    <Route path="/admin/tenants/:id/smtp" element={<div>smtp tab for 42</div>} />
                </Routes>
            </MemoryRouter>,
        );

        expect(screen.getByText('smtp tab for 42')).toBeInTheDocument();
    });
});
