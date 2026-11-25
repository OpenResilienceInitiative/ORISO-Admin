import { createContext, useContext, type ReactNode } from 'react';

/**
 * The words of „Begrüßung der Beratungsstelle" for the level being edited (ADR-036 decision 42,
 * ORISO-Admin#1660, gap 1). The journey editor does not know the greeting stores; the page that
 * mounts it provides the editor of its level — the same one the old greeting pages show — so the
 * greeting step edits exactly those texts and nothing has to be migrated.
 */
export const GreetingTextsContext = createContext<ReactNode>(undefined);

export const useGreetingTexts = () => useContext(GreetingTextsContext);
