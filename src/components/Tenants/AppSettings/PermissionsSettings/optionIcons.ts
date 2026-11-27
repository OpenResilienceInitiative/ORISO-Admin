import CallOutlinedIcon from '@mui/icons-material/CallOutlined';
import AlternateEmailOutlinedIcon from '@mui/icons-material/AlternateEmailOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import ImageSearchOutlinedIcon from '@mui/icons-material/ImageSearchOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import MailOutlinedIcon from '@mui/icons-material/MailOutlined';
import MicNoneOutlinedIcon from '@mui/icons-material/MicNoneOutlined';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import SupervisorAccountOutlinedIcon from '@mui/icons-material/SupervisorAccountOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import type { ComponentType } from 'react';
import { ReactComponent as ThreadIcon } from '../../../../resources/img/svg/permissions/thread.svg';

/** The icon of each switch on the conversation-type tiles, by its label key. */
export const OPTION_ICONS: Record<string, ComponentType<{ className?: string }>> = {
    'tenants.permissions.feature.videoCalls': VideocamOutlinedIcon,
    'tenants.permissions.feature.audioCalls': CallOutlinedIcon,
    'tenants.permissions.feature.voiceMessages': MicNoneOutlinedIcon,
    'tenants.permissions.feature.threads': ThreadIcon,
    'tenants.permissions.feature.supervision': SupervisorAccountOutlinedIcon,
    'tenants.permissions.feature.mediaUpload': UploadFileOutlinedIcon,
    'tenants.permissions.feature.mediaInlineDisplay': ImageOutlinedIcon,
    'tenants.permissions.feature.mediaAiScan': ImageSearchOutlinedIcon,
    'tenants.permissions.asker.displayName.conversationLabel': PersonOutlineOutlinedIcon,
    'tenants.permissions.card.notifications.askForEmail': AlternateEmailOutlinedIcon,
    'tenants.permissions.card.notifications.email': MailOutlinedIcon,
    'tenants.permissions.card.notifications.browser': NotificationsNoneOutlinedIcon,
};
