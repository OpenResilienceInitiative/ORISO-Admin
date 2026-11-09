import type { ComponentType, SVGProps, ElementType } from 'react';

export type ScopeKey = 'platform' | 'tenant' | 'agency';
export type TrendTone = 'blue' | 'red' | 'dark';
export type TrendDirection = 'up' | 'down' | 'upRight' | 'downRight';
export type TrendScoreTone = 'critical' | 'bad' | 'good' | 'great';
export type CardSize = 'large' | 'medium' | 'small';
export type IconTone = 'plain' | 'muted' | 'coral' | 'danger';
/** One week of the requests chart (0 = this week), or one bar per week for the whole window. */
export type CasePeriodKey = `weeksAgo${number}` | 'weekOverview';
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
    /** Top topic n months back, beyond the four named month keys (topic window > 4 months). */
    | `topicMonthsAgo${number}`
    | 'textMessagesTotal'
    | 'topTopic'
    | 'twoMonthsAgo'
    | 'threeMonthsAgo'
    | 'videoCallCount'
    | 'videoShare'
    | 'voiceShare';

/**
 * Why a card has no figure: `protected` = withheld by the small-cell rule (too few active
 * counsellors), `notTracked` = no data source yet, `pending` = nothing happened yet.
 */
export type StatisticEmptyKind = 'protected' | 'notTracked' | 'pending';

/** Card glyph: an SVG component or an MUI outlined icon (monochrome, ORISO-Admin#1374). */
export type SvgIcon = ComponentType<SVGProps<SVGSVGElement>> | ElementType;

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
    description?: string;
    detail?: string;
    trend?: TrendBadgeDefinition;
    icon?: SvgIcon;
    iconTone?: IconTone;
    /**
     * When set, the card renders its calm empty presentation (muted dash + this hint)
     * instead of the raw value. The value itself stays untouched so the CSV export and
     * screen readers keep the explicit "Keine Daten" wording.
     */
    emptyHint?: string;
    /** How the empty card presents itself; see StatisticEmptyKind. Defaults to `pending`. */
    emptyKind?: StatisticEmptyKind;
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
    /** See CardMenuOption.emptyHint — calm empty presentation instead of the raw value. */
    emptyHint?: string;
    /** See CardMenuOption.emptyKind. */
    emptyKind?: StatisticEmptyKind;
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
}

/**
 * Structural-only shape for the static card/menu blueprints (key, label, icon).
 * value/detail/trend are always supplied at render time by applyMetricOverride,
 * so the blueprints deliberately cannot declare them - that keeps a wiring gap
 * (a card key without an override mapping) a type error instead of a silent
 * fake-number regression.
 */
export type CardMenuOptionBlueprint = Omit<CardMenuOption, 'value' | 'detail' | 'trend'>;
export type StatisticCardBlueprint = Omit<StatisticCardDefinition, 'value' | 'detail' | 'trend' | 'menuOptions'> & {
    menuOptions?: CardMenuOptionBlueprint[];
};

export interface ScopeDashboardBlueprint {
    topCards: StatisticCardBlueprint[];
    communicationCards: StatisticCardBlueprint[];
}

export interface PeriodOption<OptionKey extends string> {
    key: OptionKey;
    label: string;
}

export type SelectedCardMenuByScope = Record<ScopeKey, Record<string, CardMenuKey>>;
export type SelectedFilterTargetIdsByScope = Record<ScopeKey, string[]>;
