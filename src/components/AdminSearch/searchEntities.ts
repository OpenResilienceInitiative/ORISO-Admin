import { listPathWithQuery } from '../../hooks/useListQuery';
import routePathNames from '../../appConfig';
import type { SearchDoc, SearchLevel } from './searchTypes';

/**
 * Turns rows of the existing list endpoints into search documents. The lists are
 * fetched by the view with the same hooks the pages use (`useTenantsData`,
 * `useAgenciesData`, `useTopicList`, `useConsultantsOrAdminsData`) and only for
 * roles that may read them; this file only maps and never asks the server itself.
 */

export interface EntityLabels {
    tenants: string;
    agencies: string;
    topics: string;
    departments: string;
    accounts: string;
    /** "Counsellors", "Agency admins" … keyed by account list id. */
    accountLists: Record<string, string>;
}

const entityTerms = (title: string, ...extra: Array<string | undefined>) => ({
    title: [title],
    fields: [],
    synonyms: [],
    description: extra.filter((value): value is string => !!value),
    context: [],
});

export interface TenantRow {
    id?: number | string | null;
    name?: string;
    subdomain?: string;
}

export const tenantDocs = (rows: TenantRow[], labels: EntityLabels): SearchDoc[] =>
    rows
        .filter((row) => row.id != null && row.name)
        .map((row) => ({
            id: `tenant:${row.id}`,
            kind: 'tenant' as const,
            title: row.name as string,
            description: row.subdomain,
            breadcrumb: [labels.tenants, row.name as string],
            to: `${routePathNames.tenants}/${row.id}/general`,
            level: 'tenant' as SearchLevel,
            terms: entityTerms(row.name as string, row.subdomain, String(row.id)),
        }));

export interface AgencyRow {
    id?: number | string | null;
    name?: string;
    city?: string;
    topics?: Array<{ id?: number | null; name?: string }>;
}

export const agencyDocs = (rows: AgencyRow[], labels: EntityLabels): SearchDoc[] =>
    rows
        .filter((row) => row.id != null && row.name)
        .map((row) => ({
            id: `agency:${row.id}`,
            kind: 'agency' as const,
            title: row.name as string,
            description: row.city,
            breadcrumb: [labels.agencies, row.name as string],
            to: `${routePathNames.agency}/${row.id}/general`,
            level: 'agency' as SearchLevel,
            terms: entityTerms(row.name as string, row.city, String(row.id)),
        }));

/** Fachbereiche are the topics assigned to an agency (ADR-014): one row per agency and topic. */
export const departmentDocs = (rows: AgencyRow[], labels: EntityLabels): SearchDoc[] =>
    rows
        .filter((row) => row.id != null && row.name)
        .flatMap((row) =>
            (row.topics ?? [])
                .filter((topic) => topic.id != null && topic.name)
                .map((topic) => ({
                    id: `department:${row.id}:${topic.id}`,
                    kind: 'department' as const,
                    title: topic.name as string,
                    breadcrumb: [labels.agencies, row.name as string, topic.name as string],
                    to: `${routePathNames.agency}/${row.id}/general`,
                    tileKey: 'agency.edit.settings.title',
                    level: 'agency' as SearchLevel,
                    terms: entityTerms(topic.name as string, row.name),
                })),
        );

export interface TopicRow {
    id?: number | null;
    name?: string;
    description?: string;
    internalIdentifier?: string | null;
}

export const topicDocs = (rows: TopicRow[], labels: EntityLabels, canEdit: boolean): SearchDoc[] =>
    rows
        .filter((row) => row.id != null && row.name)
        .map((row) => ({
            id: `topic:${row.id}`,
            kind: 'topic' as const,
            title: row.name as string,
            description: row.description,
            breadcrumb: [labels.topics, row.name as string],
            to: canEdit ? `${routePathNames.topics}/${row.id}` : routePathNames.topics,
            level: 'platform' as SearchLevel,
            terms: entityTerms(row.name as string, row.description, row.internalIdentifier ?? undefined),
        }));

export interface AccountRow {
    id?: string;
    firstname?: string;
    lastname?: string;
    email?: string;
    username?: string;
}

/** `list` is the route segment of the account list (`consultants`, `agency-admins`, `tenant-admins`). */
export const accountDocs = (
    rows: AccountRow[],
    list: 'consultants' | 'agency-admins' | 'tenant-admins',
    labels: EntityLabels,
): SearchDoc[] => {
    const level: SearchLevel = list === 'tenant-admins' ? 'tenant' : 'agency';

    return rows
        .filter((row) => row.id && (row.firstname || row.lastname || row.username))
        .map((row) => {
            const name = [row.firstname, row.lastname].filter(Boolean).join(' ') || (row.username as string);

            return {
                id: `account:${list}:${row.id}`,
                kind: 'account' as const,
                title: name,
                description: row.email ?? row.username,
                breadcrumb: [labels.accounts, labels.accountLists[list] ?? list, name],
                to: `${routePathNames.users}/${list}/${row.id}`,
                listPath: `${routePathNames.users}/${list}`,
                level,
                terms: entityTerms(name, row.email, row.username),
            };
        });
};

/**
 * Advice seekers have no detail page: a hit opens their list narrowed to that username, where the
 * admin can delete them (ORISO-Admin#1521). The server matches the complete username only.
 */
export const adviceSeekerDocs = (rows: Array<{ id?: string; username?: string }>, labels: EntityLabels): SearchDoc[] =>
    rows
        .filter((row): row is { id: string; username: string } => Boolean(row.id && row.username))
        .map((row) => ({
            id: `account:advice-seekers:${row.id}`,
            kind: 'account' as const,
            title: row.username,
            description: labels.accountLists['advice-seekers'],
            breadcrumb: [labels.accounts, labels.accountLists['advice-seekers'] ?? 'advice-seekers', row.username],
            to: listPathWithQuery(routePathNames.adviceSeekers, row.username),
            level: 'agency' as SearchLevel,
            terms: entityTerms(row.username),
        }));
