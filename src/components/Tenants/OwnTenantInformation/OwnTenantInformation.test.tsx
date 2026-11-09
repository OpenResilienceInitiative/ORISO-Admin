import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import { OwnTenantInformation } from './index';

vi.mock('../../../hooks/useTenantData.hook', () => ({
    useTenantData: () => ({
        isLoading: false,
        data: {
            id: 7,
            name: 'Caritas Springfield',
            address: 'Evergreen Terrace 742, 12345 Springfield',
            legalName: 'Caritas Springfield e. V.',
            contactEmail: 'kontakt@springfield.example',
            contactPhone: '+49 30 123456',
            description: 'Beratung für die ganze Familie',
            dataProtectionOfficer: { nameAndLegalForm: 'Datenschutz GmbH', city: 'Springfield' },
        },
    }),
}));

describe('OwnTenantInformation', () => {
    it('shows what is stored for the Träger, read-only', () => {
        render(<OwnTenantInformation />);

        expect(screen.getByText('tenants.add.mainTenantTitle')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Caritas Springfield')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Evergreen Terrace 742, 12345 Springfield')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Caritas Springfield e. V.')).toBeInTheDocument();
        expect(screen.getByDisplayValue('kontakt@springfield.example')).toBeInTheDocument();
        expect(screen.getByDisplayValue('+49 30 123456')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Beratung für die ganze Familie')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Datenschutz GmbH')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Caritas Springfield')).toBeDisabled();
        expect(screen.queryByRole('button', { name: /bearbeiten|edit/i })).toBeNull();
    });

    it('never offers the licence number or subdomain, which belong to the platform admin', () => {
        render(<OwnTenantInformation />);

        expect(screen.queryByText('tenants.add.form.allowedConsultantsLicense.placeholder')).toBeNull();
        expect(screen.queryByText('tenants.add.form.subdomain.placeholder')).toBeNull();
    });
});
