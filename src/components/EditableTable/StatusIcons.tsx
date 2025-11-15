import React from 'react';

import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    DeleteOutlined,
    InfoCircleOutlined,
    StopOutlined,
} from '@ant-design/icons';
import { Tooltip } from 'antd';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { Status } from '../../types/status';

const successColor = '#4FCC5C';
const attentionColor = '#FF9F00';
const errorColor = '#FF0000';

const StatusIcons = ({ status, createdCustomLabel }: { status: Status; createdCustomLabel?: string }) => {
    const { t } = useTranslation();
    return (
        <div className={clsx('statusIconWrapper', status)}>
            {status === 'IN_DELETION' && (
                <Tooltip color={attentionColor} title={t('status.IN_DELETION.tooltip')}>
                    <DeleteOutlined style={{ color: attentionColor }} />
                </Tooltip>
            )}
            {status === 'IN_PROGRESS' && (
                <Tooltip color={attentionColor} title={t('status.IN_PROGRESS.tooltip')}>
                    <InfoCircleOutlined style={{ color: attentionColor }} />
                </Tooltip>
            )}
            {status === 'ERROR' && (
                <Tooltip color={errorColor} title={t('status.ERROR.tooltip')}>
                    <CloseCircleOutlined style={{ color: errorColor }} />
                </Tooltip>
            )}
            {status === 'CREATED' && (
                <Tooltip color={successColor} title={createdCustomLabel || t('status.CREATED.tooltip')}>
                    <CheckCircleOutlined style={{ color: successColor }} />
                </Tooltip>
            )}
            {status === 'ACTIVE' && (
                <Tooltip color={successColor} title={t('status.ACTIVE.tooltip')}>
                    <CheckCircleOutlined style={{ color: successColor }} />
                </Tooltip>
            )}
            {status === 'INACTIVE' && (
                <Tooltip color={errorColor} title={t('status.INACTIVE.tooltip')}>
                    <StopOutlined style={{ color: errorColor }} />
                </Tooltip>
            )}
        </div>
    );
};

export default StatusIcons;
