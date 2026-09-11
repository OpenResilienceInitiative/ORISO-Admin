import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { Card } from '../../Card';
import { FilterChip } from '../../FilterChip';
import { M3Button } from '../../M3Button';
import { ReactComponent as ShieldIcon } from '../../../resources/img/svg/verified.svg';
import styles from './styles.module.scss';

export interface FocusTopicsCardProps {
    /** All selectable topic areas. */
    topics: string[];
    /** Currently selected topics. */
    selected: string[];
    onToggle: (topic: string) => void;
    onBack?: () => void;
    onNext?: () => void;
    className?: string;
}

/**
 * Counsellor Setup Wizard — "Focus Topics" step (Figma Admin.ORISO 1-34786).
 * A full card assembled purely from shared primitives: <Card> skeleton (header
 * icon + Headline Small title + subtitle + footer slot) wrapping a <FilterChip>
 * multi-select group. No bespoke surface, title or chip markup.
 */
export const FocusTopicsCard = ({ topics, selected, onToggle, onBack, onNext, className }: FocusTopicsCardProps) => {
    const { t } = useTranslation();
    return (
        <Card
            className={classNames(styles.card, className)}
            headerIcon={<ShieldIcon />}
            titleKey="cards.focusTopics.title"
            subTitle={t('cards.focusTopics.subtitle')}
            footer={
                onBack || onNext ? (
                    <>
                        {onBack && (
                            <M3Button variant="text" onClick={onBack}>
                                {t('cards.actions.back')}
                            </M3Button>
                        )}
                        {onNext && (
                            <M3Button variant="text" onClick={onNext}>
                                {t('cards.actions.next')}
                            </M3Button>
                        )}
                    </>
                ) : undefined
            }
        >
            <div className={styles.chips}>
                {topics.map((topic) => (
                    <FilterChip
                        key={topic}
                        label={topic}
                        selected={selected.includes(topic)}
                        onChange={() => onToggle(topic)}
                    />
                ))}
            </div>
        </Card>
    );
};
