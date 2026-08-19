import Groups from '@mui/icons-material/Groups';
import { useTranslation } from 'react-i18next';
import { SplitDropdown } from '../../../../FormPluginEditor/SplitDropdown';
import styles from './styles.module.scss';

/** Sentinel for the agency-wide text every department inherits until it publishes its own. */
export const ALL_DEPARTMENTS = 'all';

export interface DepartmentOption {
    id: number;
    name: string;
    /**
     * This Fachbereich has published a text of its own and no longer inherits the agency-wide
     * one. `undefined` means the backend did not report it (older deployment) — the entry is
     * then rendered without any claim either way, which is honest; a missing marker must not
     * read as "still inherits".
     */
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
 * The menu opens on a header naming the choice (#812) — antd's own labelled group, the same
 * pattern `DpiaSectionSelect` and `TemplateSplitButton` use on this control, so the header
 * titles the options for a screen reader instead of sitting among them as an inert entry.
 *
 * Departments that already left the inherited text are marked (#583): an admin editing the
 * agency-wide text has to see who will *not* receive the change — the one thing that matters when
 * a Beratungsstelle publishes a correction. The state comes from `departments[]` on the admin
 * agency read (ORISO-AgencyService#259) and therefore covers every Fachbereich, including ones
 * the admin never opened. Where the backend does not report it, entries carry no marker rather
 * than a wrong one.
 */
export const DepartmentSelect = ({ departments, value, onChange }: DepartmentSelectProps) => {
    const { t } = useTranslation();

    // With no departments there is only the agency-wide text — a one-entry switcher is noise.
    if (departments.length === 0) {
        return null;
    }

    const allLabel = t('agency.legal.department.all', 'Alle Fachbereiche');
    const ownTextLabel = t('agency.legal.department.ownText', 'eigener Text');
    const selected = value === ALL_DEPARTMENTS ? undefined : departments.find(({ id }) => id === value);
    // How many will NOT receive a change to the agency-wide text. Shown on the
    // "Alle Fachbereiche" entry, where that number is the actual decision input.
    const withOwnText = departments.filter(({ hasOwnText }) => hasOwnText).length;

    return (
        <SplitDropdown
            icon={<Groups />}
            label={selected?.name ?? allLabel}
            title={t('agency.legal.department.choose', 'Fachbereich wählen')}
            menu={{
                selectable: true,
                selectedKeys: [String(value)],
                items: [
                    {
                        key: 'department-choice',
                        type: 'group' as const,
                        label: t('agency.legal.department.menuHeader', 'Fachbereich auswählen'),
                        children: [
                            {
                                key: ALL_DEPARTMENTS,
                                label: (
                                    <span className={styles.entry}>
                                        <span>{allLabel}</span>
                                        {withOwnText > 0 && (
                                            <span
                                                className={styles.excludedHint}
                                                data-testid="departments-with-own-text"
                                            >
                                                {t('agency.legal.department.notInheriting', {
                                                    count: withOwnText,
                                                    defaultValue: '{{count}} mit eigenem Text',
                                                })}
                                            </span>
                                        )}
                                    </span>
                                ),
                            },
                            { type: 'divider' as const },
                            ...departments.map(({ id, name, hasOwnText }) => ({
                                key: String(id),
                                label: (
                                    <span className={styles.entry}>
                                        <span>{name}</span>
                                        {hasOwnText && (
                                            <span className={styles.ownTextTag} data-testid={`own-text-${id}`}>
                                                {ownTextLabel}
                                            </span>
                                        )}
                                    </span>
                                ),
                            })),
                        ],
                    },
                ],
                onClick: ({ key }) => onChange(key === ALL_DEPARTMENTS ? ALL_DEPARTMENTS : Number(key)),
            }}
        />
    );
};

export default DepartmentSelect;
