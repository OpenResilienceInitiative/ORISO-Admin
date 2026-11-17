import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vite-plus/test';
import { AdminNotFound } from './AdminNotFound';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const CurrentPath = () => <output data-testid="path">{useLocation().pathname}</output>;

describe('AdminNotFound (ORISO-Admin#1513)', () => {
    it('says the page does not exist instead of leaving the content area blank', () => {
        render(
            <MemoryRouter>
                <AdminNotFound />
            </MemoryRouter>,
        );

        expect(screen.getByRole('heading', { name: 'errorPages.notFound.title' })).toBeInTheDocument();
        expect(screen.getByText('errorPages.notFound.description')).toBeInTheDocument();
    });

    it('offers a way back to Home', () => {
        render(
            <MemoryRouter initialEntries={['/admin/does-not-exist']}>
                <Routes>
                    <Route path="*" element={<AdminNotFound />} />
                </Routes>
                <CurrentPath />
            </MemoryRouter>,
        );

        fireEvent.click(screen.getByRole('button', { name: 'toHomePage' }));

        expect(screen.getByTestId('path')).toHaveTextContent('/admin/home');
    });
});
