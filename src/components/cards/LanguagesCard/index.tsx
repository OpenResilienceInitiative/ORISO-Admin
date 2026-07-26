import classNames from 'classnames';
import { Card } from '../../Card';
import { PillGroup, type PillOption } from '../../PillGroup';
import { Typography } from '../../Typography';
import { M3Button } from '../../M3Button';
import { ReactComponent as GlobeIcon } from '../../../resources/img/svg/navbar/languages_inactive.svg';
import { ReactComponent as PencilIcon } from '../../../resources/img/svg/pencil.svg';
import styles from './styles.module.scss';

export interface LanguagesCardProps {
    languages: PillOption[];
    selected: string[];
    onChange: (next: string[]) => void;
    onEdit?: () => void;
    className?: string;
}

/**
 * "Languages" settings card (Figma Admin.ORISO 1-34207). Card skeleton +
 * Typography note + PillGroup (default language locked). No bespoke markup.
 */
export const LanguagesCard = ({ languages, selected, onChange, onEdit, className }: LanguagesCardProps) => (
    <Card
        className={classNames(styles.card, className)}
        headerIcon={<GlobeIcon />}
        titleKey="Languages"
        subTitle="Multilingual support lets counselors and seekers navigate the app in their preferred language. Set additional available languages."
        footer={
            <M3Button variant="text" icon={<PencilIcon />} onClick={onEdit}>
                Edit
            </M3Button>
        }
    >
        <div className={styles.body}>
            <Typography variant="body-medium" color="var(--m3-on-surface-variant, #444748)">
                <strong>Note:</strong> German is preselected as the default and cannot be removed.
            </Typography>
            <PillGroup options={languages} value={selected} onChange={onChange} />
        </div>
    </Card>
);
