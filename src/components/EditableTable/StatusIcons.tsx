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
import { DisplayStatus } from '../../types/userDisplayStatus';
import { Status } from '../../types/status';

const successColor = 'var(--admin-status-success, var(--tag-success, #0a882f))';
const attentionColor = 'var(--admin-status-warning, var(--warning-dark, #ff9f00))';
const errorColor = 'var(--admin-status-error, var(--form-error, #cc0000))';
const mutedColor = 'var(--admin-status-muted, var(--m3-outline, #747878))';

const StatusIcons = ({
    status,
    createdCustomLabel,
}: {
    status: Status | DisplayStatus;
    createdCustomLabel?: string;
}) => {
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
            {status === 'INVITED' && (
                <Tooltip color={attentionColor} title={t('status.INVITED.tooltip')}>
                    <InfoCircleOutlined style={{ color: attentionColor }} />
                </Tooltip>
            )}
            {status === 'ABSENT' && (
                <Tooltip color={mutedColor} title={t('status.ABSENT.tooltip')}>
                    <StopOutlined style={{ color: mutedColor }} />
                </Tooltip>
            )}
            {status === 'DISABLED' && (
                <Tooltip color={errorColor} title={t('status.DISABLED.tooltip')}>
                    <CloseCircleOutlined style={{ color: errorColor }} />
                </Tooltip>
            )}
        </div>
    );
};

export default StatusIcons;
