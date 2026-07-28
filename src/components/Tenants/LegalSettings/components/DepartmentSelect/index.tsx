import Groups from '@mui/icons-material/Groups';
import { useTranslation } from 'react-i18next';
import { SplitDropdown } from '../../../../FormPluginEditor/SplitDropdown';

/** Sentinel for the agency-wide text every department inherits until it publishes its own. */
export const ALL_DEPARTMENTS = 'all';

export interface DepartmentOption {
    id: number;
    name: string;
    /** True once this department has published its own text and left the inherited one. */
    hasOwnText?: boolean;
}

interface DepartmentSelectProps {
    departments: DepartmentOption[];
    /** `ALL_DEPARTMENTS` or a topic id. */
    value: number | typeof ALL_DEPARTMENTS;
    onChange: (value: number | typeof ALL_DEPARTMENTS) => void;
}

/**
 * Fachbereich switcher for the agency legal-text editors, rendered in the editor's lower function
 * bar between language and version (Figma `Admin.ORISO` 1261:52149, `topicSlot`).
 *
 * "Alle Fachbereiche" edits the agency-wide text, which every department inherits (chain: Träger →
 * Agentur → Fachbereich). Selecting a single Fachbereich opens a draft copy of whatever that
 * department currently shows; publishing it breaks the inheritance and the department carries its
 * own text from then on (ADR-014 amendment 2026-07-28).
 *
 * Departments that already left the inherited text are marked, so an admin editing the agency-wide
 * text can see at a glance who will *not* receive the change.
 */
export const DepartmentSelect = ({ departments, value, onChange }: DepartmentSelectProps) => {
    const { t } = useTranslation();

    // With no departments there is only the agency-wide text — a one-entry switcher is noise.
    if (departments.length === 0) {
        return null;
    }

    const allLabel = t('agency.legal.department.all', 'Alle Fachbereiche');
    const selected = value === ALL_DEPARTMENTS ? undefined : departments.find(({ id }) => id === value);

    return (
        <SplitDropdown
            icon={<Groups />}
            label={selected?.name ?? allLabel}
            title={t('agency.legal.department.choose', 'Fachbereich wählen')}
            menu={{
                selectable: true,
                selectedKeys: [String(value)],
                items: [
                    { key: ALL_DEPARTMENTS, label: allLabel },
                    { type: 'divider' as const },
                    ...departments.map(({ id, name, hasOwnText }) => ({
                        key: String(id),
                        label: hasOwnText
                            ? t('agency.legal.department.ownText', '{{name}} (eigener Text)', { name })
                            : name,
                    })),
                ],
                onClick: ({ key }) => onChange(key === ALL_DEPARTMENTS ? ALL_DEPARTMENTS : Number(key)),
            }}
        />
    );
};

export default DepartmentSelect;
