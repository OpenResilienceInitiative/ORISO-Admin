import { Form, FormInstance } from 'antd';
import classNames from 'classnames';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ButtonItem, BUTTON_TYPES } from '../button/Button';
import { ReactComponent as PenIcon } from '../../resources/img/svg/pen.svg';
import { UnsavedChangesModal } from './components/UnsavedChanges';
import styles from './styles.module.scss';
import { Card } from '../Card';

interface CardEditableProps {
    className?: string;
    isLoading?: boolean;
    fullHeight?: boolean;
    initialValues?: Record<string, unknown>;
    titleKey: string;
    subTitle?: React.ReactChild;
    subTitleKey?: string;
    saveKey?: string;
    cancelKey?: string;
    children:
        | React.ReactElement
        | React.ReactElement[]
        | ((data: { form: FormInstance<any>; editing: boolean }) => React.ReactElement | React.ReactElement[]);
    onSave: <T>(formData: T, options?: { onError?: () => void }) => void;
    formProp?: FormInstance;
    editMode?: boolean;
    hideSaveButton?: boolean;
    hideCancelButton?: boolean;
    tooltip?: string;
    allowUnsavedChanges?: boolean;
    editButton?: React.ReactChild;
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
    editButton = <PenIcon className={styles.pencil} />,
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

    return (
        <Card
            className={classNames(styles.card, className, { [styles.fullHeight]: fullHeight })}
            titleKey={titleKey}
            subTitle={subTitle}
            subTitleKey={subTitleKey}
            tooltip={tooltip}
            isLoading={isLoading}
            cardTitleClassName={styles.cardTitleClassName}
            cardTitleChildren={
                !editMode &&
                !editing && (
                    <button className={styles.editCard} type="button" onClick={() => setEditing(true)}>
                        {editButton}
                    </button>
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
            >
                {typeof children === 'function' ? children({ form, editing }) : children}
            </Form>

            {editing && (!hideSaveButton || !hideCancelButton) && (
                <div className={styles.footerActions}>
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
