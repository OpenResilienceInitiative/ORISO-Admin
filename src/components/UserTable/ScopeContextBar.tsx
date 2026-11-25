import { useTranslation } from 'react-i18next';
import { M3Button } from '../M3Button';
import { SCOPE_FALLBACKS, type ScopeKind } from './ScopeChip';
import styles from './scopeContextBar.module.scss';

export interface ScopeContextBarProps {
    kind: ScopeKind;
    id: number | string;
    name: string;
    address?: string;
    /** Already worded, e.g. "14 Beratende". */
    count?: string;
    onClear: () => void;
}

const CLEAR_FALLBACKS = { tenant: 'Alle Träger zeigen', agency: 'Alle Beratungsstellen zeigen' } as const;
const CAPTION_FALLBACKS = { tenant: 'Gefiltert auf Träger', agency: 'Gefiltert auf Beratungsstelle' } as const;

/** Shows which Träger or BST the table is filtered to, with one button to drop the filter. */
export const ScopeContextBar = ({ kind, id, name, address, count, onClear }: ScopeContextBarProps) => {
    const { t } = useTranslation();
    const caption = [
        t(`userTable.scopeBar.${kind}.caption`, CAPTION_FALLBACKS[kind]),
        `${t(`userTable.scope.${kind}.idLabel`, SCOPE_FALLBACKS[kind].idLabel)} ${id}`,
        address,
    ]
        .filter(Boolean)
        .join(' · ');

    return (
        <section className={styles.bar} aria-label={caption}>
            <div className={styles.text}>
                <span className={styles.caption}>{caption}</span>
                <span className={styles.name}>
                    {name}
                    {count && <span className={styles.count}> · {count}</span>}
                </span>
            </div>
            <M3Button variant="text" onClick={onClear}>
                {t(`userTable.scopeBar.${kind}.clear`, CLEAR_FALLBACKS[kind])}
            </M3Button>
        </section>
    );
};
