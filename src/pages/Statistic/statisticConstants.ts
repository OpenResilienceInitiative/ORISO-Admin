import type {
    CardMenuKey,
    ConversationPeriodKey,
    PeriodOption,
    ScopeKey,
    SelectedFilterTargetIdsByScope,
} from './types';

export const defaultSelectedCaseDayByScope: Record<ScopeKey, string> = {
    platform: 'Do',
    tenant: 'Do',
    agency: 'Do',
};

export const defaultSelectedFilterTargetIdsByScope: SelectedFilterTargetIdsByScope = {
    platform: [],
    tenant: [],
    agency: [],
};

export const scopeOrder: ScopeKey[] = ['platform', 'tenant', 'agency'];

export const conversationPeriodOptions: Array<PeriodOption<ConversationPeriodKey>> = [
    { key: 'today', label: 'heute' },
    { key: 'yesterday', label: 'gestern' },
    { key: 'thisWeek', label: 'diese Woche' },
    { key: 'total', label: 'gesamt' },
    { key: 'thisYear', label: 'dieses Jahr' },
    { key: 'lastYear', label: 'letztes Jahr' },
];

export const cardMenuKeys: CardMenuKey[] = [
    'all',
    'activeAgencies',
    'activeCounselors',
    'cases',
    'conversationsTotal',
    'oneToOne',
    'liveChat',
    'groups',
    'consultations',
    'counselors',
    'messagesCounselors',
    'messagesPerSession',
    'messagesSeekers',
    'activeConversations',
    'phoneShare',
    'previousMonth',
    'textMessagesTotal',
    'topTopic',
    'twoMonthsAgo',
    'threeMonthsAgo',
    'videoCallCount',
    'videoShare',
    'voiceShare',
];
