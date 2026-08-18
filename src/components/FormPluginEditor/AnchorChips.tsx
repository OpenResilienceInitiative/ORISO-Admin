import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowBack, ArrowForward, AutoStories, Close } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import type { HeadingAnchor } from './headingAnchors';
// Base styles for the chip row + nav buttons (global .RichEditor-anchorNav* rules).
import './FormPluginEditor.styles.scss';

export type AnchorChipsProps = {
    anchors: HeadingAnchor[];
    /** The anchor that was last clicked or scrolled to — shown as the selected chip. */
    activeId?: string | null;
    /** Edit mode: chips get an "x" that removes the anchor (regardless of auto-chapters). */
    editable?: boolean;
    onSelect: (anchorId: string) => void;
    onRemove?: (anchorId: string) => void;
    ariaLabel?: string;
    /** Extra class for host-specific styling (e.g. the M3 editor's module class). */
    className?: string;
};

// How far one arrow click scrolls the chip row (roughly one chip).
const SCROLL_STEP = 240;

/** Longest chapter label a chip shows before it is cut (owner call 2026-07-30). */
export const ANCHOR_CHIP_LABEL_MAX = 33;

/**
 * Cuts on a word boundary where there is one in the last third, so a chapter
 * reads as "§ 4 Technische und organisatorische …" rather than breaking mid-word.
 * The ellipsis is part of the budget — a chip never exceeds 33 characters.
 */
export const truncateAnchorChipLabel = (text: string): string => {
    if (text.length <= ANCHOR_CHIP_LABEL_MAX) {
        return text;
    }
    const hard = text.slice(0, ANCHOR_CHIP_LABEL_MAX - 1).trimEnd();
    const lastSpace = hard.lastIndexOf(' ');
    const cut = lastSpace > ANCHOR_CHIP_LABEL_MAX - 12 ? hard.slice(0, lastSpace) : hard;
    return `${cut}…`;
};

// "Chapter Navbar" (Figma 1299-81676): M3 input chips in one scrollable row.
// The selected chip is filled (secondary-container) with a leading book icon;
// nav arrows appear per side only while that side can still scroll.
const AnchorChips = ({
    anchors,
    activeId = null,
    editable = false,
    onSelect,
    onRemove,
    ariaLabel,
    className,
}: AnchorChipsProps) => {
    const { t } = useTranslation();
    const rowRef = useRef<HTMLDivElement>(null);
    const [nav, setNav] = useState({ overflow: false, atStart: true, atEnd: true });
    // Renamed headings change the row width without changing the anchor count, so
    // the overflow calc must re-run on any id/label change, not only on length.
    const anchorsKey = anchors.map((anchor) => `${anchor.id}:${anchor.text}`).join('|');

    const updateNav = useCallback(() => {
        const row = rowRef.current;
        if (!row) return;
        const overflow = row.scrollWidth > row.clientWidth + 1;
        setNav({
            overflow,
            atStart: row.scrollLeft <= 1,
            atEnd: row.scrollLeft + row.clientWidth >= row.scrollWidth - 1,
        });
    }, []);

    useEffect(() => {
        const row = rowRef.current;
        if (!row) return undefined;
        updateNav();
        row.addEventListener('scroll', updateNav, { passive: true });
        // ResizeObserver is missing in some test environments — then the nav
        // simply doesn't track live resizes instead of crashing.
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateNav);
        observer?.observe(row);
        return () => {
            row.removeEventListener('scroll', updateNav);
            observer?.disconnect();
        };
    }, [anchorsKey, updateNav]);

    if (!anchors.length) return null;

    const scrollByStep = (direction: -1 | 1) =>
        rowRef.current?.scrollBy({ left: direction * SCROLL_STEP, behavior: 'smooth' });

    return (
        <div
            className={className ? `RichEditor-anchorNav ${className}` : 'RichEditor-anchorNav'}
            role="navigation"
            aria-label={ariaLabel}
        >
            {nav.overflow && !nav.atStart && (
                <button
                    type="button"
                    className="RichEditor-anchorNavBtn"
                    aria-label={t('editor.anchor.previous', 'Previous anchors')}
                    onClick={() => scrollByStep(-1)}
                >
                    <ArrowBack />
                </button>
            )}
            {/* Scroll-state classes drive an edge fade (owner request 2026-08-18,
                before-state H4/I3): without it the row hard-clips mid-chip and a
                chip cut down to a single letter reads as a rendering bug, not as
                "there is more". The fade only sits on a side that can actually
                scroll further — like the arrows. */}
            <div
                className={`RichEditor-anchorNavRow${nav.overflow && !nav.atStart ? ' RichEditor-anchorNavRow--fadeStart' : ''}${
                    nav.overflow && !nav.atEnd ? ' RichEditor-anchorNavRow--fadeEnd' : ''
                }`}
                ref={rowRef}
            >
                {anchors.map((anchor) => {
                    const active = anchor.id === activeId;
                    return (
                        <span
                            key={anchor.id}
                            data-anchor-chip={anchor.id}
                            className={`RichEditor-anchorChip${active ? ' RichEditor-anchorChip--active' : ''}`}
                        >
                            <button
                                type="button"
                                className="RichEditor-anchorChipLabel"
                                onClick={() => onSelect(anchor.id)}
                                aria-pressed={active}
                            >
                                {active && <AutoStories className="RichEditor-anchorChipIcon" />}
                                {/* A chapter chip is a signpost, not the heading
                                    itself: past 33 characters (owner call) it
                                    stops being scannable and starts pushing the
                                    other chapters out of the row. The full
                                    heading stays available on hover. */}
                                <span title={anchor.text.length > ANCHOR_CHIP_LABEL_MAX ? anchor.text : undefined}>
                                    {truncateAnchorChipLabel(anchor.text)}
                                </span>
                            </button>
                            {editable && onRemove && (
                                <button
                                    type="button"
                                    className="RichEditor-anchorChipRemove"
                                    aria-label={t('editor.anchor.remove', {
                                        text: anchor.text,
                                        defaultValue: '{{text}} remove',
                                    })}
                                    onClick={() => onRemove(anchor.id)}
                                >
                                    <Close />
                                </button>
                            )}
                        </span>
                    );
                })}
            </div>
            {nav.overflow && !nav.atEnd && (
                <button
                    type="button"
                    className="RichEditor-anchorNavBtn"
                    aria-label={t('editor.anchor.next', 'Next anchors')}
                    onClick={() => scrollByStep(1)}
                >
                    <ArrowForward />
                </button>
            )}
        </div>
    );
};

export default AnchorChips;
