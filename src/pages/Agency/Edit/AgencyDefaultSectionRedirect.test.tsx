import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AgencyDefaultSectionRedirect } from './AgencyDefaultSectionRedirect';

/**
 * #854: opening an agency from the list lands on the bare `/admin/agency/:id`
 * route. Page.BackWithActions marks a tab active with `pathname === tab.to ||
 * pathname.startsWith(`${tab.to}/`)` — the Stammdaten tab's `to` is
 * `.../general`, a LONGER path than the bare route, so neither comparison
 * ever matches and no tab highlights. AgencyDefaultSectionRedirect
 * canonicalizes the bare route to `.../general` so the URL always matches
 * the tab it belongs to.
 */
describe('AgencyDefaultSectionRedirect (#854)', () => {
    it('redirects the bare agency route to its general section, preserving the id', () => {
        render(
            <MemoryRouter initialEntries={['/admin/agency/42']}>
                <Routes>
                    <Route path="/admin/agency/:id" element={<AgencyDefaultSectionRedirect />} />
                    <Route path="/admin/agency/:id/general" element={<div>general section for 42</div>} />
                </Routes>
            </MemoryRouter>,
        );

        expect(screen.getByText('general section for 42')).toBeInTheDocument();
    });

    it('preserves the "add" id used by the agency-creation flow', () => {
        render(
            <MemoryRouter initialEntries={['/admin/agency/add']}>
                <Routes>
                    <Route path="/admin/agency/:id" element={<AgencyDefaultSectionRedirect />} />
                    <Route path="/admin/agency/:id/general" element={<div>general section for add</div>} />
                </Routes>
            </MemoryRouter>,
        );

        expect(screen.getByText('general section for add')).toBeInTheDocument();
    });
});
