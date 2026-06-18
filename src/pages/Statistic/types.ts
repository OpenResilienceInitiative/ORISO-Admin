import type { ComponentType, SVGProps } from 'react';

export type ScopeKey = 'platform' | 'tenant' | 'agency';
export type TrendTone = 'blue' | 'red' | 'dark';
export type TrendDirection = 'up' | 'down' | 'upRight' | 'downRight';
export type TrendScoreTone = 'critical' | 'bad' | 'good' | 'great';
export type CardSize = 'large' | 'medium' | 'small';
export type IconTone = 'plain' | 'muted' | 'coral' | 'danger';
export type CasePeriodKey = 'thisWeek' | 'lastWeek' | 'twoWeeksAgo' | 'threeWeeksAgo' | 'fourWeeksAgo';
export type ConversationPeriodKey = 'today' | 'yesterday' | 'thisWeek' | 'total' | 'thisYear' | 'lastYear';
export type CardMenuKey =
    | 'all'
    | 'activeAgencies'
    | 'activeCounselors'
    | 'cases'
    | 'conversationsTotal'
    | 'oneToOne'
    | 'liveChat'
    | 'groups'
    | 'consultations'
    | 'counselors'
    | 'messagesCounselors'
    | 'messagesPerSession'
    | 'messagesSeekers'
    | 'activeConversations'
    | 'phoneShare'
    | 'previousMonth'
    | 'textMessagesTotal'
    | 'topTopic'
    | 'twoMonthsAgo'
    | 'threeMonthsAgo'
    | 'videoCallCount'
    | 'videoShare'
    | 'voiceShare';

export type SvgIcon = ComponentType<SVGProps<SVGSVGElement>>;

export interface ScopeDefinition {
    key: ScopeKey;
    label: string;
    icon: SvgIcon;
}

export interface TrendBadgeDefinition {
    value: string;
    tone: TrendTone;
    direction?: TrendDirection;
}

export interface CardMenuOption {
    key: CardMenuKey;
    label: string;
    title?: string;
    value: string;
    detail?: string;
    trend?: TrendBadgeDefinition;
    icon?: SvgIcon;
    iconTone?: IconTone;
}

export interface StatisticCardDefinition {
    key: string;
    title: string;
    value: string;
    detail?: string;
    trend?: TrendBadgeDefinition;
    icon: SvgIcon;
    iconTone?: IconTone;
    menuLabel?: string;
    menuAriaLabel?: string;
    menuOptions?: CardMenuOption[];
    defaultMenuKey?: CardMenuKey;
    size: CardSize;
}

export interface CaseChartBar {
    day: string;
    dateLabel: string;
    value: number;
    isDefaultSelected?: boolean;
}

export interface ConversationSegment {
    label: string;
    color: string;
    value: number;
    displayLabel?: string;
}

export interface ConversationPeriodData {
    total: string;
    segments: ConversationSegment[];
}

export interface DonutRenderSegment {
    color: string;
    offset: number;
    size: number;
}

export interface ScopeDashboard {
    topCards: StatisticCardDefinition[];
    communicationCards: StatisticCardDefinition[];
    caseCharts: Record<CasePeriodKey, CaseChartBar[]>;
    conversation: Record<ConversationPeriodKey, ConversationPeriodData>;
}

export interface PeriodOption<OptionKey extends string> {
    key: OptionKey;
    label: string;
}

export type SelectedCardMenuByScope = Record<ScopeKey, Record<string, CardMenuKey>>;
export type SelectedFilterTargetIdsByScope = Record<ScopeKey, string[]>;
