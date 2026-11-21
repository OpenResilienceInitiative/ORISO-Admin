let counter = 0;

/**
 * Draft ids mark what the editor created and the store has not saved yet. On saving, UserService
 * replaces each with an id of its own, the same one wherever it is referenced
 * (ORISO-UserService#1689), and answers with the stored journey.
 */
export const DRAFT_ID_PREFIX = 'new:';

export const isDraftId = (id: string) => id.startsWith(DRAFT_ID_PREFIX);

/** Ids for steps, questions, journeys and links created in the editor: drafts until saved. */
export const nextId = (prefix: string) => {
    counter += 1;
    return `${DRAFT_ID_PREFIX}${prefix}-${Date.now().toString(36)}-${counter}`;
};

/**
 * What the server does with draft ids, for the memory store: each gets an id of its own kind,
 * and every field naming it (`id`, `…Id`, `…Ids`) follows.
 */
export const issueDraftIds = <T>(body: T): T => {
    const issued = new Map<string, string>();
    const collect = (node: unknown) => {
        if (Array.isArray(node)) node.forEach(collect);
        else if (node && typeof node === 'object') {
            const { id } = node as { id?: unknown };
            if (typeof id === 'string' && isDraftId(id) && !issued.has(id)) {
                const kind = /^[a-z]{1,16}/.exec(id.slice(DRAFT_ID_PREFIX.length))?.[0] ?? 'id';
                issued.set(id, `${kind}-${(issued.size + 1).toString(36)}${Date.now().toString(36)}`);
            }
            Object.values(node).forEach(collect);
        }
    };
    const namesId = (key: string) => key === 'id' || key.endsWith('Id') || key.endsWith('Ids');
    const replace = (node: unknown): unknown => {
        if (Array.isArray(node)) return node.map(replace);
        if (!node || typeof node !== 'object') return node;
        return Object.fromEntries(
            Object.entries(node).map(([key, value]) => {
                if (namesId(key) && typeof value === 'string') return [key, issued.get(value) ?? value];
                if (namesId(key) && Array.isArray(value))
                    return [
                        key,
                        value.map((entry) => (typeof entry === 'string' ? issued.get(entry) ?? entry : entry)),
                    ];
                return [key, replace(value)];
            }),
        );
    };
    collect(body);
    return issued.size === 0 ? body : (replace(body) as T);
};
