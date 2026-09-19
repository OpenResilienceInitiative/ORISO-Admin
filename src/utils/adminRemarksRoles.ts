import { UserRole } from '../enums/UserRole';

/**
 * Who may read or write a counsellor's internal remarks (#994).
 *
 * Mirrors the backend gate `AuthenticatedUser#hasTenantLevelAdminRole`: for any other role the
 * field is omitted entirely, because the caller could neither read nor write it.
 *
 * One list, because BOTH consultant surfaces ask the question — the page form
 * (`src/pages/users/Edit`) and the quick-create dialog on the agency screen. A second copy is
 * how the dialog came to withhold the field altogether while the page offered it, which is the
 * same person getting a different record depending on the screen they were created from.
 */
export const ADMIN_REMARKS_ROLES: UserRole[] = [UserRole.TenantAdmin, UserRole.SingleTenantAdmin];
