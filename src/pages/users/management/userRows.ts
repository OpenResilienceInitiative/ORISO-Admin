import type { NameSortField } from '../../../components/UserTable/SortPill';
import { TypeOfUser } from '../../../enums/TypeOfUser';
import type { CounselorData } from '../../../types/counselor';
import { decodeUsername } from '../../../utils/encryptionHelpers';

type Centre = CounselorData['agencies'][number];

export const NAME_SORT_FIELD: Record<NameSortField, string> = {
    lastname: 'LASTNAME',
    firstname: 'FIRSTNAME',
    email: 'EMAIL',
};

export const DATE_SORT_FIELD = 'UPDATE_DATE';

export type UserSortColumn = 'name' | 'lastUpdated';

export const nameFieldOf = (sortBy?: string): NameSortField | undefined =>
    (Object.keys(NAME_SORT_FIELD) as NameSortField[]).find((key) => NAME_SORT_FIELD[key] === sortBy);

export const sortColumnOf = (sortBy?: string): UserSortColumn | undefined => {
    if (nameFieldOf(sortBy)) return 'name';
    return sortBy === DATE_SORT_FIELD ? 'lastUpdated' : undefined;
};

export const displayName = (row: CounselorData) => [row.firstname, row.lastname].filter(Boolean).join(' ');

// Legacy rows may still hold the Base32 `enc.…` form; a broken one is shown raw.
export const displayUsername = (username: string) => {
    try {
        return decodeUsername(username);
    } catch {
        return username;
    }
};

// Topics are assigned per person; at a centre only those the centre offers apply.
export const topicsAtCentre = (row: CounselorData, centre: Centre): string[] | undefined => {
    if (!row.topics?.length || !centre.topics?.length) return undefined;
    const offered = new Set(centre.topics.map((topic) => topic.id));
    return row.topics.filter((topic) => offered.has(topic.id)).map((topic) => topic.name);
};

// Consultants tab marks "also Träger admin"; the admin tabs mark "also counsellor".
export const hasOtherIdentityFor = (sectionId: TypeOfUser, row: CounselorData) =>
    sectionId === TypeOfUser.Consultants
        ? (row.otherIdentityTypes ?? []).includes('TENANT_ADMIN')
        : !!row.hasOtherIdentity;

/** Next server page under the rows already shown; a person the server repeats is skipped. */
export const appendPage = (shown: CounselorData[], next: CounselorData[]): CounselorData[] => {
    const ids = new Set(shown.map((row) => row.id));
    const fresh = next.filter((row) => !ids.has(row.id));
    return fresh.length ? [...shown, ...fresh] : shown;
};
