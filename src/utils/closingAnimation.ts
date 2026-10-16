/**
 * The three closing animations an administrator can pick for a waiting room (ORISO-Frontend#1737).
 * The names are the contract with TenantService (`theming.closingAnimationDesktop|Mobile`); they are
 * stored as-is, so never rename one here without changing the service.
 */
export const CLOSING_ANIMATIONS = ['CURTAIN', 'CIRCLE_ZOOM', 'SLIDE_REVEAL'] as const;

export type ClosingAnimation = (typeof CLOSING_ANIMATIONS)[number];

/** Played when neither the tenant nor the platform tenant has chosen one. */
export const DEFAULT_CLOSING_ANIMATION: ClosingAnimation = 'CURTAIN';

export const isClosingAnimation = (value: unknown): value is ClosingAnimation =>
    typeof value === 'string' && (CLOSING_ANIMATIONS as readonly string[]).includes(value);
