import { Form, FormInstance } from 'antd';
import classNames from 'classnames';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ButtonItem, BUTTON_TYPES } from '../button/Button';
import { UnsavedChangesModal } from './components/UnsavedChanges';
import styles from './styles.module.scss';
import { Card, CardVariant } from '../Card';
import { EditButton } from '../EditButton';

interface CardEditableProps {
    className?: string;
    isLoading?: boolean;
    fullHeight?: boolean;
    variant?: CardVariant;
    headerIcon?: React.ReactChild;
    initialValues?: Record<string, unknown>;
    titleKey: string;
    subTitle?: React.ReactChild;
    subTitleKey?: string;
    saveKey?: string;
    cancelKey?: string;
    children:
        | React.ReactElement
        | React.ReactElement[]
        | ((data: {
              form: FormInstance<any>;
              editing: boolean;
              startEditing: () => void;
          }) => React.ReactElement | React.ReactElement[]);
    onSave: <T>(formData: T, options?: { onError?: () => void }) => void;
    formProp?: FormInstance;
    editMode?: boolean;
    hideSaveButton?: boolean;
    hideCancelButton?: boolean;
    tooltip?: string;
    allowUnsavedChanges?: boolean;
    editButton?: React.ReactChild;
    editButtonPlacement?: 'header' | 'footer';
    editLabelKey?: string;
    /** When false, the card is view-only (no edit pencil). */
    allowEdit?: boolean;
}

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
    onSave,
    formProp,
    tooltip,
    fullHeight,
    editButton,
    editButtonPlacement,
    editLabelKey = 'edit',
    variant = 'default',
    headerIcon,
    allowEdit = true,
}: CardEditableProps) => {
    const [form] = Form.useForm(formProp);
    const { t } = useTranslation();
    const [editing, setEditing] = useState(editMode);
    const [hasChanges, setHasChanges] = useState(false);
    const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);

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
            onSave(formData, { onError: () => setEditing(editMode) });
            setEditing(editMode);
            setHasChanges(false);
        },
        [onSave],
    );
    const canStartEditing = allowEdit && !editMode && !editing;
    const finalEditButtonPlacement = editButtonPlacement ?? (variant === 'dialog' ? 'footer' : 'header');
    const footerActionClassName = classNames(styles.footerActions, {
        [styles.dialogFooterActions]: variant === 'dialog',
    });

    return (
        <Card
            className={classNames(styles.card, className, { [styles.fullHeight]: fullHeight })}
            variant={variant}
            headerIcon={headerIcon}
            titleKey={titleKey}
            subTitle={subTitle}
            subTitleKey={subTitleKey}
            tooltip={tooltip}
            isLoading={isLoading}
            cardTitleClassName={styles.cardTitleClassName}
            cardTitleChildren={
                canStartEditing &&
                finalEditButtonPlacement === 'header' && (
                    <EditButton showLabel={false} icon={editButton} onClick={() => setEditing(true)} />
                )
            }
        >
            <Form
                validateTrigger={['onSubmit', 'onChange']}
                labelAlign="left"
                labelWrap
                layout="vertical"
                form={form}
                size="large"
                onValuesChange={() => setHasChanges(true)}
                onFinish={onFormSubmit}
                disabled={!editing}
                initialValues={initialValues}
                className={classNames({ [styles.dialogForm]: variant === 'dialog' })}
            >
                {typeof children === 'function'
                    ? children({ form, editing, startEditing: () => setEditing(true) })
                    : children}
            </Form>

            {canStartEditing && finalEditButtonPlacement === 'footer' && (
                <div className={footerActionClassName}>
                    <EditButton icon={editButton} labelKey={editLabelKey} onClick={() => setEditing(true)} />
                </div>
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
                    onConfirm={() => setShowUnsavedChangesModal(false)}
                    onClose={() => {
                        form.resetFields();
                        setEditing(false);
                        setShowUnsavedChangesModal(false);
                    }}
                />
            )}
        </Card>
    );
};
