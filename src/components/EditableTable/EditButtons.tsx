import React from 'react';
import classNames from 'classnames';
import { AgencyData } from '../../types/agency';
import { CounselorData } from '../../types/counselor';
import { EditableData } from '../../types/editabletable';
import { TopicData } from '../../types/topic';
import { BasicTenantData } from '../../types/tenant';
import { ReactComponent as DeleteIcon } from '../../resources/img/svg/table-actions/delete_forever.svg';
import { ReactComponent as DeleteHoverIcon } from '../../resources/img/svg/table-actions/delete_forever_400.svg';
import { ReactComponent as DeleteSelectedIcon } from '../../resources/img/svg/table-actions/delete_forever_done.svg';
import { ReactComponent as EditIcon } from '../../resources/img/svg/table-actions/edit_200.svg';
import { ReactComponent as EditHoverIcon } from '../../resources/img/svg/table-actions/edit_400.svg';
import { ReactComponent as EditSelectedIcon } from '../../resources/img/svg/table-actions/edit_filled.svg';
import { Resource } from '../../enums/Resource';
import { useUserPermissions } from '../../hooks/useUserPermission';
import { PermissionAction } from '../../enums/PermissionAction';
import styles from './styles.module.scss';

export interface EditButtonsProps extends Omit<React.HTMLAttributes<HTMLElement>, 'resource'> {
    handleEdit: (formData: EditableData) => void;
    handleDelete: (formData: EditableData) => void;
    record: Partial<CounselorData | AgencyData | BasicTenantData | TopicData>;
    isDisabled?: boolean;
    hide?: string[];
    resource: Resource;
    disabled?: { edit: boolean; delete: boolean };
}

interface ActionIconProps {
    DefaultIcon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    HoverIcon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    SelectedIcon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

const ActionIcon = ({ DefaultIcon, HoverIcon, SelectedIcon }: ActionIconProps) => (
    <span className={styles.actionIconStack} aria-hidden="true">
        <DefaultIcon className={classNames(styles.actionIcon, styles.actionIconDefault)} />
        <HoverIcon className={classNames(styles.actionIcon, styles.actionIconHover)} />
        <SelectedIcon className={classNames(styles.actionIcon, styles.actionIconSelected)} />
    </span>
);

export const EditButtons = ({
    handleEdit,
    handleDelete,
    record,
    isDisabled,
    hide = [],
    resource,
    disabled,
}: EditButtonsProps) => {
    const { can } = useUserPermissions();
    const disabledButtons = {
        edit: isDisabled || disabled?.edit,
        delete: isDisabled || disabled?.delete,
    };
    const isRecordPendingDeletion = (record as { status?: string; deleteDate?: unknown }).status === 'IN_DELETION';

    const handleEditAction = disabledButtons.edit ? () => {} : handleEdit;
    const handleDeleteAction = disabledButtons.delete ? () => {} : handleDelete;
    const hiddenElements = [...hide];
    if (!can(PermissionAction.Delete, resource)) {
        hiddenElements.push('delete');
    }
    if (!can(PermissionAction.Update, resource)) {
        hiddenElements.push('edit');
    }

    return (
        <div className="editBtnWrapper">
            {!hiddenElements.includes('edit') && (
                <button
                    className={classNames(styles.iconButton, { [styles.disabled]: disabledButtons?.edit })}
                    type="button"
                    disabled={disabledButtons?.edit}
                    onClick={() => handleEditAction(record)}
                >
                    <ActionIcon DefaultIcon={EditIcon} HoverIcon={EditHoverIcon} SelectedIcon={EditSelectedIcon} />
                </button>
            )}
            {!hiddenElements.includes('delete') && (
                <button
                    className={classNames(styles.iconButton, {
                        [styles.disabled]: disabledButtons?.delete && !isRecordPendingDeletion,
                        [styles.selected]: isRecordPendingDeletion,
                    })}
                    type="button"
                    disabled={disabledButtons?.delete}
                    onClick={() => {
                        handleDeleteAction(record);
                    }}
                >
                    <ActionIcon
                        DefaultIcon={DeleteIcon}
                        HoverIcon={DeleteHoverIcon}
                        SelectedIcon={DeleteSelectedIcon}
                    />
                </button>
            )}
        </div>
    );
};

export default EditButtons;
