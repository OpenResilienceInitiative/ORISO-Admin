/**
 * The `contactEmail` to send for an admin (ORISO-Admin#1534). The UserService
 * keeps the stored value when the field is absent and clears it on "", so an
 * unchanged field is left out and an emptied one is sent as "".
 *
 * @returns the trimmed value to send, or `undefined` to leave the field out.
 */
export const contactEmailForSave = (
    value: unknown,
    stored: string | null | undefined,
    isEditing: boolean,
): string | undefined => {
    if (value === undefined) return undefined;
    const next = typeof value === 'string' ? value.trim() : '';
    if (!isEditing) return next || undefined;
    return next === (stored ?? '').trim() ? undefined : next;
};
