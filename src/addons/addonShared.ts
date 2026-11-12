import * as React from 'react';
import * as ReactDOMClient from 'react-dom/client';
import * as jsxRuntime from 'react/jsx-runtime';
import { ADDON_CONTRACT } from './addonTypes';

export const ADDON_SHARED_GLOBAL = '__ORISO_ADDON_SHARED__';

/**
 * Add-ons use the host's React instead of bundling their own (ADR-032). Their build maps
 * `react`, `react-dom/client` and `react/jsx-runtime` onto this global.
 */
export const installAddonShared = (target: Record<string, unknown> = globalThis as never) => {
    if (target[ADDON_SHARED_GLOBAL]) {
        return;
    }
    Object.defineProperty(target, ADDON_SHARED_GLOBAL, {
        value: Object.freeze({
            contract: ADDON_CONTRACT,
            react: React,
            reactDomClient: ReactDOMClient,
            jsxRuntime,
        }),
        configurable: true,
        enumerable: false,
        writable: false,
    });
};
