/**
 * Jump-to-the-first-error for antd forms (#594.6).
 *
 * `form.scrollToField(name, { block: 'center' })` looks the control up with
 * `document.getElementById(<fieldId>)`. Our fields render a MUI `TextField`
 * through `MuiFormField`, which used to swallow the `id` antd injects — so the
 * lookup found nothing and the promised jump was a silent no-op. Doing the
 * lookup here keeps the behaviour honest and testable, and additionally moves
 * KEYBOARD focus, which `scrollToField` never does: a user who pressed submit
 * lands in the field that is missing, not merely near it.
 */

export type FieldNamePath = (string | number)[];

export interface InvalidField {
    name: FieldNamePath;
    errors?: string[];
}

/** The element id antd derives from a field name (see antd `form/util#getFieldId`). */
export const fieldElementId = (name: FieldNamePath, formName?: string): string =>
    [formName, ...name].filter((part) => part !== undefined && part !== '').join('_');

/**
 * Brings the first invalid field into view and focuses it.
 * Returns false when there is nothing to jump to, so the caller can fall back
 * to its own anchor (e.g. the consent block).
 */
export const focusFirstInvalidField = (errorFields: InvalidField[], formName?: string): boolean => {
    const first = errorFields?.[0]?.name;
    if (!first || first.length === 0) return false;

    const element = document.getElementById(fieldElementId(first, formName));
    if (!element) return false;

    element.scrollIntoView?.({ block: 'center' });
    element.focus?.({ preventScroll: true });
    return true;
};

export default focusFirstInvalidField;
