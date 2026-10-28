export const statusValue = (value: boolean | null | undefined): string => {
    if (typeof value !== 'boolean') return 'unknown';
    return String(value);
};
export const statusLabel = (value: boolean | null | undefined): string => {
    if (typeof value !== 'boolean') return 'entityStatus.unknown';
    return value ? 'entityStatus.active' : 'entityStatus.inactive';
};
