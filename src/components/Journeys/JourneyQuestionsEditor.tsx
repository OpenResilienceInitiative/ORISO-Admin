import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import Add from '@mui/icons-material/Add';
import ArrowDropDownCircle from '@mui/icons-material/ArrowDropDownCircleOutlined';
import CheckBoxOutlineBlank from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxOutlined from '@mui/icons-material/CheckBoxOutlined';
import Close from '@mui/icons-material/Close';
import DeleteOutline from '@mui/icons-material/DeleteOutlineOutlined';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import RadioButtonChecked from '@mui/icons-material/RadioButtonChecked';
import RadioButtonUnchecked from '@mui/icons-material/RadioButtonUnchecked';
import ShortText from '@mui/icons-material/ShortText';
import { M3Button } from '../M3Button';
import { IconButton } from '../IconButton';
import { ToggleRow } from '../ToggleRow';
import {
    changeQuestionType,
    type LangMap,
    type Question,
    type QuestionType,
} from '../ConversationModules/conversationModule';
import { nextId } from './ids';
import { TranslatableField, type TextChange } from './TranslatableField';
import styles from './styles.module.scss';

/** What the editor picks: the question type, and for single choice also its look. */
export const QUESTION_LOOKS = ['text', 'radio', 'dropdown', 'multi', 'hint'] as const;
export type QuestionLook = (typeof QUESTION_LOOKS)[number];

const LOOK_ICONS: Record<QuestionLook, ReactElement> = {
    text: <ShortText />,
    radio: <RadioButtonChecked />,
    dropdown: <ArrowDropDownCircle />,
    multi: <CheckBoxOutlined />,
    hint: <InfoOutlined />,
};

export const lookOf = (question: Question): QuestionLook => {
    if (question.type === 'single') return question.display === 'dropdown' ? 'dropdown' : 'radio';
    return question.type as QuestionLook;
};

const withLook = (question: Question, look: QuestionLook): Question => {
    const type: QuestionType = look === 'radio' || look === 'dropdown' ? 'single' : look;
    const changed = changeQuestionType(question, type);
    return type === 'single' ? { ...changed, display: look === 'dropdown' ? 'dropdown' : 'radio' } : changed;
};

/** The mark in front of an answer, as the person will see it. */
const answerMark = (look: QuestionLook, index: number) => {
    if (look === 'multi') return <CheckBoxOutlineBlank />;
    if (look === 'dropdown') return <span className={styles.answerNumber}>{index + 1}.</span>;
    return <RadioButtonUnchecked />;
};

const blankQuestion = (look: QuestionLook): Question =>
    withLook(
        {
            id: nextId('question'),
            type: 'single',
            display: 'radio',
            required: false,
            label: {},
            options: [],
            version: 1,
        },
        look,
    );

interface JourneyQuestionsEditorProps {
    questions: Question[];
    language: string;
    /** Languages of this step a machine wrote and nobody has checked yet. */
    machine: string[];
    translate?: (text: string, language: string) => string;
    onChange: (questions: Question[], how: TextChange) => void;
}

/**
 * The questions of one step. The type is picked by its look, and every answer shows the mark the
 * person will see (circle, box, number), so the editor sees the question as it will be asked.
 */
export const JourneyQuestionsEditor = ({
    questions,
    language,
    machine,
    translate,
    onChange,
}: JourneyQuestionsEditorProps) => {
    const { t } = useTranslation();
    const isMachine = machine.includes(language);

    const replace = (index: number, question: Question, how: TextChange = 'typed') =>
        onChange(
            questions.map((current, i) => (i === index ? question : current)),
            how,
        );

    return (
        <div className={styles.questions}>
            {questions.map((question, index) => {
                const look = lookOf(question);
                const isChoice = look === 'radio' || look === 'dropdown' || look === 'multi';
                const setText = (key: 'label' | 'help', next: LangMap, how: TextChange) =>
                    replace(index, { ...question, [key]: next }, how);
                return (
                    <section
                        key={question.id}
                        className={styles.block}
                        aria-labelledby={`${question.id}-heading`}
                        data-testid={`question-${question.id}`}
                    >
                        <div className={styles.blockHeader}>
                            <h3 className={styles.blockTitle} id={`${question.id}-heading`}>
                                {t(look === 'hint' ? 'journeys.question.hintNumber' : 'journeys.question.number', {
                                    number: index + 1,
                                })}
                            </h3>
                            <IconButton
                                icon={<DeleteOutline />}
                                ariaLabel={t('journeys.question.remove', { number: index + 1 })}
                                onClick={() =>
                                    onChange(
                                        questions.filter((_, i) => i !== index),
                                        'typed',
                                    )
                                }
                            />
                        </div>

                        <div
                            className={styles.looks}
                            role="radiogroup"
                            aria-label={t('journeys.question.look', { number: index + 1 })}
                        >
                            {QUESTION_LOOKS.map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    role="radio"
                                    aria-checked={look === option}
                                    className={classNames(styles.look, { [styles.lookOn]: look === option })}
                                    onClick={() => replace(index, withLook(question, option))}
                                >
                                    {LOOK_ICONS[option]}
                                    {t(`journeys.question.looks.${option}`)}
                                </button>
                            ))}
                        </div>

                        <TranslatableField
                            label={t(look === 'hint' ? 'journeys.question.hintLabel' : 'journeys.question.label')}
                            value={question.label}
                            language={language}
                            machine={isMachine}
                            translate={translate}
                            onChange={(next, how) => setText('label', next, how)}
                        />

                        {look === 'text' && (
                            <div className={styles.answerPreview} aria-hidden>
                                <ShortText />
                                {t('journeys.question.textPreview')}
                            </div>
                        )}

                        {isChoice && (
                            <ol className={styles.answers} aria-label={t('journeys.question.answers')}>
                                {question.options.map((option, optionIndex) => (
                                    <li key={option.id} className={styles.answer}>
                                        <span className={styles.answerMark} aria-hidden>
                                            {answerMark(look, optionIndex)}
                                        </span>
                                        <TranslatableField
                                            label={t('conversationModules.question.option', {
                                                number: optionIndex + 1,
                                            })}
                                            value={option.label}
                                            language={language}
                                            machine={isMachine}
                                            translate={translate}
                                            onChange={(next, how) =>
                                                replace(
                                                    index,
                                                    {
                                                        ...question,
                                                        options: question.options.map((entry, i) =>
                                                            i === optionIndex ? { ...entry, label: next } : entry,
                                                        ),
                                                    },
                                                    how,
                                                )
                                            }
                                        />
                                        <IconButton
                                            icon={<Close />}
                                            size={32}
                                            ariaLabel={t('journeys.question.removeAnswer', { number: optionIndex + 1 })}
                                            disabled={question.options.length <= 2}
                                            onClick={() =>
                                                replace(index, {
                                                    ...question,
                                                    options: question.options.filter((_, i) => i !== optionIndex),
                                                })
                                            }
                                        />
                                    </li>
                                ))}
                                {question.other && (
                                    <li className={classNames(styles.answer, styles.answerOther)}>
                                        <span className={styles.answerMark} aria-hidden>
                                            {answerMark(look, question.options.length)}
                                        </span>
                                        <span className={styles.answerOtherText}>
                                            {t('journeys.question.otherPreview')}
                                        </span>
                                    </li>
                                )}
                            </ol>
                        )}

                        {isChoice && (
                            <div className={styles.questionActions}>
                                <M3Button
                                    variant="text"
                                    icon={<Add />}
                                    onClick={() =>
                                        replace(index, {
                                            ...question,
                                            options: [...question.options, { id: nextId('option'), label: {} }],
                                        })
                                    }
                                >
                                    {t('conversationModules.question.addOption')}
                                </M3Button>
                            </div>
                        )}

                        {isChoice && (
                            <ToggleRow
                                label={t('conversationModules.question.other')}
                                description={t('conversationModules.question.otherHelp')}
                                checked={question.other ?? false}
                                onCheckedChange={(other) => replace(index, { ...question, other })}
                            />
                        )}
                        {look !== 'hint' && (
                            <ToggleRow
                                label={t('conversationModules.question.required')}
                                checked={question.required}
                                onCheckedChange={(required) => replace(index, { ...question, required })}
                            />
                        )}
                    </section>
                );
            })}

            <div className={styles.addQuestion}>
                <span className={styles.chipsLabel}>{t('journeys.question.add')}</span>
                <div className={styles.looks}>
                    {(['text', 'radio', 'multi', 'hint'] as const).map((option) => (
                        <button
                            key={option}
                            type="button"
                            className={styles.look}
                            onClick={() => onChange([...questions, blankQuestion(option)], 'typed')}
                        >
                            <Add className={styles.lookPlus} aria-hidden />
                            {LOOK_ICONS[option]}
                            {t(`journeys.question.looks.${option}`)}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
