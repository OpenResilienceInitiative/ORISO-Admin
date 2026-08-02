export enum UserRole {
    Technical = 'technical',
    TenantAdmin = 'tenant-admin',
    TopicAdmin = 'topic-admin',
    SingleTenantAdmin = 'single-tenant-admin',
    UserAdmin = 'user-admin',
    AgencyAdmin = 'agency-admin',
    RestrictedAgencyAdmin = 'restricted-agency-admin',
    /** ADR-018: the single role of a support identity. Grants nothing else. */
    GlobalSupportAdmin = 'global-support-admin',
}
