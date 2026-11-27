import type { ContactAdmin } from '../../types/contactPerson';

/** Story and test data shaped like `ContactAdminDTO` (ORISO-Admin#1534). */
export const MARIA: ContactAdmin = {
    adminId: '7b1c2d3e-0000-4000-8000-000000000001',
    firstName: 'Maria',
    lastName: 'Muster',
    loginEmail: 'm.muster@login.caritas-nord.example',
    contactEmail: 'ansprechperson@caritas-nord.example',
    displayEmail: 'ansprechperson@caritas-nord.example',
    type: 'AGENCY',
    isConsultant: true,
};

export const JONAS: ContactAdmin = {
    adminId: '7b1c2d3e-0000-4000-8000-000000000002',
    firstName: 'Jonas',
    lastName: 'Beispiel',
    loginEmail: 'j.beispiel@caritas-nord.example',
    contactEmail: null,
    displayEmail: 'j.beispiel@caritas-nord.example',
    type: 'AGENCY',
    isConsultant: false,
};

export const PETRA: ContactAdmin = {
    adminId: '7b1c2d3e-0000-4000-8000-000000000003',
    firstName: 'Petra',
    lastName: 'Träger',
    loginEmail: 'p.traeger@caritas-sued.example',
    contactEmail: 'kontakt@caritas-sued.example',
    displayEmail: 'kontakt@caritas-sued.example',
    type: 'TENANT',
    isConsultant: false,
};

export const TOM: ContactAdmin = {
    adminId: '7b1c2d3e-0000-4000-8000-000000000004',
    firstName: 'Tom',
    lastName: 'Vertreter',
    loginEmail: 't.vertreter@caritas-sued.example',
    contactEmail: null,
    displayEmail: 't.vertreter@caritas-sued.example',
    type: 'TENANT',
    isConsultant: false,
};

export const CANDIDATES: ContactAdmin[] = [MARIA, JONAS, PETRA, TOM];
