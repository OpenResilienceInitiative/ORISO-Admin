import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { ChatTypeCardKey } from '../types';
import styles from './styles.module.scss';

export type PermissionsIntroProps = {
    /** The conversation types shown on this page, with the name they carry here. */
    cards: Array<{ key: ChatTypeCardKey; name: string }>;
    /** What this page applies to, when that is not obvious (e.g. one Träger edited by a platform admin). */
    scopeNote?: ReactNode;
};

/**
 * ORISO-Admin#1558: the page's own explanation, on the page background (it is not a tile). Says what
 * Funktionszugriff is for and what each conversation type is meant for, so an admin knows which
 * tile to open.
 */
export const PermissionsIntro = ({ cards, scopeNote }: PermissionsIntroProps) => {
    const { t } = useTranslation();
    return (
        <div className={styles.intro} data-testid="permissions-intro">
            <p className={styles.lead}>{t('tenants.permissions.intro.lead')}</p>
            {scopeNote && <p className={styles.scope}>{scopeNote}</p>}
            <dl className={styles.types}>
                {cards.map(({ key, name }) => (
                    <div key={key} className={styles.type}>
                        <dt className={styles.typeName}>{name}</dt>
                        <dd className={styles.typePurpose}>{t(`tenants.permissions.intro.purpose.${key}`)}</dd>
                    </div>
                ))}
            </dl>
            <p className={styles.hint}>{t('tenants.permissions.intro.hint')}</p>
        </div>
    );
};
