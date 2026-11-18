import type { DragEvent, KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import DragIndicator from '@mui/icons-material/DragIndicator';
import LockOutlined from '@mui/icons-material/LockOutlined';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import Add from '@mui/icons-material/Add';
import ArrowUpward from '@mui/icons-material/ArrowUpward';
import ArrowDownward from '@mui/icons-material/ArrowDownward';
import DeleteOutline from '@mui/icons-material/DeleteOutlineOutlined';
import { RowMenu } from '../UserTable/RowMenu';
import { canMoveStep, canRemoveStep, isMustStep, type JourneyPhase, type JourneyStep } from './journey';
import { stepSummary, stepTitle } from './stepText';
import { TranslationPill } from './TranslationPill';
import styles from './styles.module.scss';

export interface StepCardProps {
    step: JourneyStep;
    /** Check-in steps are screens; on board and at arrival each step is one chat message. */
    phase: JourneyPhase;
    /** Funktionszugriff switched this building block off: it stays here and is skipped. */
    skipped?: boolean;
    /** 1-based position in the phase. */
    position: number;
    total: number;
    language: string;
    dragging: boolean;
    /** Where the dragged step would land relative to this one. */
    dropLine?: 'before' | 'after';
    onOpen: () => void;
    onAddBelow: () => void;
    onMove: (direction: -1 | 1) => void;
    onRemove: () => void;
    onTranslate?: () => void;
    onMarkChecked?: (language: string) => void;
    onDragStart: (event: DragEvent<HTMLLIElement>) => void;
    onDragOver: (event: DragEvent<HTMLLIElement>) => void;
    onDragEnd: () => void;
    onDrop: (event: DragEvent<HTMLLIElement>) => void;
}

/**
 * One step of a phase. The handle on the left drags it (arrow keys move it, too); a must step
 * shows a lock there instead. The card opens the step; the menu holds everything else.
 */
export const StepCard = ({
    step,
    phase,
    skipped = false,
    position,
    total,
    language,
    dragging,
    dropLine,
    onOpen,
    onAddBelow,
    onMove,
    onRemove,
    onTranslate,
    onMarkChecked,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDrop,
}: StepCardProps) => {
    const { t } = useTranslation();
    const title = stepTitle(step, language, t);
    const summary = stepSummary(step, language, t);
    const must = isMustStep(step);
    const movable = canMoveStep(step);
    const removable = canRemoveStep(step);

    const onHandleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
        event.preventDefault();
        onMove(event.key === 'ArrowUp' ? -1 : 1);
    };

    const badge = must ? (
        <span className={classNames(styles.chip, styles.chipMust)}>
            <LockOutlined aria-hidden />
            {t('journeys.kind.must')}
        </span>
    ) : (
        <span className={classNames(styles.chip, { [styles.chipCore]: step.kind === 'core' })}>
            {t(`journeys.kind.${step.kind}`)}
        </span>
    );

    return (
        <li
            className={styles.stepItem}
            draggable={movable}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            onDrop={onDrop}
            data-testid={`journey-step-${step.core ?? step.addon ?? step.id}`}
        >
            {dropLine && (
                <span
                    className={classNames(styles.dropLine, { [styles.dropLineAfter]: dropLine === 'after' })}
                    aria-hidden
                />
            )}
            <span className={styles.stepLabel}>
                {t('journeys.step.number', { number: position })}
                {' · '}
                {t(phase === 'departure' ? 'journeys.step.screen' : 'journeys.step.message')}
            </span>
            {movable ? (
                <button
                    type="button"
                    className={styles.handle}
                    aria-label={t('journeys.step.handle', { name: title })}
                    aria-roledescription={t('journeys.step.handleRole')}
                    title={t('journeys.step.handleHint')}
                    onKeyDown={onHandleKeyDown}
                >
                    <DragIndicator aria-hidden />
                </button>
            ) : (
                <span
                    className={styles.lock}
                    role="img"
                    aria-label={t('journeys.step.locked')}
                    title={t('journeys.step.locked')}
                >
                    <LockOutlined aria-hidden />
                </span>
            )}
            <div className={classNames(styles.step, { [styles.stepMust]: must, [styles.stepDragging]: dragging })}>
                <div className={styles.stepTop}>
                    <TranslationPill step={step} onTranslate={onTranslate} onMarkChecked={onMarkChecked} />
                    <span className={styles.chips}>
                        {skipped && (
                            <span className={classNames(styles.chip, styles.chipUsed)}>
                                {t('journeys.permission.skipped')}
                            </span>
                        )}
                        {badge}
                    </span>
                </div>
                <div className={styles.stepMain}>
                    <button type="button" className={styles.stepOpen} onClick={onOpen}>
                        <span className={styles.stepTitle}>{title}</span>
                        {summary && <span className={styles.stepDescription}>{summary}</span>}
                    </button>
                    <RowMenu
                        ariaLabel={t('journeys.step.menu', { name: title })}
                        items={[
                            {
                                key: 'settings',
                                label: t('journeys.step.settings'),
                                icon: <SettingsOutlined />,
                                onSelect: onOpen,
                            },
                            {
                                key: 'add',
                                label: t('journeys.step.addBelow'),
                                icon: <Add />,
                                onSelect: onAddBelow,
                            },
                            {
                                key: 'up',
                                label: t('journeys.step.moveUp'),
                                icon: <ArrowUpward />,
                                disabled: !movable || position === 1,
                                onSelect: () => onMove(-1),
                            },
                            {
                                key: 'down',
                                label: t('journeys.step.moveDown'),
                                icon: <ArrowDownward />,
                                disabled: !movable || position === total,
                                onSelect: () => onMove(1),
                            },
                            {
                                key: 'remove',
                                label: t(removable ? 'journeys.step.remove' : 'journeys.step.removeLocked'),
                                icon: <DeleteOutline />,
                                tone: 'error',
                                disabled: !removable,
                                onSelect: onRemove,
                            },
                        ]}
                    />
                </div>
            </div>
        </li>
    );
};
