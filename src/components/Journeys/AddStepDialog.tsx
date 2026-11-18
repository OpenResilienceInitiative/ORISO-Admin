import { useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import Add from '@mui/icons-material/Add';
import MemoryOutlined from '@mui/icons-material/MemoryOutlined';
import ExtensionOutlined from '@mui/icons-material/ExtensionOutlined';
import QuizOutlined from '@mui/icons-material/QuizOutlined';
import StarBorderOutlined from '@mui/icons-material/StarBorderOutlined';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import ChatBubbleOutlineOutlined from '@mui/icons-material/ChatBubbleOutlineOutlined';
import { Modal } from '../Modal';
import { M3Button } from '../M3Button';
import {
    addonChoices,
    coreChoices,
    stepKindsFor,
    type ElementChoice,
    type Journey,
    type JourneyPhase,
    type NewStep,
    type StepKind,
} from './journey';
import styles from './styles.module.scss';

export const KIND_ICONS: Record<StepKind, ReactElement> = {
    core: <MemoryOutlined />,
    addon: <ExtensionOutlined />,
    question: <QuizOutlined />,
    rating: <StarBorderOutlined />,
    panel: <InfoOutlined />,
    message: <ChatBubbleOutlineOutlined />,
};

interface AddStepDialogProps {
    journey: Journey;
    phase: JourneyPhase;
    onAdd: (step: NewStep) => void;
    onClose: () => void;
}

/**
 * "Add step": the kinds on the left. Core elements and add-ons open their list on the right,
 * where the ones this journey already uses are marked and cannot be added a second time.
 */
export const AddStepDialog = ({ journey, phase, onAdd, onClose }: AddStepDialogProps) => {
    const { t } = useTranslation();
    const [library, setLibrary] = useState<'core' | 'addon' | null>(null);

    const pickKind = (kind: StepKind) => {
        if (kind === 'core' || kind === 'addon') {
            setLibrary(kind);
            return;
        }
        onAdd({ kind });
    };

    const elements: ElementChoice<string>[] =
        library === 'addon' ? addonChoices(journey, phase) : coreChoices(journey, phase);

    return (
        <Modal
            icon={<Add />}
            titleKey="journeys.add.title"
            descriptionKey="journeys.add.description"
            width={720}
            zIndex={1200}
            footer={
                <div className={styles.footer}>
                    <M3Button variant="text" onClick={onClose}>
                        {t('journeys.action.cancel')}
                    </M3Button>
                </div>
            }
            onClose={onClose}
            wrapperTestId="journey-add-step"
        >
            <div className={styles.picker}>
                <ul className={styles.pickerColumn} aria-label={t('journeys.add.kinds')}>
                    {stepKindsFor(phase).map((kind) => (
                        <li key={kind}>
                            <button
                                type="button"
                                className={classNames(styles.pick, { [styles.pickSelected]: library === kind })}
                                aria-expanded={kind === 'core' || kind === 'addon' ? library === kind : undefined}
                                onClick={() => pickKind(kind)}
                                data-testid={`journey-add-${kind}`}
                            >
                                <span className={styles.pickIcon} aria-hidden>
                                    {KIND_ICONS[kind]}
                                </span>
                                <span className={styles.pickText}>
                                    <strong>{t(`journeys.kind.${kind}`)}</strong>
                                    <span>{t(`journeys.kindHelp.${kind}`)}</span>
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
                {library && (
                    <div className={styles.section} data-testid={`journey-add-${library}-list`}>
                        <h3 className={styles.pickerHeading}>{t(`journeys.add.${library}Heading`)}</h3>
                        {elements.length === 0 ? (
                            <p className={styles.help}>{t(`journeys.add.${library}Empty`)}</p>
                        ) : (
                            <ul className={styles.pickerColumn}>
                                {elements.map((choice) => (
                                    <li key={choice.id}>
                                        <button
                                            type="button"
                                            className={styles.pick}
                                            disabled={choice.used}
                                            onClick={() =>
                                                onAdd(
                                                    library === 'core'
                                                        ? ({ kind: 'core', core: choice.id } as NewStep)
                                                        : ({ kind: 'addon', addon: choice.id } as NewStep),
                                                )
                                            }
                                            data-testid={`journey-add-${library}-${choice.id}`}
                                        >
                                            <span className={styles.pickText}>
                                                <strong>{t(`journeys.${library}.${choice.id}`)}</strong>
                                                <span>{t(`journeys.${library}Help.${choice.id}`)}</span>
                                            </span>
                                            {choice.used && choice.usedIn && (
                                                <span className={classNames(styles.chip, styles.chipUsed)}>
                                                    {t('journeys.add.used', {
                                                        phase: t(`journeys.phase.${choice.usedIn}`),
                                                    })}
                                                </span>
                                            )}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
};
