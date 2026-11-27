import { useTranslation } from 'react-i18next';
import { TileHelpButton, type TileHelpTopic } from '../../../../TileHelp';
import styles from './styles.module.scss';

/**
 * ORISO-Admin#1558: the explanation button of one section (`TileSections.Section` `titleAction`).
 * The tile button is placed for a tile corner; here it sits in the heading row.
 */
export const SectionHelp = ({ topic }: { topic: TileHelpTopic }) => {
    const { t } = useTranslation();
    return (
        <span className={styles.help}>
            <TileHelpButton topic={topic} tileTitle={t(topic.titleKey)} />
        </span>
    );
};
