export enum UserRole {
    Technical = 'technical',
    TenantAdmin = 'tenant-admin',
    TopicAdmin = 'topic-admin',
    SingleTenantAdmin = 'single-tenant-admin',
    UserAdmin = 'user-admin',
    AgencyAdmin = 'agency-admin',
    RestrictedAgencyAdmin = 'restricted-agency-admin',
    Consultant = 'consultant',
    /** Read-only platform statistics account (ORISO-UserService#1666). */
    StatisticsReader = 'statistics-reader',
}
