import type { ReactNode } from 'react';
import classNames from 'classnames';
import styles from './styles.module.scss';

export interface SegmentedTab {
    key: string;
    label: ReactNode;
    disabled?: boolean;
}

export interface SegmentedTabsProps {
    tabs: SegmentedTab[];
    activeKey: string;
    onChange: (key: string) => void;
    ariaLabel?: string;
    className?: string;
    /** Gives each tab the id `<idPrefix>-tab-<key>` and points it at the panel `<idPrefix>-panel`. */
    idPrefix?: string;
}

/**
 * M3 underline tabs (Figma Admin.ORISO 900-7044 — Case takeover topic tabs):
 * text tabs on a bottom hairline; the active tab is primary-coloured with a
 * primary underline. Distinct from AdminSegmentedTabs (filled pills) — this is
 * the underline treatment the wizard/settings cards use. Scrolls horizontally.
 */
export const SegmentedTabs = ({ tabs, activeKey, onChange, ariaLabel, className, idPrefix }: SegmentedTabsProps) => (
    <div className={classNames(styles.tabs, className)} role="tablist" aria-label={ariaLabel}>
        {tabs.map((tab) => {
            const active = tab.key === activeKey;
            return (
                <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    id={idPrefix ? `${idPrefix}-tab-${tab.key}` : undefined}
                    aria-controls={idPrefix && active ? `${idPrefix}-panel` : undefined}
                    aria-selected={active}
                    disabled={tab.disabled}
                    className={classNames(styles.tab, { [styles.tabActive]: active })}
                    onClick={() => onChange(tab.key)}
                >
                    {tab.label}
                </button>
            );
        })}
    </div>
);
