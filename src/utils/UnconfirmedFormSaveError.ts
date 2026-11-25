/** A save failed to confirm its result. A fresh read may provide the currently stored form values. */
export class UnconfirmedFormSaveError extends Error {
    currentValues?: Record<string, unknown>;

    recordCurrentValues(values: Record<string, unknown>) {
        this.currentValues = values;
    }
}
