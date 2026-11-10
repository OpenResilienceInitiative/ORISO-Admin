import { createContext } from 'react';

/**
 * Who can change the read-only tiles below, for a page that knows it for all of them at once (the
 * appearance page: the platform admins' editing-rights switch). A tile's own `readOnlyHint` wins.
 */
export const ReadOnlyHintContext = createContext<string | undefined>(undefined);
