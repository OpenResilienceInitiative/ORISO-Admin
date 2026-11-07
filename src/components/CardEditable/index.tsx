import { Form, FormInstance } from 'antd';
import classNames from 'classnames';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ReadOnlyTileContext } from './ReadOnlyTileContext';
import { Button, ButtonItem, BUTTON_TYPES } from '../button/Button';
import { UnsavedChangesModal } from './components/UnsavedChanges';
import styles from './styles.module.scss';
import type { TileHelpTopic } from '../TileHelp';
import { Card, CardVariant } from '../Card';
import { TileNote } from '../TileFill';
import { EditButton } from '../EditButton';
import { M3Tooltip } from '../M3Tooltip';

interface CardEditableProps {
    className?: string;
    isLoading?: boolean;
    fullHeight?: boolean;
    variant?: CardVariant;
    headerIcon?: React.ReactElement<any> | number | string;
    initialValues?: Record<string, unknown>;
    titleKey: string;
    subTitle?: React.ReactElement<any> | number | string;
    subTitleKey?: string;
    saveKey?: string;
    cancelKey?: string;
    children:
        | React.ReactElement<any>
        | React.ReactElement<any>[]
        | ((data: {
              form: FormInstance<any>;
              editing: boolean;
              startEditing: () => void;
          }) => React.ReactElement<any> | React.ReactElement<any>[]);
    onSave?: <T>(formData: T, options?: { onError?: () => void; form?: FormInstance }) => void;
    formProp?: FormInstance;
    editMode?: boolean;
    hideSaveButton?: boolean;
    hideCancelButton?: boolean;
    onEdit?: () => void;
    tooltip?: string;
    help?: TileHelpTopic;
    /** The picture for the free space of a tile; without it the first slide of `help` is used. */
    picture?: React.ReactNode;
    /** Dialog variant: as tall as the content, for a wide tile that would otherwise show empty space. */
    autoHeight?: boolean;
    /** A short note with an icon, pinned to the bottom of the tile. */
    note?: { icon: React.ReactNode; text: React.ReactNode };
    allowUnsavedChanges?: boolean;
    editButton?: React.ReactElement<any> | number | string;
    editButtonPlacement?: 'header' | 'footer';
    editLabelKey?: string;
    /** When false, the card is view-only (no edit pencil). */
    allowEdit?: boolean;
    /**
     * The viewer only has read access to this tile. Instead of hiding the edit action, it shows
     * locked (lock icon, not-allowed cursor) with a tooltip naming who can change it. Use it for
     * permissions only, not for a value that is still loading or saving.
     */
    readOnlyAccess?: boolean;
}

/** Three pulses of 1.1 s (see `.editNudge`); with reduced motion a static outline for 2 s. */
const NUDGE_MS = 3300;
const NUDGE_REDUCED_MOTION_MS = 2000;

/** Anything that can be a control of its own. Read mode disables most of them; a working one keeps its job. */
const CONTROL_SELECTOR = [
    'a[href]',
    'button',
    'input',
    'select',
    'textarea',
    'summary',
    '[role="button"]',
    '[role="link"]',
    '[role="tab"]',
    '[role="switch"]',
    '[role="checkbox"]',
    '[role="radio"]',
    '[role="combobox"]',
    '[tabindex]:not([tabindex="-1"])',
].join(',');
/** Where a field sits: a press here, while the field is locked, means "I want to change this". */
const FIELD_SELECTOR = '.ant-form-item, .MuiFormControl-root, .MuiInputBase-root, label';

const isInert = (control: Element) => control.matches(':disabled') || control.getAttribute('aria-disabled') === 'true';

/**
 * Whether a press inside a read-mode tile landed on a locked field, as opposed to empty space or
 * a control that still works in read mode (a link, a help button, an expander).
 */
const pressedLockedField = (target: EventTarget, root: HTMLElement) => {
    if (!(target instanceof Element) || !root.contains(target)) return false;
    const control = target.closest(CONTROL_SELECTOR);
    if (control && root.contains(control)) return isInert(control);
    const field = target.closest(FIELD_SELECTOR);
    return !!field && root.contains(field);
};

const prefersReducedMotion = () =>
    typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const CardEditable = ({
    allowUnsavedChanges,
    className,
    isLoading,
    initialValues,
    titleKey,
    subTitle,
    subTitleKey,
    cancelKey = 'card.edit.cancel',
    saveKey = 'card.edit.save',
    children,
    editMode,
    hideSaveButton,
    hideCancelButton,
    onEdit,
    onSave,
    formProp,
    tooltip,
    help,
    picture,
    autoHeight,
    note,
    fullHeight,
    editButton,
    editButtonPlacement,
    editLabelKey = 'edit',
    variant = 'default',
    headerIcon,
    allowEdit = true,
    readOnlyAccess = false,
}: CardEditableProps) => {
    const [form] = Form.useForm(formProp);
    const { t } = useTranslation();
    const [editing, setEditing] = useState(editMode);
    const [hasChanges, setHasChanges] = useState(false);
    const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
    const latestSubmission = useRef(0);
    const [nudging, setNudging] = useState(false);
    const nudgeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

    useEffect(() => () => clearTimeout(nudgeTimer.current), []);

    const cancelEditButton: ButtonItem = {
        label: t(cancelKey),
        type: BUTTON_TYPES.LINK,
    };

    const saveEditButton: ButtonItem = {
        label: t(saveKey),
        type: BUTTON_TYPES.LINK,
    };

    const onFormSubmit = useCallback(
        (formData) => {
            if (!onSave) return;
            // Identifies this submission so a slow failure from an earlier save cannot
            // reopen the card on top of a later one the user has already sent.
            const submission = latestSubmission.current + 1;
            latestSubmission.current = submission;
            // Close optimistically first, so a synchronous onError still wins the race
            // and reopens the card rather than being overwritten by this reset.
            setEditing(editMode);
            setHasChanges(false);
            onSave(formData, {
                // A failed save must not be indistinguishable from a successful one:
                // reopen the card with the entered values still in the form so the user
                // can retry, instead of silently dropping the change on the floor.
                onError: () => {
                    if (submission !== latestSubmission.current) {
                        return;
                    }
                    setEditing(true);
                    setHasChanges(true);
                },
                form,
            });
        },
        [editMode, form, onSave],
    );
    const canStartEditing = allowEdit && !readOnlyAccess && !editMode && !editing;
    const showLockedEdit = readOnlyAccess && !editMode && !editing;
    const finalEditButtonPlacement = editButtonPlacement ?? (variant === 'dialog' ? 'footer' : 'header');
    const footerActionClassName = classNames(styles.footerActions, {
        [styles.dialogFooterActions]: variant === 'dialog',
    });
    const startEditing = useCallback(() => {
        clearTimeout(nudgeTimer.current);
        setNudging(false);
        if (onEdit) {
            onEdit();
            return;
        }

        setEditing(true);
    }, [onEdit]);

    /*
     * A press on a locked field of a tile that is not being edited used to do nothing at all, so
     * nothing told the user that "Bearbeiten" comes first. Point at the edit button instead.
     */
    const nudgeTowardsEdit = () => {
        clearTimeout(nudgeTimer.current);
        setNudging(true);
        nudgeTimer.current = setTimeout(
            () => setNudging(false),
            prefersReducedMotion() ? NUDGE_REDUCED_MOTION_MS : NUDGE_MS,
        );
    };
    const onFormPointerDown = (event: PointerEvent<HTMLFormElement>) => {
        if (canStartEditing && pressedLockedField(event.target, event.currentTarget)) nudgeTowardsEdit();
    };
    const onFormKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
        // A locked switch keeps keyboard focus (#1357); Space or Enter on it is the same attempt.
        if (event.key !== ' ' && event.key !== 'Enter') return;
        if (canStartEditing && pressedLockedField(event.target, event.currentTarget)) nudgeTowardsEdit();
    };
    const editNudgeClassName = classNames({ [styles.editNudge]: nudging });
    const nudgeHint = canStartEditing && (
        <p aria-live="polite" className={styles.editNudgeHint} role="status">
            {nudging ? t('card.edit.nudge') : ''}
        </p>
    );
    const lockedEditButton = (showLabel: boolean) => (
        <M3Tooltip portal text={t('card.edit.readOnly')}>
            <EditButton locked labelKey={editLabelKey} showLabel={showLabel} />
        </M3Tooltip>
    );

    return (
        <Card
            className={classNames(styles.card, className, { [styles.fullHeight]: fullHeight })}
            variant={variant}
            headerIcon={headerIcon}
            titleKey={titleKey}
            subTitle={subTitle}
            subTitleKey={subTitleKey}
            tooltip={tooltip}
            help={help}
            picture={picture}
            autoHeight={autoHeight}
            isLoading={isLoading}
            cardTitleClassName={styles.cardTitleClassName}
            cardTitleChildren={
                finalEditButtonPlacement === 'header' &&
                (canStartEditing ? (
                    <EditButton
                        className={editNudgeClassName}
                        showLabel={false}
                        icon={editButton}
                        onClick={startEditing}
                    />
                ) : (
                    showLockedEdit && lockedEditButton(false)
                ))
            }
        >
            <ReadOnlyTileContext.Provider value={!editing}>
                <Form
                    validateTrigger={['onSubmit', 'onChange']}
                    labelAlign="left"
                    labelWrap
                    layout="vertical"
                    form={form}
                    size="large"
                    onValuesChange={() => setHasChanges(true)}
                    onFinish={onFormSubmit}
                    onPointerDown={onFormPointerDown}
                    onKeyDown={onFormKeyDown}
                    disabled={!editing}
                    initialValues={initialValues}
                    className={classNames({ [styles.dialogForm]: variant === 'dialog', [styles.formEditing]: editing })}
                >
                    {typeof children === 'function' ? children({ form, editing, startEditing }) : children}
                </Form>
            </ReadOnlyTileContext.Provider>

            {finalEditButtonPlacement === 'header' && nudgeHint}
            {note && <TileNote icon={note.icon}>{note.text}</TileNote>}
            {canStartEditing && finalEditButtonPlacement === 'footer' && (
                <div className={footerActionClassName}>
                    {nudgeHint}
                    <EditButton
                        className={editNudgeClassName}
                        icon={editButton}
                        labelKey={editLabelKey}
                        onClick={startEditing}
                    />
                </div>
            )}
            {showLockedEdit && finalEditButtonPlacement === 'footer' && (
                <div className={footerActionClassName}>{lockedEditButton(true)}</div>
            )}
            {editing && (!hideSaveButton || !hideCancelButton) && (
                <div className={footerActionClassName}>
                    {!hideCancelButton && (
                        <Button
                            item={cancelEditButton}
                            buttonHandle={() => {
                                if (allowUnsavedChanges && hasChanges) {
                                    setShowUnsavedChangesModal(true);
                                } else {
                                    form.resetFields();
                                    setEditing(false);
                                }
                            }}
                        />
                    )}
                    {!hideSaveButton && <Button item={saveEditButton} buttonHandle={() => form.submit()} />}
                </div>
            )}
            {allowUnsavedChanges && showUnsavedChangesModal && (
                <UnsavedChangesModal
                    // onConfirm = destructive (discard + exit editing), onClose = safe (keep editing).
                    onConfirm={() => {
                        form.resetFields();
                        setEditing(false);
                        setShowUnsavedChangesModal(false);
                    }}
                    onClose={() => setShowUnsavedChangesModal(false)}
                />
            )}
        </Card>
    );
};
