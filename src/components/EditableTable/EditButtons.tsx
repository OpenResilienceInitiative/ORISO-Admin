import React from 'react';
import classNames from 'classnames';
import { AgencyData } from '../../types/agency';
import { CounselorData } from '../../types/counselor';
import { EditableData } from '../../types/editabletable';
import { TopicData } from '../../types/topic';
import { BasicTenantData } from '../../types/tenant';
import { ReactComponent as EditIcon } from '../../resources/img/svg/pen.svg';
import { ReactComponent as DeleteIcon } from '../../resources/img/svg/delete.svg';
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

    const handleEditAction = disabledButtons.edit ? () => {} : handleEdit;
    const handleDeleteAction = disabledButtons.delete ? () => {} : handleDelete;
    const hiddenElements = hide || [];
    if (!can(PermissionAction.Delete, resource)) {
        hide.push('delete');
    }
    if (!can(PermissionAction.Update, resource)) {
        hide.push('edit');
    }

    return (
        <div className="editBtnWrapper">
            {!hiddenElements.includes('edit') && (
                <button
                    className={classNames({ [styles.disabled]: disabledButtons?.edit }, styles.iconButton)}
                    type="button"
                    disabled={disabledButtons?.edit}
                    onClick={() => handleEditAction(record)}
                >
                    <EditIcon />
                </button>
            )}
            {!hiddenElements.includes('delete') && (
                <button
                    className={classNames({ [styles.disabled]: disabledButtons?.delete }, styles.iconButton)}
                    type="button"
                    disabled={disabledButtons?.delete}
                    onClick={() => {
                        handleDeleteAction(record);
                    }}
                >
                    <DeleteIcon />
                </button>
            )}
        </div>
    );
};

export default EditButtons;
