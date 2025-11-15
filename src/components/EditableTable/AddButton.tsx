import { Button, Popover } from 'antd';
import React, { useCallback } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

const AddButton = ({ allowedNumberOfUsers, sourceLength, handleBtnAdd }: AddButtonProps) => {
    const { typeOfUsers } = useParams();
    const { t } = useTranslation();
    const typeOfUserKey = typeOfUsers === 'consultants' ? 'counselor.title' : 'agencyAdmins.title';
    const StyledButton = useCallback(
        ({ disabled }) => {
            return (
                <Button
                    className="mb-m mr-sm"
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleBtnAdd}
                    disabled={disabled}
                >
                    {t('new')}
                </Button>
            );
        },
        [handleBtnAdd, t],
    );

    return (
        <div>
            {allowedNumberOfUsers !== false && sourceLength >= allowedNumberOfUsers ? (
                <Popover
                    placement="bottomRight"
                    content={t('counselor.new.help', { number: allowedNumberOfUsers })}
                    title={t('notice')}
                    trigger="hover"
                >
                    {StyledButton({ disabled: true })}
                </Popover>
            ) : (
                StyledButton({ disabled: false })
            )}
            {allowedNumberOfUsers !== false && (
                <span>
                    {sourceLength}/{allowedNumberOfUsers} {t(typeOfUserKey)}
                </span>
            )}
        </div>
    );
};

export default AddButton;
