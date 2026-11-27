import type { TileHelpTopic } from '.';

/**
 * Every module that defines help topics. Matched by name, so a new `help.tsx` is picked up
 * without anybody having to list it.
 */
const topicModules = import.meta.glob<Record<string, unknown>>(
    ['/src/**/help.tsx', '/src/**/tileHelpTopics.ts', '/src/components/TileHelp/passwordChatsHelp.ts'],
    { eager: true },
);

const isTopic = (value: unknown): value is TileHelpTopic => {
    if (typeof value !== 'object' || value === null) return false;
    const { id, titleKey, essenceKey, slides } = value as Partial<TileHelpTopic>;
    return (
        typeof id === 'string' &&
        typeof titleKey === 'string' &&
        typeof essenceKey === 'string' &&
        Array.isArray(slides)
    );
};

/**
 * All help topics of the admin, each once, including the ones that only appear as a "see also"
 * of another topic. Used by the picture test and by the stories that walk every explanation.
 */
export const collectTileHelpTopics = (): TileHelpTopic[] => {
    const found = new Map<string, TileHelpTopic>();
    const add = (topic: TileHelpTopic) => {
        if (found.has(topic.id)) return;
        found.set(topic.id, topic);
        topic.related?.forEach(add);
    };
    Object.values(topicModules).forEach((moduleExports) => {
        Object.values(moduleExports).forEach((exported) => {
            if (isTopic(exported)) add(exported);
            // A record of topics (the chat types), not a topic itself.
            else if (typeof exported === 'object' && exported !== null)
                Object.values(exported).filter(isTopic).forEach(add);
        });
    });
    return [...found.values()];
};
