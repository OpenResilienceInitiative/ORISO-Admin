import { useTranslation } from 'react-i18next';
import DeleteOutline from '@mui/icons-material/DeleteOutlineOutlined';
import Add from '@mui/icons-material/Add';
import Close from '@mui/icons-material/Close';
import { FloatingLabelInput } from '../FloatingLabelInput';
import { M3Select } from '../M3Select';
import { ToggleRow } from '../ToggleRow';
import { M3Button } from '../M3Button';
import { IconButton } from '../IconButton';
import {
    QUESTION_TYPES,
    addQuestion,
    changeQuestionType,
    type ModuleSection,
    type Question,
    type QuestionType,
} from './conversationModule';
import styles from './styles.module.scss';

interface QuestionEditorProps {
    section: ModuleSection;
    language: string;
    onChange: (section: ModuleSection) => void;
}

let questionCounter = 0;
const nextQuestionId = () => {
    questionCounter += 1;
    return `question-${Date.now().toString(36)}-${questionCounter}`;
};

/**
 * The shared question model (ADR-035 decision 9): free text, single choice (radio buttons or
 * dropdown — one type, two looks), multiple choice, and a hint without an answer. Required is set
 * per question. The same editor serves registration, the greeting's question blocks and the survey.
 */
export const QuestionEditor = ({ section, language, onChange }: QuestionEditorProps) => {
    const { t } = useTranslation();
    const questions = section.questions ?? [];

    const replace = (index: number, question: Question) =>
        onChange({ ...section, questions: questions.map((current, i) => (i === index ? question : current)) });

    const remove = (index: number) => onChange({ ...section, questions: questions.filter((_, i) => i !== index) });

    const typeOptions = QUESTION_TYPES.map((type) => ({
        value: type,
        label: t(`conversationModules.question.type.${type}`),
    }));

    return (
        <div className={styles.dialogBody}>
            {questions.map((question, index) => {
                const isChoice = question.type === 'single' || question.type === 'multi';
                return (
                    <div
                        key={question.id}
                        className={styles.question}
                        data-testid={`question-${question.id}`}
                        role="group"
                        aria-label={question.label[language] || t('conversationModules.question.label')}
                    >
                        <div className={styles.questionHeader}>
                            <span className={styles.chip}>
                                {t(`conversationModules.question.type.${question.type}`)}
                            </span>
                            <IconButton
                                icon={<DeleteOutline />}
                                ariaLabel={t('conversationModules.question.remove')}
                                onClick={() => remove(index)}
                            />
                        </div>
                        <FloatingLabelInput
                            label={t(
                                question.type === 'hint'
                                    ? 'conversationModules.question.hintLabel'
                                    : 'conversationModules.question.label',
                            )}
                            value={question.label[language] ?? ''}
                            onChange={(event) =>
                                replace(index, {
                                    ...question,
                                    label: { ...question.label, [language]: event.target.value },
                                })
                            }
                        />
                        <div className={styles.fieldRow}>
                            <M3Select<QuestionType>
                                aria-label={t('conversationModules.question.type')}
                                value={question.type}
                                options={typeOptions}
                                onChange={(type: QuestionType) => replace(index, changeQuestionType(question, type))}
                                getPopupContainer={(node: HTMLElement) => node.parentElement ?? document.body}
                            />
                            {question.type === 'single' && (
                                <M3Select<'radio' | 'dropdown'>
                                    aria-label={t('conversationModules.question.display')}
                                    value={question.display ?? 'radio'}
                                    options={[
                                        { value: 'radio', label: t('conversationModules.question.display.radio') },
                                        {
                                            value: 'dropdown',
                                            label: t('conversationModules.question.display.dropdown'),
                                        },
                                    ]}
                                    onChange={(display: 'radio' | 'dropdown') =>
                                        replace(index, { ...question, display })
                                    }
                                    getPopupContainer={(node: HTMLElement) => node.parentElement ?? document.body}
                                />
                            )}
                        </div>
                        {question.type !== 'hint' && (
                            <ToggleRow
                                label={t('conversationModules.question.required')}
                                checked={question.required}
                                onCheckedChange={(required) => replace(index, { ...question, required })}
                            />
                        )}
                        {isChoice &&
                            question.options.map((option, optionIndex) => (
                                <div key={option.id} className={styles.option}>
                                    <FloatingLabelInput
                                        label={t('conversationModules.question.option', { number: optionIndex + 1 })}
                                        value={option.label[language] ?? ''}
                                        onChange={(event) =>
                                            replace(index, {
                                                ...question,
                                                options: question.options.map((current, i) =>
                                                    i === optionIndex
                                                        ? {
                                                              ...current,
                                                              label: {
                                                                  ...current.label,
                                                                  [language]: event.target.value,
                                                              },
                                                          }
                                                        : current,
                                                ),
                                            })
                                        }
                                    />
                                    <IconButton
                                        icon={<Close />}
                                        ariaLabel={t('conversationModules.question.removeOption')}
                                        disabled={question.options.length <= 2}
                                        onClick={() =>
                                            replace(index, {
                                                ...question,
                                                options: question.options.filter((_, i) => i !== optionIndex),
                                            })
                                        }
                                    />
                                </div>
                            ))}
                        {isChoice && (
                            <M3Button
                                variant="text"
                                icon={<Add />}
                                onClick={() =>
                                    replace(index, {
                                        ...question,
                                        options: [
                                            ...question.options,
                                            { id: `option-${question.options.length + 1}-${Date.now()}`, label: {} },
                                        ],
                                    })
                                }
                            >
                                {t('conversationModules.question.addOption')}
                            </M3Button>
                        )}
                    </div>
                );
            })}
            <M3Button
                variant="outlined"
                icon={<Add />}
                onClick={() => onChange(addQuestion(section, 'single', nextQuestionId()))}
            >
                {t('conversationModules.question.add')}
            </M3Button>
        </div>
    );
};
