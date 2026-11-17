import { http, HttpResponse } from 'msw';
import type {
    AgencyContactCoverage,
    AgencyContactPersonAdmin,
    ContactAdmin,
    TenantContactPerson,
} from '../../types/contactPerson';

/**
 * Story answers for the contact-person reads (ORISO-Admin#1534). The centre and
 * Träger editors load them on mount, so every page story that renders those
 * editors needs them; by default nothing is set and there are no candidates.
 * Writes are deliberately not answered: a story that saves a contact person
 * must declare that PUT itself.
 */
export const contactPersonReadHandlers = ({ candidates = [] as ContactAdmin[] } = {}) => [
    http.get('*/service/useradmin/agencies/:agencyId/contactperson/candidates', () => HttpResponse.json(candidates)),
    http.get('*/service/useradmin/agencies/:agencyId/contactperson', ({ params }) =>
        HttpResponse.json<AgencyContactPersonAdmin>({
            agencyId: Number(params.agencyId),
            tenantId: null,
            contact: null,
            deputy: null,
            traegerDefault: { contact: null, deputy: null },
            effectiveSource: 'NONE',
        }),
    ),
    http.get('*/service/useradmin/tenants/:tenantId/contactperson/candidates', () => HttpResponse.json(candidates)),
    http.get('*/service/useradmin/tenants/:tenantId/contactperson', ({ params }) =>
        HttpResponse.json<TenantContactPerson>({
            tenantId: Number(params.tenantId),
            contact: null,
            deputy: null,
            generalContactEmail: null,
        }),
    ),
];

export interface CoverageStoryCentre {
    id: number;
    name: string;
    covered: boolean;
}

/**
 * The two requests behind the Home tip "centres without a contact person": the
 * centre list of the admin's scope and the coverage of those centres.
 */
export const contactCoverageHandlers = (centres: CoverageStoryCentre[]) => [
    http.get('*/service/agencyadmin/agencies', () =>
        HttpResponse.json({
            _embedded: centres.map(({ id, name }) => ({ _embedded: { id, name } })),
            total: centres.length,
        }),
    ),
    http.post('*/service/useradmin/agencycontacts/coverage', () =>
        HttpResponse.json<AgencyContactCoverage[]>(
            centres.map(({ id, covered }) => ({ agencyId: id, covered, source: covered ? 'OWN' : 'NONE' })),
        ),
    ),
];
