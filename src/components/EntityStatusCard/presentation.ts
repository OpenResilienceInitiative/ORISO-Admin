export const statusValue = (value: boolean | null | undefined): string => {
    if (typeof value !== 'boolean') return 'unknown';
    return String(value);
};
export const statusLabel = (value: boolean | null | undefined): string => {
    if (typeof value !== 'boolean') return 'entityStatus.unknown';
    return value ? 'entityStatus.active' : 'entityStatus.inactive';
};

/** Test id of the confirmed status shown in a list row; one name for every list and the e2e checks. */
export const ENTITY_STATUS_LIST_TESTID = 'entity-status-list';

/** The data attributes of a list row's confirmed status: which entity it is and whether it is active. */
export const entityStatusListAttributes = (
    kind: 'account' | 'tenant' | 'agency',
    id: string | number,
    active: boolean | null | undefined,
) => ({
    'data-testid': ENTITY_STATUS_LIST_TESTID,
    'data-entity-kind': kind,
    'data-entity-id': id,
    'data-active': statusValue(active),
});
