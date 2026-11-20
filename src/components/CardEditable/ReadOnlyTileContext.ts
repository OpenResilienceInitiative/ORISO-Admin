import { createContext } from 'react';

/** Distinguishes a view-only tile from a form temporarily disabled while saving. */
export const ReadOnlyTileContext = createContext(false);
