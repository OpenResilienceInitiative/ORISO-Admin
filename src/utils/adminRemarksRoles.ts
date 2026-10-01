import { UserRole } from '../enums/UserRole';

/**
 * Who may read or write a counsellor's internal remarks. Mirrors the backend gate
 * `AuthenticatedUser#hasTenantLevelAdminRole`; for any other role the field is omitted entirely.
 * One list, because both consultant surfaces ask the question.
 */
export const ADMIN_REMARKS_ROLES: UserRole[] = [UserRole.TenantAdmin, UserRole.SingleTenantAdmin];
