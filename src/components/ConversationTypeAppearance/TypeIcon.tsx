import type { ReactElement } from 'react';
import MailOutline from '@mui/icons-material/EmailOutlined';
import ChatOutlined from '@mui/icons-material/ChatOutlined';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
import LockOutlined from '@mui/icons-material/LockOutlined';
import type { ConversationType } from '../ConversationModules/conversationModule';
import { iconFor, svgDataUrl, type AppearanceSettings, type IconVariant } from './appearance';

export const SHIPPED_TYPE_ICONS: Record<ConversationType, ReactElement> = {
    AGENCY_COUNSELLING: <MailOutline />,
    LIVE_CHAT: <ChatOutlined />,
    SELF_HELP: <GroupsOutlined />,
    INTERNAL_GROUP: <LockOutlined />,
};

interface TypeIconProps {
    type: ConversationType;
    appearance?: AppearanceSettings;
    variant?: IconVariant;
    size?: number;
}

/** The uploaded icon of a conversation type, or the shipped one. Decorative: the name sits next to it. */
export const TypeIcon = ({ type, appearance = {}, variant = 'outline400', size = 24 }: TypeIconProps) => {
    const svg = iconFor(appearance, type, variant);
    if (!svg) return SHIPPED_TYPE_ICONS[type];
    return <img src={svgDataUrl(svg)} alt="" width={size} height={size} style={{ display: 'block' }} />;
};
