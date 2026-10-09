import type { ReactNode } from 'react';
import type { CompliancePreset } from './dpiaContent';
import type { DpiaMasterData } from '../../types/dpiaMasterData';
import styles from './styles.module.scss';

export interface DpiaChapterProps {
    preset: CompliancePreset;
    onPresetChange: (preset: CompliancePreset) => void;
    showInternalNotes: boolean;
    masterData?: DpiaMasterData | null;
}

export const DpiaNorm = ({ preset, kdg, dsgvo }: { preset: CompliancePreset; kdg: string; dsgvo: string }) => (
    <span className={styles.norm}>{preset === 'kdg' ? kdg : dsgvo}</span>
);

export const dpiaValue = (value?: string | null) => value?.trim() || 'Nicht hinterlegt';

export const DpiaMasterDataValue = ({
    masterData,
    field,
}: {
    masterData?: DpiaMasterData | null;
    field:
        | 'operator.legalName'
        | 'operator.address'
        | 'operator.dpoName'
        | 'contact'
        | 'authority'
        | 'document.nextReviewDate';
}) => {
    const contact = [masterData?.operator?.contactEmail, masterData?.operator?.contactPhone];
    const authority = [
        masterData?.supervisoryAuthority?.name,
        masterData?.supervisoryAuthority?.address,
        masterData?.supervisoryAuthority?.email,
    ];
    if (field === 'contact' || field === 'authority')
        return (
            (field === 'contact' ? contact : authority)
                .map((value) => value?.trim())
                .filter(Boolean)
                .join(' · ') || 'Nicht hinterlegt'
        );
    const values = {
        'operator.legalName': masterData?.operator?.legalName,
        'operator.address': masterData?.operator?.address,
        'operator.dpoName': masterData?.operator?.dpoName,
        'document.nextReviewDate': masterData?.document?.nextReviewDate,
    };
    return dpiaValue(values[field]);
};

/** A keyboard user must be able to scroll wide legal tables independently of the page. */
export const DpiaTableScroll = ({ label, children }: { label: string; children: ReactNode }) => (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
    <div className={styles.tableScroll} role="region" aria-label={label} tabIndex={0}>
        {children}
    </div>
);
