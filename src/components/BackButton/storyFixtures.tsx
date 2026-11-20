import type { CSSProperties, ReactNode } from 'react';
import { computeOrisoPalette } from '../../utils/theme/orisoScheme';

/**
 * Story-only helpers for the back button and the page header compositions.
 * The Admin has no real dark mode yet; its `inverted` scheme is the closest thing, so the
 * dark previews use exactly that token set, scoped to one wrapper (nothing leaks to <html>).
 */
export type StoryScheme = 'light' | 'inverted';

const invertedTokens = computeOrisoPalette({}, 'inverted').tokens;

export const SchemeScope = ({
    scheme = 'light',
    children,
    minHeight,
}: {
    scheme?: StoryScheme;
    children: ReactNode;
    minHeight?: CSSProperties['minHeight'];
}) => {
    const tokens: Record<string, string> =
        scheme === 'inverted'
            ? {
                  ...invertedTokens,
                  // The workspace is not part of the inverted token set yet; map it to the surface.
                  '--admin-workspace-background': invertedTokens['--m3-surface'],
              }
            : {};

    return (
        <div
            data-story-scheme={scheme}
            style={{
                ...(tokens as CSSProperties),
                minHeight,
                background: 'var(--admin-workspace-background, #fcf9f9)',
                color: 'var(--m3-on-surface, #1b1b1c)',
            }}
        >
            {children}
        </div>
    );
};

/** A captioned row for side-by-side comparisons. */
export const Row = ({ caption, children }: { caption: string; children: ReactNode }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
        <span className="m3-label-large" style={{ color: 'var(--m3-on-surface-variant, #444748)' }}>
            {caption}
        </span>
        <div style={{ display: 'flex', minWidth: 0 }}>{children}</div>
    </div>
);
