let counter = 0;

/** Ids for steps, questions and links created in the editor. */
export const nextId = (prefix: string) => {
    counter += 1;
    return `${prefix}-${Date.now().toString(36)}-${counter}`;
};
