import { ArrowDownward, ArrowUpward, MoreVert, NorthEast, SouthEast } from '@mui/icons-material';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Page } from '../components/Page';
import { ReactComponent as ActiveAgenciesIcon } from '../resources/img/svg/statistics-dashboard/active-agencies.svg';
import { ReactComponent as CalendarIcon } from '../resources/img/svg/statistics-dashboard/calendar.svg';
import { ReactComponent as ChevronDownIcon } from '../resources/img/svg/statistics-dashboard/chevron-down.svg';
import { ReactComponent as ConversationsIcon } from '../resources/img/svg/statistics-dashboard/conversations.svg';
import { ReactComponent as PhoneCallsIcon } from '../resources/img/svg/statistics-dashboard/phone-calls.svg';
import { ReactComponent as RequestsIcon } from '../resources/img/svg/statistics-dashboard/requests.svg';
import { ReactComponent as ScopeAgencyIcon } from '../resources/img/svg/statistics-dashboard/scope-agency.svg';
import { ReactComponent as ScopePlatformIcon } from '../resources/img/svg/statistics-dashboard/scope-platform.svg';
import { ReactComponent as ScopeTenantIcon } from '../resources/img/svg/statistics-dashboard/scope-tenant.svg';
import { ReactComponent as TextMessagesIcon } from '../resources/img/svg/statistics-dashboard/text-messages.svg';
import { ReactComponent as TopicIcon } from '../resources/img/svg/statistics-dashboard/topic.svg';
import { ReactComponent as VideoCallsIcon } from '../resources/img/svg/statistics-dashboard/video-calls.svg';
import { ReactComponent as VoiceMessagesIcon } from '../resources/img/svg/statistics-dashboard/voice-messages.svg';
import {
    casePeriodOptions,
    conversationPeriodOptions,
    defaultSelectedCaseDayByScope,
    scopeOrder,
} from './Statistic/statisticConstants';
import {
    buildDonutSegments,
    getCaseAxisLabels,
    getCaseAxisMax,
    gridLinePositions,
} from './Statistic/statisticChartUtils';
import { readStoredCardMenuSelection, storeCardMenuSelection } from './Statistic/statisticPreferences';
import type {
    CardMenuKey,
    CardMenuOption,
    CaseChartBar,
    CasePeriodKey,
    ConversationSegment,
    ConversationPeriodData,
    ConversationPeriodKey,
    IconTone,
    ScopeDashboard,
    ScopeDefinition,
    ScopeKey,
    SelectedCardMenuByScope,
    StatisticCardDefinition,
    SvgIcon,
    TrendBadgeDefinition,
    TrendDirection,
    TrendScoreTone,
} from './Statistic/types';
import { useAnimatedDisplayValue } from './Statistic/useAnimatedDisplayValue';

const conversationSegmentBlueprint = [
    { label: 'Nähe', color: '#bd000d' },
    { label: 'Live', color: '#ffaaa3' },
    { label: 'Gesprächskreise', displayLabel: 'Gesprächs\nkreise', color: '#ffd8d5' },
    { label: 'Interna', color: '#c10072' },
];

const createConversationSegments = (values: [number, number, number, number]) =>
    conversationSegmentBlueprint.map((segment, index) => ({
        ...segment,
        value: values[index],
    }));

const createConversationData = (values: [number, number, number, number]): ConversationPeriodData => ({
    total: `${values.reduce((sum, value) => sum + value, 0)}`,
    segments: createConversationSegments(values),
});

const getConversationTotal = (segments: ConversationSegment[]) =>
    segments.reduce((sum, segment) => sum + segment.value, 0);

const getConversationSegmentPercentage = (segment: ConversationSegment, segments: ConversationSegment[]) => {
    const total = getConversationTotal(segments);

    if (!total) {
        return 0;
    }

    return Math.round((segment.value / total) * 100);
};

const scopeDefinitions: Record<ScopeKey, ScopeDefinition> = {
    platform: {
        key: 'platform',
        label: 'Plattformweit',
        icon: ScopePlatformIcon,
    },
    tenant: {
        key: 'tenant',
        label: 'Auf Trägerebene',
        icon: ScopeTenantIcon,
    },
    agency: {
        key: 'agency',
        label: 'Auf Beratungsstellenebene',
        icon: ScopeAgencyIcon,
    },
};

const dashboardMetricOptionsByScope: Record<ScopeKey, CardMenuOption[]> = {
    platform: [
        {
            key: 'all',
            label: 'Anfragen gesamt',
            title: 'Anfragen gesamt',
            value: '870',
            detail: 'Vormonat gesamt 1.050',
            trend: { value: '~ 20%', tone: 'red' },
            icon: RequestsIcon,
        },
        {
            key: 'oneToOne',
            label: 'Nähe (1:1)',
            title: 'Nähe (1:1)',
            value: '420',
            detail: '1:1-Anfragen',
            trend: { value: '~ 18%', tone: 'blue' },
            icon: RequestsIcon,
        },
        {
            key: 'liveChat',
            label: 'Live-Chat',
            title: 'Live-Chat',
            value: '250',
            detail: 'Live-Chat-Anfragen',
            trend: { value: '~ 11%', tone: 'blue' },
            icon: RequestsIcon,
        },
        {
            key: 'groups',
            label: 'Gruppen',
            title: 'Gruppen',
            value: '200',
            detail: 'Gruppen-Anfragen',
            trend: { value: '~ 9%', tone: 'red' },
            icon: RequestsIcon,
        },
        {
            key: 'cases',
            label: 'Anzahl Beratungsfälle',
            title: 'Beratungsfälle',
            value: '3.150',
            detail: 'Diese Woche',
            trend: { value: '~ 18%', tone: 'blue' },
            icon: ConversationsIcon,
            iconTone: 'muted',
        },
        {
            key: 'conversationsTotal',
            label: 'Gespräche insgesamt',
            title: 'Gespräche insgesamt',
            value: '420',
            trend: { value: '~ 20%', tone: 'blue' },
            icon: ConversationsIcon,
        },
        {
            key: 'textMessagesTotal',
            label: 'Textnachrichten',
            title: 'Textnachrichten',
            value: '320',
            trend: { value: '~ 26%', tone: 'red' },
            icon: TextMessagesIcon,
            iconTone: 'muted',
        },
        {
            key: 'messagesSeekers',
            label: 'Anzahl Nachrichten Ratsuchende',
            title: 'Nachrichten Ratsuchende',
            value: '5.840',
            detail: 'Diese Woche',
            trend: { value: '~ 14%', tone: 'blue' },
            icon: TextMessagesIcon,
            iconTone: 'muted',
        },
        {
            key: 'messagesCounselors',
            label: 'Anzahl Nachrichten Beratende',
            title: 'Nachrichten Beratende',
            value: '4.920',
            detail: 'Diese Woche',
            trend: { value: '~ 9%', tone: 'blue' },
            icon: TextMessagesIcon,
            iconTone: 'muted',
        },
        {
            key: 'phoneShare',
            label: 'Anruf-Anteil',
            title: 'Anrufe',
            value: '15%',
            trend: { value: '~ 4%', tone: 'blue' },
            icon: PhoneCallsIcon,
            iconTone: 'coral',
        },
        {
            key: 'videoShare',
            label: 'Videoanruf-Anteil',
            title: 'Videoanrufe',
            value: '4%',
            trend: { value: '~ 67%', tone: 'dark' },
            icon: VideoCallsIcon,
            iconTone: 'danger',
        },
        {
            key: 'videoCallCount',
            label: 'Anzahl Videoanrufe',
            title: 'Anzahl Videoanrufe',
            value: '126',
            detail: 'Diese Woche',
            trend: { value: '~ 22%', tone: 'blue' },
            icon: VideoCallsIcon,
            iconTone: 'danger',
        },
        {
            key: 'voiceShare',
            label: 'Sprachnachrichten',
            title: 'Sprachnachrichten',
            value: '32%',
            trend: { value: '~ 20%', tone: 'blue' },
            icon: VoiceMessagesIcon,
            iconTone: 'coral',
        },
        {
            key: 'activeAgencies',
            label: 'Beratungsstellen',
            title: 'aktive Beratungsstellen',
            value: '320',
            detail: 'Durchschnitt pro Monat',
            trend: { value: '~ 20%', tone: 'blue' },
            icon: ActiveAgenciesIcon,
        },
        {
            key: 'counselors',
            label: 'aktive Beratende',
            title: 'aktive Beratende',
            value: '1.240',
            detail: 'Durchschnitt pro Monat',
            trend: { value: '~ 12%', tone: 'blue' },
            icon: ActiveAgenciesIcon,
        },
        {
            key: 'messagesPerSession',
            label: 'Ø Nachrichten/Gespräch',
            title: 'Nachrichten pro Gespräch',
            value: '8,4',
            detail: 'Durchschnitt pro Gespräch',
            trend: { value: '~ 6%', tone: 'blue' },
            icon: TextMessagesIcon,
            iconTone: 'muted',
        },
        {
            key: 'activeConversations',
            label: 'aktive Gespräche',
            title: 'aktive Gespräche',
            value: '555',
            detail: 'heute aktiv',
            trend: { value: '~ 4%', tone: 'blue' },
            icon: ConversationsIcon,
            iconTone: 'muted',
        },
        {
            key: 'topTopic',
            label: 'Häufigstes Thema',
            title: 'Häufigstes Thema',
            value: 'Schulden',
            detail: 'Dieser Monat',
            trend: { value: '~ 59%', tone: 'dark' },
            icon: TopicIcon,
        },
        {
            key: 'previousMonth',
            label: 'Thema letzter Monat',
            title: 'Häufigstes Thema',
            value: 'Wohnen',
            detail: 'Letzter Monat',
            trend: { value: '~ 44%', tone: 'dark' },
            icon: TopicIcon,
        },
        {
            key: 'twoMonthsAgo',
            label: 'Thema vor 2 Monaten',
            title: 'Häufigstes Thema',
            value: 'Trennung',
            detail: 'Vor 2 Monaten',
            trend: { value: '~ 31%', tone: 'dark' },
            icon: TopicIcon,
        },
        {
            key: 'threeMonthsAgo',
            label: 'Thema vor 3 Monaten',
            title: 'Häufigstes Thema',
            value: 'Sucht',
            detail: 'Vor 3 Monaten',
            trend: { value: '~ 27%', tone: 'dark' },
            icon: TopicIcon,
        },
    ],
    tenant: [
        {
            key: 'all',
            label: 'Anfragen gesamt',
            title: 'Anfragen gesamt',
            value: '312',
            detail: 'Vormonat gesamt 386',
            trend: { value: '~ 12%', tone: 'blue' },
            icon: RequestsIcon,
        },
        {
            key: 'oneToOne',
            label: 'Nähe (1:1)',
            title: 'Nähe (1:1)',
            value: '142',
            detail: '1:1-Anfragen',
            trend: { value: '~ 9%', tone: 'blue' },
            icon: RequestsIcon,
        },
        {
            key: 'liveChat',
            label: 'Live-Chat',
            title: 'Live-Chat',
            value: '96',
            detail: 'Live-Chat-Anfragen',
            trend: { value: '~ 13%', tone: 'blue' },
            icon: RequestsIcon,
        },
        {
            key: 'groups',
            label: 'Gruppen',
            title: 'Gruppen',
            value: '74',
            detail: 'Gruppen-Anfragen',
            trend: { value: '~ 6%', tone: 'red' },
            icon: RequestsIcon,
        },
        {
            key: 'cases',
            label: 'Anzahl Beratungsfälle',
            title: 'Beratungsfälle',
            value: '1.520',
            detail: 'Diese Woche',
            trend: { value: '~ 11%', tone: 'blue' },
            icon: ConversationsIcon,
            iconTone: 'muted',
        },
        {
            key: 'conversationsTotal',
            label: 'Gespräche insgesamt',
            title: 'Gespräche insgesamt',
            value: '168',
            trend: { value: '~ 14%', tone: 'blue' },
            icon: ConversationsIcon,
        },
        {
            key: 'textMessagesTotal',
            label: 'Textnachrichten',
            title: 'Textnachrichten',
            value: '142',
            trend: { value: '~ 18%', tone: 'blue' },
            icon: TextMessagesIcon,
            iconTone: 'muted',
        },
        {
            key: 'messagesSeekers',
            label: 'Anzahl Nachrichten Ratsuchende',
            title: 'Nachrichten Ratsuchende',
            value: '2.480',
            detail: 'Diese Woche',
            trend: { value: '~ 10%', tone: 'blue' },
            icon: TextMessagesIcon,
            iconTone: 'muted',
        },
        {
            key: 'messagesCounselors',
            label: 'Anzahl Nachrichten Beratende',
            title: 'Nachrichten Beratende',
            value: '2.035',
            detail: 'Diese Woche',
            trend: { value: '~ 7%', tone: 'blue' },
            icon: TextMessagesIcon,
            iconTone: 'muted',
        },
        {
            key: 'phoneShare',
            label: 'Anruf-Anteil',
            title: 'Anrufe',
            value: '21%',
            trend: { value: '~ 6%', tone: 'blue' },
            icon: PhoneCallsIcon,
            iconTone: 'coral',
        },
        {
            key: 'videoShare',
            label: 'Videoanruf-Anteil',
            title: 'Videoanrufe',
            value: '8%',
            trend: { value: '~ 28%', tone: 'dark' },
            icon: VideoCallsIcon,
            iconTone: 'danger',
        },
        {
            key: 'videoCallCount',
            label: 'Anzahl Videoanrufe',
            title: 'Anzahl Videoanrufe',
            value: '48',
            detail: 'Diese Woche',
            trend: { value: '~ 16%', tone: 'blue' },
            icon: VideoCallsIcon,
            iconTone: 'danger',
        },
        {
            key: 'voiceShare',
            label: 'Sprachnachrichten',
            title: 'Sprachnachrichten',
            value: '19%',
            trend: { value: '~ 11%', tone: 'blue' },
            icon: VoiceMessagesIcon,
            iconTone: 'coral',
        },
        {
            key: 'activeAgencies',
            label: 'Beratungsstellen',
            title: 'aktive Beratungsstellen',
            value: '43',
            detail: 'Durchschnitt pro Monat',
            trend: { value: '~ 8%', tone: 'blue' },
            icon: ActiveAgenciesIcon,
        },
        {
            key: 'counselors',
            label: 'aktive Beratende',
            title: 'aktive Beratende',
            value: '186',
            detail: 'Durchschnitt pro Monat',
            trend: { value: '~ 7%', tone: 'blue' },
            icon: ActiveAgenciesIcon,
        },
        {
            key: 'messagesPerSession',
            label: 'Ø Nachrichten/Gespräch',
            title: 'Nachrichten pro Gespräch',
            value: '6,9',
            detail: 'Durchschnitt pro Gespräch',
            trend: { value: '~ 5%', tone: 'blue' },
            icon: TextMessagesIcon,
            iconTone: 'muted',
        },
        {
            key: 'activeConversations',
            label: 'aktive Gespräche',
            title: 'aktive Gespräche',
            value: '211',
            detail: 'heute aktiv',
            trend: { value: '~ 3%', tone: 'blue' },
            icon: ConversationsIcon,
            iconTone: 'muted',
        },
        {
            key: 'topTopic',
            label: 'Häufigstes Thema',
            title: 'Häufigstes Thema',
            value: 'U25',
            detail: 'Dieser Monat',
            trend: { value: '~ 41%', tone: 'dark' },
            icon: TopicIcon,
        },
        {
            key: 'previousMonth',
            label: 'Thema letzter Monat',
            title: 'Häufigstes Thema',
            value: 'Schulden',
            detail: 'Letzter Monat',
            trend: { value: '~ 35%', tone: 'dark' },
            icon: TopicIcon,
        },
        {
            key: 'twoMonthsAgo',
            label: 'Thema vor 2 Monaten',
            title: 'Häufigstes Thema',
            value: 'Familie',
            detail: 'Vor 2 Monaten',
            trend: { value: '~ 29%', tone: 'dark' },
            icon: TopicIcon,
        },
        {
            key: 'threeMonthsAgo',
            label: 'Thema vor 3 Monaten',
            title: 'Häufigstes Thema',
            value: 'Sucht',
            detail: 'Vor 3 Monaten',
            trend: { value: '~ 22%', tone: 'dark' },
            icon: TopicIcon,
        },
    ],
    agency: [
        {
            key: 'all',
            label: 'Anfragen gesamt',
            title: 'Anfragen gesamt',
            value: '96',
            detail: 'Vormonat gesamt 112',
            trend: { value: '~ 7%', tone: 'red' },
            icon: RequestsIcon,
        },
        {
            key: 'oneToOne',
            label: 'Nähe (1:1)',
            title: 'Nähe (1:1)',
            value: '42',
            detail: '1:1-Anfragen',
            trend: { value: '~ 6%', tone: 'blue' },
            icon: RequestsIcon,
        },
        {
            key: 'liveChat',
            label: 'Live-Chat',
            title: 'Live-Chat',
            value: '31',
            detail: 'Live-Chat-Anfragen',
            trend: { value: '~ 4%', tone: 'blue' },
            icon: RequestsIcon,
        },
        {
            key: 'groups',
            label: 'Gruppen',
            title: 'Gruppen',
            value: '23',
            detail: 'Gruppen-Anfragen',
            trend: { value: '~ 3%', tone: 'red' },
            icon: RequestsIcon,
        },
        {
            key: 'cases',
            label: 'Anzahl Beratungsfälle',
            title: 'Beratungsfälle',
            value: '620',
            detail: 'Diese Woche',
            trend: { value: '~ 8%', tone: 'blue' },
            icon: ConversationsIcon,
            iconTone: 'muted',
        },
        {
            key: 'conversationsTotal',
            label: 'Gespräche insgesamt',
            title: 'Gespräche insgesamt',
            value: '74',
            trend: { value: '~ 9%', tone: 'blue' },
            icon: ConversationsIcon,
        },
        {
            key: 'textMessagesTotal',
            label: 'Textnachrichten',
            title: 'Textnachrichten',
            value: '58',
            trend: { value: '~ 13%', tone: 'blue' },
            icon: TextMessagesIcon,
            iconTone: 'muted',
        },
        {
            key: 'messagesSeekers',
            label: 'Anzahl Nachrichten Ratsuchende',
            title: 'Nachrichten Ratsuchende',
            value: '940',
            detail: 'Diese Woche',
            trend: { value: '~ 7%', tone: 'blue' },
            icon: TextMessagesIcon,
            iconTone: 'muted',
        },
        {
            key: 'messagesCounselors',
            label: 'Anzahl Nachrichten Beratende',
            title: 'Nachrichten Beratende',
            value: '820',
            detail: 'Diese Woche',
            trend: { value: '~ 5%', tone: 'blue' },
            icon: TextMessagesIcon,
            iconTone: 'muted',
        },
        {
            key: 'phoneShare',
            label: 'Anruf-Anteil',
            title: 'Anrufe',
            value: '18%',
            trend: { value: '~ 2%', tone: 'blue' },
            icon: PhoneCallsIcon,
            iconTone: 'coral',
        },
        {
            key: 'videoShare',
            label: 'Videoanruf-Anteil',
            title: 'Videoanrufe',
            value: '11%',
            trend: { value: '~ 19%', tone: 'dark' },
            icon: VideoCallsIcon,
            iconTone: 'danger',
        },
        {
            key: 'videoCallCount',
            label: 'Anzahl Videoanrufe',
            title: 'Anzahl Videoanrufe',
            value: '18',
            detail: 'Diese Woche',
            trend: { value: '~ 9%', tone: 'blue' },
            icon: VideoCallsIcon,
            iconTone: 'danger',
        },
        {
            key: 'voiceShare',
            label: 'Sprachnachrichten',
            title: 'Sprachnachrichten',
            value: '16%',
            trend: { value: '~ 6%', tone: 'blue' },
            icon: VoiceMessagesIcon,
            iconTone: 'coral',
        },
        {
            key: 'activeCounselors',
            label: 'aktive Beratende',
            title: 'aktive Beratende',
            value: '18',
            detail: 'Durchschnitt pro Monat',
            trend: { value: '~ 3%', tone: 'blue' },
            icon: ActiveAgenciesIcon,
        },
        {
            key: 'counselors',
            label: 'Beratende im Dienst',
            title: 'Beratende im Dienst',
            value: '12',
            detail: 'heute aktiv',
            trend: { value: '~ 2%', tone: 'blue' },
            icon: ActiveAgenciesIcon,
        },
        {
            key: 'messagesPerSession',
            label: 'Ø Nachrichten/Gespräch',
            title: 'Nachrichten pro Gespräch',
            value: '5,8',
            detail: 'Durchschnitt pro Gespräch',
            trend: { value: '~ 4%', tone: 'blue' },
            icon: TextMessagesIcon,
            iconTone: 'muted',
        },
        {
            key: 'activeConversations',
            label: 'aktive Gespräche',
            title: 'aktive Gespräche',
            value: '93',
            detail: 'heute aktiv',
            trend: { value: '~ 3%', tone: 'blue' },
            icon: ConversationsIcon,
            iconTone: 'muted',
        },
        {
            key: 'topTopic',
            label: 'Häufigstes Thema',
            title: 'Häufigstes Thema',
            value: 'Trennung',
            detail: 'Dieser Monat',
            trend: { value: '~ 34%', tone: 'dark' },
            icon: TopicIcon,
        },
        {
            key: 'previousMonth',
            label: 'Thema letzter Monat',
            title: 'Häufigstes Thema',
            value: 'Schulden',
            detail: 'Letzter Monat',
            trend: { value: '~ 28%', tone: 'dark' },
            icon: TopicIcon,
        },
        {
            key: 'twoMonthsAgo',
            label: 'Thema vor 2 Monaten',
            title: 'Häufigstes Thema',
            value: 'Familie',
            detail: 'Vor 2 Monaten',
            trend: { value: '~ 24%', tone: 'dark' },
            icon: TopicIcon,
        },
        {
            key: 'threeMonthsAgo',
            label: 'Thema vor 3 Monaten',
            title: 'Häufigstes Thema',
            value: 'Wohnen',
            detail: 'Vor 3 Monaten',
            trend: { value: '~ 19%', tone: 'dark' },
            icon: TopicIcon,
        },
    ],
};

const duplicatedCommunicationMetricKeys = new Set<CardMenuKey>([
    'conversationsTotal',
    'textMessagesTotal',
    'phoneShare',
    'videoShare',
    'voiceShare',
]);

const defaultMetricKeyByCardKey: Record<string, CardMenuKey> = {
    'active-agencies': 'activeAgencies',
    'active-counselors': 'activeCounselors',
    conversations: 'conversationsTotal',
    'phone-calls': 'phoneShare',
    requests: 'all',
    'text-messages': 'textMessagesTotal',
    'top-topic': 'topTopic',
    'video-calls': 'videoShare',
    'voice-messages': 'voiceShare',
};

const demoMetricOverridesByScope: Record<ScopeKey, Partial<Record<CardMenuKey, Partial<CardMenuOption>>>> = {
    platform: {
        activeAgencies: { value: '3' },
        activeConversations: { value: '4' },
        all: { value: '9', detail: 'Vormonat gesamt 11' },
        cases: { value: '8' },
        conversationsTotal: { value: '7' },
        counselors: { value: '6' },
        groups: { value: '2' },
        liveChat: { value: '3' },
        messagesCounselors: { value: '5' },
        messagesPerSession: { value: '2,6' },
        messagesSeekers: { value: '13' },
        oneToOne: { value: '4' },
        textMessagesTotal: { value: '18' },
        videoCallCount: { value: '1' },
    },
    tenant: {
        activeAgencies: { value: '2' },
        activeConversations: { value: '3' },
        all: { value: '5', detail: 'Vormonat gesamt 6' },
        cases: { value: '5' },
        conversationsTotal: { value: '5' },
        counselors: { value: '4' },
        groups: { value: '1' },
        liveChat: { value: '2' },
        messagesCounselors: { value: '4' },
        messagesPerSession: { value: '2,4' },
        messagesSeekers: { value: '8' },
        oneToOne: { value: '2' },
        textMessagesTotal: { value: '12' },
        videoCallCount: { value: '0' },
    },
    agency: {
        activeCounselors: { value: '2' },
        activeConversations: { value: '2' },
        all: { value: '3', detail: 'Vormonat gesamt 4' },
        cases: { value: '3' },
        conversationsTotal: { value: '3' },
        counselors: { value: '2' },
        groups: { value: '1' },
        liveChat: { value: '1' },
        messagesCounselors: { value: '2' },
        messagesPerSession: { value: '2,3' },
        messagesSeekers: { value: '5' },
        oneToOne: { value: '1' },
        textMessagesTotal: { value: '7' },
        videoCallCount: { value: '0' },
    },
};

const caseChartDateLabelsByPeriod: Record<CasePeriodKey, string[]> = {
    thisWeek: ['Mo, 9 Jul', 'Di, 10 Jul', 'Mi, 11 Jul', 'Do, 12 Jul', 'Fr, 13 Jul', 'Sa, 14 Jul', 'So, 15 Jul'],
    lastWeek: ['Mo, 2 Jul', 'Di, 3 Jul', 'Mi, 4 Jul', 'Do, 5 Jul', 'Fr, 6 Jul', 'Sa, 7 Jul', 'So, 8 Jul'],
    twoWeeksAgo: ['Mo, 25 Jun', 'Di, 26 Jun', 'Mi, 27 Jun', 'Do, 28 Jun', 'Fr, 29 Jun', 'Sa, 30 Jun', 'So, 1 Jul'],
    threeWeeksAgo: ['Mo, 18 Jun', 'Di, 19 Jun', 'Mi, 20 Jun', 'Do, 21 Jun', 'Fr, 22 Jun', 'Sa, 23 Jun', 'So, 24 Jun'],
    fourWeeksAgo: ['Mo, 11 Jun', 'Di, 12 Jun', 'Mi, 13 Jun', 'Do, 14 Jun', 'Fr, 15 Jun', 'Sa, 16 Jun', 'So, 17 Jun'],
};

const caseChartDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

const createDemoCaseChart = (period: CasePeriodKey, values: number[]): CaseChartBar[] =>
    caseChartDays.map((day, index) => ({
        day,
        dateLabel: caseChartDateLabelsByPeriod[period][index],
        value: values[index],
        isDefaultSelected: day === 'Do',
    }));

const demoCaseChartsByScope: Record<ScopeKey, Record<CasePeriodKey, CaseChartBar[]>> = {
    platform: {
        thisWeek: createDemoCaseChart('thisWeek', [1, 2, 1, 4, 3, 1, 0]),
        lastWeek: createDemoCaseChart('lastWeek', [0, 1, 2, 3, 2, 1, 0]),
        twoWeeksAgo: createDemoCaseChart('twoWeeksAgo', [1, 1, 1, 2, 2, 0, 0]),
        threeWeeksAgo: createDemoCaseChart('threeWeeksAgo', [0, 1, 1, 2, 1, 0, 0]),
        fourWeeksAgo: createDemoCaseChart('fourWeeksAgo', [0, 1, 0, 1, 1, 0, 0]),
    },
    tenant: {
        thisWeek: createDemoCaseChart('thisWeek', [0, 1, 1, 3, 1, 0, 0]),
        lastWeek: createDemoCaseChart('lastWeek', [0, 1, 0, 2, 1, 0, 0]),
        twoWeeksAgo: createDemoCaseChart('twoWeeksAgo', [0, 0, 1, 2, 0, 0, 0]),
        threeWeeksAgo: createDemoCaseChart('threeWeeksAgo', [0, 1, 0, 1, 1, 0, 0]),
        fourWeeksAgo: createDemoCaseChart('fourWeeksAgo', [0, 0, 1, 1, 0, 0, 0]),
    },
    agency: {
        thisWeek: createDemoCaseChart('thisWeek', [0, 1, 0, 2, 1, 0, 0]),
        lastWeek: createDemoCaseChart('lastWeek', [0, 0, 1, 1, 1, 0, 0]),
        twoWeeksAgo: createDemoCaseChart('twoWeeksAgo', [0, 1, 0, 1, 0, 0, 0]),
        threeWeeksAgo: createDemoCaseChart('threeWeeksAgo', [0, 0, 0, 1, 1, 0, 0]),
        fourWeeksAgo: createDemoCaseChart('fourWeeksAgo', [0, 0, 1, 0, 1, 0, 0]),
    },
};

const demoConversationByScope: Record<ScopeKey, Record<ConversationPeriodKey, ConversationPeriodData>> = {
    platform: {
        today: createConversationData([1, 2, 0, 0]),
        yesterday: createConversationData([1, 1, 1, 0]),
        thisWeek: createConversationData([2, 5, 3, 0]),
        total: createConversationData([7, 14, 11, 0]),
        thisYear: createConversationData([4, 11, 8, 0]),
        lastYear: createConversationData([5, 9, 6, 1]),
    },
    tenant: {
        today: createConversationData([1, 1, 1, 0]),
        yesterday: createConversationData([0, 2, 1, 0]),
        thisWeek: createConversationData([3, 5, 2, 0]),
        total: createConversationData([6, 10, 8, 1]),
        thisYear: createConversationData([4, 8, 6, 0]),
        lastYear: createConversationData([5, 7, 4, 1]),
    },
    agency: {
        today: createConversationData([1, 1, 0, 0]),
        yesterday: createConversationData([1, 0, 1, 0]),
        thisWeek: createConversationData([2, 2, 1, 0]),
        total: createConversationData([3, 4, 3, 0]),
        thisYear: createConversationData([2, 3, 2, 0]),
        lastYear: createConversationData([3, 2, 1, 0]),
    },
};

const applyDemoMetricOverride = <Metric extends StatisticCardDefinition | CardMenuOption>(
    metric: Metric,
    activeScope: ScopeKey,
    metricKey?: CardMenuKey,
): Metric => {
    if (!metricKey) {
        return metric;
    }

    const override = demoMetricOverridesByScope[activeScope][metricKey];

    return override ? { ...metric, ...override } : metric;
};

const getDisplayMetricCard = (card: StatisticCardDefinition, activeScope: ScopeKey) =>
    applyDemoMetricOverride(card, activeScope, defaultMetricKeyByCardKey[card.key]);

const getPersonalizedMetricCard = (card: StatisticCardDefinition, activeScope: ScopeKey): StatisticCardDefinition => {
    const displayCard = getDisplayMetricCard(card, activeScope);

    return {
        ...displayCard,
        defaultMenuKey: defaultMetricKeyByCardKey[card.key],
        menuAriaLabel: 'Kennzahl in diesem Dashboard-Slot auswählen',
        menuLabel: 'Meine Kennzahl',
        menuOptions: dashboardMetricOptionsByScope[activeScope]
            .filter((option) => !duplicatedCommunicationMetricKeys.has(option.key))
            .map((option) => applyDemoMetricOverride(option, activeScope, option.key)),
    };
};

const dashboardByScope: Record<ScopeKey, ScopeDashboard> = {
    platform: {
        topCards: [
            {
                key: 'requests',
                title: 'Anfragen',
                value: '870',
                detail: 'Vormonat gesamt 1.050',
                trend: { value: '~ 20%', tone: 'red' },
                icon: RequestsIcon,
                menuOptions: [
                    {
                        key: 'all',
                        label: 'Alle Chattypen',
                        value: '870',
                        detail: 'Vormonat gesamt 1.050',
                        trend: { value: '~ 20%', tone: 'red' },
                    },
                    {
                        key: 'oneToOne',
                        label: 'Nähe (1:1)',
                        value: '420',
                        detail: 'Nähe / 1:1-Anfragen',
                        trend: { value: '~ 18%', tone: 'blue' },
                    },
                    {
                        key: 'liveChat',
                        label: 'Live-Chat',
                        value: '250',
                        detail: 'Live-Chat-Anfragen',
                        trend: { value: '~ 11%', tone: 'blue' },
                    },
                    {
                        key: 'groups',
                        label: 'Gruppen',
                        value: '200',
                        detail: 'Gruppen-Anfragen',
                        trend: { value: '~ 9%', tone: 'red' },
                    },
                ],
                size: 'large',
            },
            {
                key: 'active-agencies',
                title: 'aktive Beratungsstellen',
                value: '320',
                detail: 'Durchschnitt pro Monat',
                trend: { value: '~ 20%', tone: 'blue' },
                icon: ActiveAgenciesIcon,
                menuLabel: 'Meine Kennzahl',
                menuAriaLabel: 'Persönliche Kennzahl auswählen',
                menuOptions: [
                    {
                        key: 'all',
                        label: 'Beratungsstellen',
                        title: 'aktive Beratungsstellen',
                        value: '320',
                        detail: 'Durchschnitt pro Monat',
                        trend: { value: '~ 20%', tone: 'blue' },
                        icon: ActiveAgenciesIcon,
                    },
                    {
                        key: 'consultations',
                        label: 'Beratungsgespräche',
                        title: 'Beratungsgespräche',
                        value: '3.150',
                        detail: 'Diese Woche',
                        trend: { value: '~ 18%', tone: 'blue' },
                        icon: ConversationsIcon,
                        iconTone: 'muted',
                    },
                    {
                        key: 'counselors',
                        label: 'aktive Beratende',
                        title: 'aktive Beratende',
                        value: '1.240',
                        detail: 'Durchschnitt pro Monat',
                        trend: { value: '~ 12%', tone: 'blue' },
                        icon: ActiveAgenciesIcon,
                    },
                    {
                        key: 'messagesPerSession',
                        label: 'Ø Nachrichten/Gespräch',
                        title: 'Nachrichten pro Gespräch',
                        value: '8,4',
                        detail: 'Durchschnitt pro Gespräch',
                        trend: { value: '~ 6%', tone: 'blue' },
                        icon: TextMessagesIcon,
                        iconTone: 'muted',
                    },
                    {
                        key: 'activeConversations',
                        label: 'aktive Gespräche',
                        title: 'aktive Gespräche',
                        value: '555',
                        detail: 'heute aktiv',
                        trend: { value: '~ 4%', tone: 'blue' },
                        icon: ConversationsIcon,
                        iconTone: 'muted',
                    },
                ],
                size: 'large',
            },
            {
                key: 'top-topic',
                title: 'Häufigstes Thema',
                value: 'Schulden',
                trend: { value: '~ 59%', tone: 'dark' },
                icon: TopicIcon,
                menuLabel: 'Zeitraum',
                menuAriaLabel: 'Häufigstes Thema nach Zeitraum filtern',
                menuOptions: [
                    {
                        key: 'all',
                        label: 'Dieser Monat',
                        value: 'Schulden',
                        detail: 'Dieser Monat',
                        trend: { value: '~ 59%', tone: 'dark' },
                    },
                    {
                        key: 'previousMonth',
                        label: 'Letzter Monat',
                        value: 'Wohnen',
                        detail: 'Letzter Monat',
                        trend: { value: '~ 44%', tone: 'dark' },
                    },
                    {
                        key: 'twoMonthsAgo',
                        label: 'Vor 2 Monaten',
                        value: 'Trennung',
                        detail: 'Vor 2 Monaten',
                        trend: { value: '~ 31%', tone: 'dark' },
                    },
                    {
                        key: 'threeMonthsAgo',
                        label: 'Vor 3 Monaten',
                        value: 'Sucht',
                        detail: 'Vor 3 Monaten',
                        trend: { value: '~ 27%', tone: 'dark' },
                    },
                ],
                size: 'large',
            },
        ],
        communicationCards: [
            {
                key: 'conversations',
                title: 'Gespräche insgesamt',
                value: '420',
                trend: { value: '~ 20%', tone: 'blue' },
                icon: ConversationsIcon,
                size: 'medium',
            },
            {
                key: 'text-messages',
                title: 'Textnachrichten',
                value: '320',
                trend: { value: '~ 26%', tone: 'red' },
                icon: TextMessagesIcon,
                iconTone: 'muted',
                size: 'small',
            },
            {
                key: 'phone-calls',
                title: 'Anrufe',
                value: '15%',
                trend: { value: '~ 4%', tone: 'blue' },
                icon: PhoneCallsIcon,
                iconTone: 'coral',
                size: 'small',
            },
            {
                key: 'video-calls',
                title: 'Videoanrufe',
                value: '4%',
                trend: { value: '~ 67%', tone: 'dark' },
                icon: VideoCallsIcon,
                iconTone: 'danger',
                size: 'small',
            },
            {
                key: 'voice-messages',
                title: 'Sprachnachrichten',
                value: '32%',
                trend: { value: '~ 20%', tone: 'blue' },
                icon: VoiceMessagesIcon,
                iconTone: 'coral',
                size: 'small',
            },
        ],
        caseCharts: {
            thisWeek: [
                { day: 'Mo', dateLabel: 'Mo, 9 Jul', value: 1900 },
                { day: 'Di', dateLabel: 'Di, 10 Jul', value: 2250 },
                { day: 'Mi', dateLabel: 'Mi, 11 Jul', value: 2250 },
                { day: 'Do', dateLabel: 'Do, 12 Jul', value: 3150, isDefaultSelected: true },
                { day: 'Fr', dateLabel: 'Fr, 13 Jul', value: 2250 },
                { day: 'Sa', dateLabel: 'Sa, 14 Jul', value: 2250 },
                { day: 'So', dateLabel: 'So, 15 Jul', value: 2250 },
            ],
            lastWeek: [
                { day: 'Mo', dateLabel: 'Mo, 2 Jul', value: 1680 },
                { day: 'Di', dateLabel: 'Di, 3 Jul', value: 2040 },
                { day: 'Mi', dateLabel: 'Mi, 4 Jul', value: 2180 },
                { day: 'Do', dateLabel: 'Do, 5 Jul', value: 2460, isDefaultSelected: true },
                { day: 'Fr', dateLabel: 'Fr, 6 Jul', value: 2360 },
                { day: 'Sa', dateLabel: 'Sa, 7 Jul', value: 1880 },
                { day: 'So', dateLabel: 'So, 8 Jul', value: 1720 },
            ],
            twoWeeksAgo: [
                { day: 'Mo', dateLabel: 'Mo, 25 Jun', value: 1420 },
                { day: 'Di', dateLabel: 'Di, 26 Jun', value: 1780 },
                { day: 'Mi', dateLabel: 'Mi, 27 Jun', value: 1960 },
                { day: 'Do', dateLabel: 'Do, 28 Jun', value: 2210, isDefaultSelected: true },
                { day: 'Fr', dateLabel: 'Fr, 29 Jun', value: 2060 },
                { day: 'Sa', dateLabel: 'Sa, 30 Jun', value: 1640 },
                { day: 'So', dateLabel: 'So, 1 Jul', value: 1510 },
            ],
            threeWeeksAgo: [
                { day: 'Mo', dateLabel: 'Mo, 18 Jun', value: 1320 },
                { day: 'Di', dateLabel: 'Di, 19 Jun', value: 1650 },
                { day: 'Mi', dateLabel: 'Mi, 20 Jun', value: 1840 },
                { day: 'Do', dateLabel: 'Do, 21 Jun', value: 2080, isDefaultSelected: true },
                { day: 'Fr', dateLabel: 'Fr, 22 Jun', value: 1920 },
                { day: 'Sa', dateLabel: 'Sa, 23 Jun', value: 1520 },
                { day: 'So', dateLabel: 'So, 24 Jun', value: 1390 },
            ],
            fourWeeksAgo: [
                { day: 'Mo', dateLabel: 'Mo, 11 Jun', value: 1210 },
                { day: 'Di', dateLabel: 'Di, 12 Jun', value: 1540 },
                { day: 'Mi', dateLabel: 'Mi, 13 Jun', value: 1710 },
                { day: 'Do', dateLabel: 'Do, 14 Jun', value: 1940, isDefaultSelected: true },
                { day: 'Fr', dateLabel: 'Fr, 15 Jun', value: 1810 },
                { day: 'Sa', dateLabel: 'Sa, 16 Jun', value: 1430 },
                { day: 'So', dateLabel: 'So, 17 Jun', value: 1280 },
            ],
        },
        conversation: {
            today: {
                total: '555',
                segments: createConversationSegments([278, 137, 58, 82]),
            },
            yesterday: {
                total: '486',
                segments: createConversationSegments([218, 129, 76, 63]),
            },
            thisWeek: {
                total: '3.248',
                segments: createConversationSegments([1498, 812, 346, 592]),
            },
            total: {
                total: '42.680',
                segments: createConversationSegments([19840, 10860, 4710, 7270]),
            },
            thisYear: {
                total: '18.420',
                segments: createConversationSegments([8420, 4690, 2130, 3180]),
            },
            lastYear: {
                total: '31.860',
                segments: createConversationSegments([14920, 8120, 3460, 5360]),
            },
        },
    },
    tenant: {
        topCards: [
            {
                key: 'requests',
                title: 'Anfragen',
                value: '312',
                detail: 'Vormonat gesamt 386',
                trend: { value: '~ 12%', tone: 'blue' },
                icon: RequestsIcon,
                menuOptions: [
                    {
                        key: 'all',
                        label: 'Alle Chattypen',
                        value: '312',
                        detail: 'Vormonat gesamt 386',
                        trend: { value: '~ 12%', tone: 'blue' },
                    },
                    {
                        key: 'oneToOne',
                        label: 'Nähe (1:1)',
                        value: '142',
                        detail: 'Nähe / 1:1-Anfragen',
                        trend: { value: '~ 9%', tone: 'blue' },
                    },
                    {
                        key: 'liveChat',
                        label: 'Live-Chat',
                        value: '96',
                        detail: 'Live-Chat-Anfragen',
                        trend: { value: '~ 13%', tone: 'blue' },
                    },
                    {
                        key: 'groups',
                        label: 'Gruppen',
                        value: '74',
                        detail: 'Gruppen-Anfragen',
                        trend: { value: '~ 6%', tone: 'red' },
                    },
                ],
                size: 'large',
            },
            {
                key: 'active-agencies',
                title: 'aktive Beratungsstellen',
                value: '43',
                detail: 'Durchschnitt pro Monat',
                trend: { value: '~ 8%', tone: 'blue' },
                icon: ActiveAgenciesIcon,
                menuLabel: 'Meine Kennzahl',
                menuAriaLabel: 'Persönliche Kennzahl auswählen',
                menuOptions: [
                    {
                        key: 'all',
                        label: 'Beratungsstellen',
                        title: 'aktive Beratungsstellen',
                        value: '43',
                        detail: 'Durchschnitt pro Monat',
                        trend: { value: '~ 8%', tone: 'blue' },
                        icon: ActiveAgenciesIcon,
                    },
                    {
                        key: 'consultations',
                        label: 'Beratungsgespräche',
                        title: 'Beratungsgespräche',
                        value: '1.520',
                        detail: 'Diese Woche',
                        trend: { value: '~ 11%', tone: 'blue' },
                        icon: ConversationsIcon,
                        iconTone: 'muted',
                    },
                    {
                        key: 'counselors',
                        label: 'aktive Beratende',
                        title: 'aktive Beratende',
                        value: '186',
                        detail: 'Durchschnitt pro Monat',
                        trend: { value: '~ 7%', tone: 'blue' },
                        icon: ActiveAgenciesIcon,
                    },
                    {
                        key: 'messagesPerSession',
                        label: 'Ø Nachrichten/Gespräch',
                        title: 'Nachrichten pro Gespräch',
                        value: '6,9',
                        detail: 'Durchschnitt pro Gespräch',
                        trend: { value: '~ 5%', tone: 'blue' },
                        icon: TextMessagesIcon,
                        iconTone: 'muted',
                    },
                    {
                        key: 'activeConversations',
                        label: 'aktive Gespräche',
                        title: 'aktive Gespräche',
                        value: '211',
                        detail: 'heute aktiv',
                        trend: { value: '~ 3%', tone: 'blue' },
                        icon: ConversationsIcon,
                        iconTone: 'muted',
                    },
                ],
                size: 'large',
            },
            {
                key: 'top-topic',
                title: 'Häufigstes Thema',
                value: 'U25',
                trend: { value: '~ 41%', tone: 'dark' },
                icon: TopicIcon,
                menuLabel: 'Zeitraum',
                menuAriaLabel: 'Häufigstes Thema nach Zeitraum filtern',
                menuOptions: [
                    {
                        key: 'all',
                        label: 'Dieser Monat',
                        value: 'U25',
                        detail: 'Dieser Monat',
                        trend: { value: '~ 41%', tone: 'dark' },
                    },
                    {
                        key: 'previousMonth',
                        label: 'Letzter Monat',
                        value: 'Schulden',
                        detail: 'Letzter Monat',
                        trend: { value: '~ 35%', tone: 'dark' },
                    },
                    {
                        key: 'twoMonthsAgo',
                        label: 'Vor 2 Monaten',
                        value: 'Familie',
                        detail: 'Vor 2 Monaten',
                        trend: { value: '~ 29%', tone: 'dark' },
                    },
                    {
                        key: 'threeMonthsAgo',
                        label: 'Vor 3 Monaten',
                        value: 'Sucht',
                        detail: 'Vor 3 Monaten',
                        trend: { value: '~ 22%', tone: 'dark' },
                    },
                ],
                size: 'large',
            },
        ],
        communicationCards: [
            {
                key: 'conversations',
                title: 'Gespräche insgesamt',
                value: '168',
                trend: { value: '~ 14%', tone: 'blue' },
                icon: ConversationsIcon,
                size: 'medium',
            },
            {
                key: 'text-messages',
                title: 'Textnachrichten',
                value: '142',
                trend: { value: '~ 18%', tone: 'blue' },
                icon: TextMessagesIcon,
                iconTone: 'muted',
                size: 'small',
            },
            {
                key: 'phone-calls',
                title: 'Anrufe',
                value: '21%',
                trend: { value: '~ 6%', tone: 'blue' },
                icon: PhoneCallsIcon,
                iconTone: 'coral',
                size: 'small',
            },
            {
                key: 'video-calls',
                title: 'Videoanrufe',
                value: '8%',
                trend: { value: '~ 28%', tone: 'dark' },
                icon: VideoCallsIcon,
                iconTone: 'danger',
                size: 'small',
            },
            {
                key: 'voice-messages',
                title: 'Sprachnachrichten',
                value: '19%',
                trend: { value: '~ 11%', tone: 'blue' },
                icon: VoiceMessagesIcon,
                iconTone: 'coral',
                size: 'small',
            },
        ],
        caseCharts: {
            thisWeek: [
                { day: 'Mo', dateLabel: 'Mo, 9 Jul', value: 820 },
                { day: 'Di', dateLabel: 'Di, 10 Jul', value: 1180 },
                { day: 'Mi', dateLabel: 'Mi, 11 Jul', value: 960 },
                { day: 'Do', dateLabel: 'Do, 12 Jul', value: 1520, isDefaultSelected: true },
                { day: 'Fr', dateLabel: 'Fr, 13 Jul', value: 1220 },
                { day: 'Sa', dateLabel: 'Sa, 14 Jul', value: 870 },
                { day: 'So', dateLabel: 'So, 15 Jul', value: 760 },
            ],
            lastWeek: [
                { day: 'Mo', dateLabel: 'Mo, 2 Jul', value: 690 },
                { day: 'Di', dateLabel: 'Di, 3 Jul', value: 1040 },
                { day: 'Mi', dateLabel: 'Mi, 4 Jul', value: 910 },
                { day: 'Do', dateLabel: 'Do, 5 Jul', value: 1280, isDefaultSelected: true },
                { day: 'Fr', dateLabel: 'Fr, 6 Jul', value: 1160 },
                { day: 'Sa', dateLabel: 'Sa, 7 Jul', value: 820 },
                { day: 'So', dateLabel: 'So, 8 Jul', value: 710 },
            ],
            twoWeeksAgo: [
                { day: 'Mo', dateLabel: 'Mo, 25 Jun', value: 610 },
                { day: 'Di', dateLabel: 'Di, 26 Jun', value: 880 },
                { day: 'Mi', dateLabel: 'Mi, 27 Jun', value: 830 },
                { day: 'Do', dateLabel: 'Do, 28 Jun', value: 1090, isDefaultSelected: true },
                { day: 'Fr', dateLabel: 'Fr, 29 Jun', value: 970 },
                { day: 'Sa', dateLabel: 'Sa, 30 Jun', value: 690 },
                { day: 'So', dateLabel: 'So, 1 Jul', value: 640 },
            ],
            threeWeeksAgo: [
                { day: 'Mo', dateLabel: 'Mo, 18 Jun', value: 560 },
                { day: 'Di', dateLabel: 'Di, 19 Jun', value: 820 },
                { day: 'Mi', dateLabel: 'Mi, 20 Jun', value: 760 },
                { day: 'Do', dateLabel: 'Do, 21 Jun', value: 1010, isDefaultSelected: true },
                { day: 'Fr', dateLabel: 'Fr, 22 Jun', value: 900 },
                { day: 'Sa', dateLabel: 'Sa, 23 Jun', value: 650 },
                { day: 'So', dateLabel: 'So, 24 Jun', value: 590 },
            ],
            fourWeeksAgo: [
                { day: 'Mo', dateLabel: 'Mo, 11 Jun', value: 520 },
                { day: 'Di', dateLabel: 'Di, 12 Jun', value: 760 },
                { day: 'Mi', dateLabel: 'Mi, 13 Jun', value: 710 },
                { day: 'Do', dateLabel: 'Do, 14 Jun', value: 940, isDefaultSelected: true },
                { day: 'Fr', dateLabel: 'Fr, 15 Jun', value: 840 },
                { day: 'Sa', dateLabel: 'Sa, 16 Jun', value: 610 },
                { day: 'So', dateLabel: 'So, 17 Jun', value: 550 },
            ],
        },
        conversation: {
            today: {
                total: '211',
                segments: createConversationSegments([96, 58, 24, 33]),
            },
            yesterday: {
                total: '184',
                segments: createConversationSegments([78, 52, 28, 26]),
            },
            thisWeek: {
                total: '1.238',
                segments: createConversationSegments([548, 326, 151, 213]),
            },
            total: {
                total: '14.890',
                segments: createConversationSegments([6520, 3980, 1840, 2550]),
            },
            thisYear: {
                total: '6.940',
                segments: createConversationSegments([3010, 1840, 870, 1220]),
            },
            lastYear: {
                total: '11.420',
                segments: createConversationSegments([4980, 3020, 1410, 2010]),
            },
        },
    },
    agency: {
        topCards: [
            {
                key: 'requests',
                title: 'Anfragen',
                value: '96',
                detail: 'Vormonat gesamt 112',
                trend: { value: '~ 7%', tone: 'red' },
                icon: RequestsIcon,
                menuOptions: [
                    {
                        key: 'all',
                        label: 'Alle Chattypen',
                        value: '96',
                        detail: 'Vormonat gesamt 112',
                        trend: { value: '~ 7%', tone: 'red' },
                    },
                    {
                        key: 'oneToOne',
                        label: 'Nähe (1:1)',
                        value: '42',
                        detail: 'Nähe / 1:1-Anfragen',
                        trend: { value: '~ 6%', tone: 'blue' },
                    },
                    {
                        key: 'liveChat',
                        label: 'Live-Chat',
                        value: '31',
                        detail: 'Live-Chat-Anfragen',
                        trend: { value: '~ 4%', tone: 'blue' },
                    },
                    {
                        key: 'groups',
                        label: 'Gruppen',
                        value: '23',
                        detail: 'Gruppen-Anfragen',
                        trend: { value: '~ 3%', tone: 'red' },
                    },
                ],
                size: 'large',
            },
            {
                key: 'active-counselors',
                title: 'aktive Beratende',
                value: '18',
                detail: 'Durchschnitt pro Monat',
                trend: { value: '~ 3%', tone: 'blue' },
                icon: ActiveAgenciesIcon,
                menuLabel: 'Meine Kennzahl',
                menuAriaLabel: 'Persönliche Kennzahl auswählen',
                menuOptions: [
                    {
                        key: 'all',
                        label: 'aktive Beratende',
                        title: 'aktive Beratende',
                        value: '18',
                        detail: 'Durchschnitt pro Monat',
                        trend: { value: '~ 3%', tone: 'blue' },
                        icon: ActiveAgenciesIcon,
                    },
                    {
                        key: 'consultations',
                        label: 'Beratungsgespräche',
                        title: 'Beratungsgespräche',
                        value: '620',
                        detail: 'Diese Woche',
                        trend: { value: '~ 8%', tone: 'blue' },
                        icon: ConversationsIcon,
                        iconTone: 'muted',
                    },
                    {
                        key: 'counselors',
                        label: 'Beratende im Dienst',
                        title: 'Beratende im Dienst',
                        value: '12',
                        detail: 'heute aktiv',
                        trend: { value: '~ 2%', tone: 'blue' },
                        icon: ActiveAgenciesIcon,
                    },
                    {
                        key: 'messagesPerSession',
                        label: 'Ø Nachrichten/Gespräch',
                        title: 'Nachrichten pro Gespräch',
                        value: '5,8',
                        detail: 'Durchschnitt pro Gespräch',
                        trend: { value: '~ 4%', tone: 'blue' },
                        icon: TextMessagesIcon,
                        iconTone: 'muted',
                    },
                    {
                        key: 'activeConversations',
                        label: 'aktive Gespräche',
                        title: 'aktive Gespräche',
                        value: '93',
                        detail: 'heute aktiv',
                        trend: { value: '~ 3%', tone: 'blue' },
                        icon: ConversationsIcon,
                        iconTone: 'muted',
                    },
                ],
                size: 'large',
            },
            {
                key: 'top-topic',
                title: 'Häufigstes Thema',
                value: 'Trennung',
                trend: { value: '~ 34%', tone: 'dark' },
                icon: TopicIcon,
                menuLabel: 'Zeitraum',
                menuAriaLabel: 'Häufigstes Thema nach Zeitraum filtern',
                menuOptions: [
                    {
                        key: 'all',
                        label: 'Dieser Monat',
                        value: 'Trennung',
                        detail: 'Dieser Monat',
                        trend: { value: '~ 34%', tone: 'dark' },
                    },
                    {
                        key: 'previousMonth',
                        label: 'Letzter Monat',
                        value: 'Schulden',
                        detail: 'Letzter Monat',
                        trend: { value: '~ 28%', tone: 'dark' },
                    },
                    {
                        key: 'twoMonthsAgo',
                        label: 'Vor 2 Monaten',
                        value: 'Familie',
                        detail: 'Vor 2 Monaten',
                        trend: { value: '~ 24%', tone: 'dark' },
                    },
                    {
                        key: 'threeMonthsAgo',
                        label: 'Vor 3 Monaten',
                        value: 'Wohnen',
                        detail: 'Vor 3 Monaten',
                        trend: { value: '~ 19%', tone: 'dark' },
                    },
                ],
                size: 'large',
            },
        ],
        communicationCards: [
            {
                key: 'conversations',
                title: 'Gespräche insgesamt',
                value: '74',
                trend: { value: '~ 9%', tone: 'blue' },
                icon: ConversationsIcon,
                size: 'medium',
            },
            {
                key: 'text-messages',
                title: 'Textnachrichten',
                value: '58',
                trend: { value: '~ 13%', tone: 'blue' },
                icon: TextMessagesIcon,
                iconTone: 'muted',
                size: 'small',
            },
            {
                key: 'phone-calls',
                title: 'Anrufe',
                value: '18%',
                trend: { value: '~ 2%', tone: 'blue' },
                icon: PhoneCallsIcon,
                iconTone: 'coral',
                size: 'small',
            },
            {
                key: 'video-calls',
                title: 'Videoanrufe',
                value: '11%',
                trend: { value: '~ 19%', tone: 'dark' },
                icon: VideoCallsIcon,
                iconTone: 'danger',
                size: 'small',
            },
            {
                key: 'voice-messages',
                title: 'Sprachnachrichten',
                value: '16%',
                trend: { value: '~ 6%', tone: 'blue' },
                icon: VoiceMessagesIcon,
                iconTone: 'coral',
                size: 'small',
            },
        ],
        caseCharts: {
            thisWeek: [
                { day: 'Mo', dateLabel: 'Mo, 9 Jul', value: 420 },
                { day: 'Di', dateLabel: 'Di, 10 Jul', value: 520 },
                { day: 'Mi', dateLabel: 'Mi, 11 Jul', value: 470 },
                { day: 'Do', dateLabel: 'Do, 12 Jul', value: 690, isDefaultSelected: true },
                { day: 'Fr', dateLabel: 'Fr, 13 Jul', value: 610 },
                { day: 'Sa', dateLabel: 'Sa, 14 Jul', value: 430 },
                { day: 'So', dateLabel: 'So, 15 Jul', value: 390 },
            ],
            lastWeek: [
                { day: 'Mo', dateLabel: 'Mo, 2 Jul', value: 360 },
                { day: 'Di', dateLabel: 'Di, 3 Jul', value: 480 },
                { day: 'Mi', dateLabel: 'Mi, 4 Jul', value: 430 },
                { day: 'Do', dateLabel: 'Do, 5 Jul', value: 590, isDefaultSelected: true },
                { day: 'Fr', dateLabel: 'Fr, 6 Jul', value: 540 },
                { day: 'Sa', dateLabel: 'Sa, 7 Jul', value: 380 },
                { day: 'So', dateLabel: 'So, 8 Jul', value: 340 },
            ],
            twoWeeksAgo: [
                { day: 'Mo', dateLabel: 'Mo, 25 Jun', value: 310 },
                { day: 'Di', dateLabel: 'Di, 26 Jun', value: 410 },
                { day: 'Mi', dateLabel: 'Mi, 27 Jun', value: 390 },
                { day: 'Do', dateLabel: 'Do, 28 Jun', value: 520, isDefaultSelected: true },
                { day: 'Fr', dateLabel: 'Fr, 29 Jun', value: 470 },
                { day: 'Sa', dateLabel: 'Sa, 30 Jun', value: 330 },
                { day: 'So', dateLabel: 'So, 1 Jul', value: 300 },
            ],
            threeWeeksAgo: [
                { day: 'Mo', dateLabel: 'Mo, 18 Jun', value: 290 },
                { day: 'Di', dateLabel: 'Di, 19 Jun', value: 380 },
                { day: 'Mi', dateLabel: 'Mi, 20 Jun', value: 360 },
                { day: 'Do', dateLabel: 'Do, 21 Jun', value: 480, isDefaultSelected: true },
                { day: 'Fr', dateLabel: 'Fr, 22 Jun', value: 430 },
                { day: 'Sa', dateLabel: 'Sa, 23 Jun', value: 310 },
                { day: 'So', dateLabel: 'So, 24 Jun', value: 280 },
            ],
            fourWeeksAgo: [
                { day: 'Mo', dateLabel: 'Mo, 11 Jun', value: 260 },
                { day: 'Di', dateLabel: 'Di, 12 Jun', value: 350 },
                { day: 'Mi', dateLabel: 'Mi, 13 Jun', value: 330 },
                { day: 'Do', dateLabel: 'Do, 14 Jun', value: 440, isDefaultSelected: true },
                { day: 'Fr', dateLabel: 'Fr, 15 Jun', value: 400 },
                { day: 'Sa', dateLabel: 'Sa, 16 Jun', value: 290 },
                { day: 'So', dateLabel: 'So, 17 Jun', value: 260 },
            ],
        },
        conversation: {
            today: {
                total: '93',
                segments: createConversationSegments([38, 25, 14, 16]),
            },
            yesterday: {
                total: '86',
                segments: createConversationSegments([34, 22, 17, 13]),
            },
            thisWeek: {
                total: '548',
                segments: createConversationSegments([236, 146, 73, 93]),
            },
            total: {
                total: '6.480',
                segments: createConversationSegments([2740, 1740, 860, 1140]),
            },
            thisYear: {
                total: '2.840',
                segments: createConversationSegments([1210, 760, 380, 490]),
            },
            lastYear: {
                total: '4.920',
                segments: createConversationSegments([2070, 1320, 650, 880]),
            },
        },
    },
};

const getCardClassName = (card: StatisticCardDefinition) =>
    `statisticDashboard__metricCard statisticDashboard__metricCard--${card.size}`;

const getTrendClassName = (tone: TrendScoreTone) => `statisticDashboard__trend statisticDashboard__trend--${tone}`;

const getIconClassName = (tone: IconTone = 'plain') =>
    `statisticDashboard__metricIcon statisticDashboard__metricIcon--${tone}`;

const getTrendMagnitude = (value: string) => {
    const match = value.replace(',', '.').match(/-?\d+(\.\d+)?/);

    return match ? Math.abs(Number(match[0])) : 0;
};

const formatTrendValue = (value: string, isNegative: boolean) => {
    const magnitude = getTrendMagnitude(value);
    const formattedMagnitude = Number.isInteger(magnitude) ? `${magnitude}` : magnitude.toFixed(1).replace('.', ',');

    return `${isNegative ? '-' : '+'} ${formattedMagnitude}%`;
};

const getTrendDirection = (trend: TrendBadgeDefinition): TrendDirection => {
    if (trend.direction) {
        return trend.direction;
    }

    const magnitude = getTrendMagnitude(trend.value);
    const isNegative = trend.tone === 'red';

    if (isNegative) {
        return magnitude >= 15 ? 'down' : 'downRight';
    }

    return trend.tone === 'dark' || magnitude >= 15 ? 'up' : 'upRight';
};

const getTrendScoreTone = (trend: TrendBadgeDefinition, direction: TrendDirection): TrendScoreTone => {
    const magnitude = getTrendMagnitude(trend.value);
    const isNegative = direction === 'down' || direction === 'downRight';

    if (isNegative) {
        return magnitude >= 20 ? 'critical' : 'bad';
    }

    return trend.tone === 'dark' || magnitude >= 50 ? 'great' : 'good';
};

const getTrendIcon = (direction: TrendDirection) => {
    switch (direction) {
        case 'up':
            return ArrowUpward;
        case 'down':
            return ArrowDownward;
        case 'upRight':
            return NorthEast;
        case 'downRight':
            return SouthEast;
        default:
            return NorthEast;
    }
};

const getEffectiveIconTone = (icon: SvgIcon, tone?: IconTone) => {
    if (icon === RequestsIcon) {
        return tone || 'muted';
    }

    if (icon === ConversationsIcon && tone === 'muted') {
        return undefined;
    }

    return tone;
};

const AnimatedValue = ({ value }: { value: string }) => <>{useAnimatedDisplayValue(value)}</>;

const DonutChart = ({
    animationKey,
    data,
    onSegmentSelect,
    selectedSegmentLabel,
}: {
    animationKey: string;
    data: ConversationPeriodData;
    onSegmentSelect: (segmentLabel: string) => void;
    selectedSegmentLabel?: string;
}) => {
    const renderSegments = useMemo(() => buildDonutSegments(data.segments), [data.segments]);
    const selectedSegment = data.segments.find((segment) => segment.label === selectedSegmentLabel);
    const hasSelectedSegment = Boolean(selectedSegment);
    const centerValue = selectedSegment ? `${selectedSegment.value}` : data.total;
    const centerPercentage = selectedSegment
        ? `${getConversationSegmentPercentage(selectedSegment, data.segments)}%`
        : undefined;
    const centerLabel = selectedSegment ? selectedSegment.displayLabel || selectedSegment.label : 'gesamt';

    const handleSegmentKeyDown = (event: ReactKeyboardEvent<SVGCircleElement>, segmentLabel: string) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSegmentSelect(segmentLabel);
        }
    };

    return (
        <div className="statisticDashboard__donut" aria-label={`Gespräche insgesamt ${data.total}`}>
            <svg
                key={animationKey}
                className="statisticDashboard__donutSvg"
                viewBox="0 0 120 120"
                aria-label="Gesprächstyp-Anteile"
                focusable="false"
                role="group"
            >
                <circle className="statisticDashboard__donutTrack" cx="60" cy="60" r="43" />
                {renderSegments.map((segment, index) => {
                    const segmentData = data.segments[index];
                    const isSelected = selectedSegment?.label === segmentData.label;
                    const isClickableSegment = segmentData.value > 0;
                    const segmentPercentage = getConversationSegmentPercentage(segmentData, data.segments);
                    const segmentStyle = {
                        '--segment-index': index,
                        '--segment-offset': -segment.offset,
                        '--segment-size': segment.size,
                    } as CSSProperties;

                    return (
                        <circle
                            key={`${segment.color}-${index}`}
                            aria-label={`${segmentData.label}: ${segmentData.value} Gespräche, ${segmentPercentage}%`}
                            aria-hidden={!isClickableSegment}
                            className={`statisticDashboard__donutSegment ${
                                isSelected ? 'statisticDashboard__donutSegment--active' : ''
                            } ${hasSelectedSegment && !isSelected ? 'statisticDashboard__donutSegment--dimmed' : ''}`}
                            cx="60"
                            cy="60"
                            r="43"
                            onClick={isClickableSegment ? () => onSegmentSelect(segmentData.label) : undefined}
                            onKeyDown={
                                isClickableSegment
                                    ? (event) => handleSegmentKeyDown(event, segmentData.label)
                                    : undefined
                            }
                            pathLength="100"
                            role={isClickableSegment ? 'button' : undefined}
                            stroke={segment.color}
                            style={segmentStyle}
                            tabIndex={isClickableSegment ? 0 : -1}
                        />
                    );
                })}
            </svg>
            <div className="statisticDashboard__donutCenter">
                <strong>{selectedSegment ? centerValue : <AnimatedValue value={centerValue} />}</strong>
                <small>
                    {centerPercentage && <span>{centerPercentage}</span>}
                    <span className="statisticDashboard__donutCenterLabel">{centerLabel}</span>
                </small>
            </div>
        </div>
    );
};

const MetricIcon = ({ icon: Icon, tone }: { icon: SvgIcon; tone?: IconTone }) => (
    <span className={getIconClassName(getEffectiveIconTone(Icon, tone))} aria-hidden="true">
        <Icon />
    </span>
);

const TrendBadge = ({ trend }: { trend?: TrendBadgeDefinition }) => {
    if (!trend) {
        return null;
    }

    const direction = getTrendDirection(trend);
    const scoreTone = getTrendScoreTone(trend, direction);
    const isNegative = direction === 'down' || direction === 'downRight';
    const displayValue = formatTrendValue(trend.value, isNegative);
    const TrendIcon = getTrendIcon(direction);

    return (
        <span
            className={getTrendClassName(scoreTone)}
            aria-label={`${isNegative ? 'Abnahme' : 'Zunahme'} ${displayValue}`}
        >
            <TrendIcon aria-hidden="true" />
            {displayValue}
        </span>
    );
};

interface StatisticCardProps {
    card: StatisticCardDefinition;
    menuValue?: CardMenuKey;
    onMenuChange?: (cardKey: string, menuKey: CardMenuKey) => void;
}

const StatisticCard = ({ card, menuValue, onMenuChange }: StatisticCardProps) => {
    const storedMenuOption = card.menuOptions?.find((option) => option.key === menuValue);
    const defaultMenuOption = card.menuOptions?.find((option) => option.key === card.defaultMenuKey);
    const selectedMenuOption = storedMenuOption || defaultMenuOption;
    const activeMenuKey = selectedMenuOption?.key || card.defaultMenuKey;
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const hasMenu = Boolean(card.menuOptions?.length);
    const displayTitle = selectedMenuOption?.title || card.title;
    const displayValue = selectedMenuOption?.value || card.value;
    const displayDetail = selectedMenuOption?.detail ?? card.detail;
    const displayTrend = selectedMenuOption?.trend || card.trend;
    const DisplayIcon = selectedMenuOption?.icon || card.icon;
    const displayIconTone = selectedMenuOption?.iconTone ?? card.iconTone;
    const menuLabel = card.menuLabel || 'Chattyp';
    const menuAriaLabel = card.menuAriaLabel || `${card.title} nach Chattyp filtern`;

    return (
        <section
            className={`${getCardClassName(card)} ${isMenuOpen ? 'statisticDashboard__metricCard--menuOpen' : ''}`}
            data-card-key={card.key}
        >
            <div
                className={`statisticDashboard__cardHeader ${
                    hasMenu ? '' : 'statisticDashboard__cardHeader--withoutMenu'
                }`}
            >
                <MetricIcon icon={DisplayIcon} tone={displayIconTone} />
                <h2>{displayTitle}</h2>
                {hasMenu && (
                    <div
                        className="statisticDashboard__cardMenuWrap"
                        onBlur={(event) => {
                            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                                setIsMenuOpen(false);
                            }
                        }}
                    >
                        <button
                            type="button"
                            className="statisticDashboard__cardMenu"
                            aria-label={menuAriaLabel}
                            aria-haspopup="menu"
                            aria-expanded={isMenuOpen}
                            onClick={() => setIsMenuOpen((currentValue) => !currentValue)}
                        >
                            <MoreVert aria-hidden="true" />
                        </button>
                        {isMenuOpen && (
                            <div className="statisticDashboard__cardMenuPanel" role="menu">
                                <span className="statisticDashboard__cardMenuEyebrow">{menuLabel}</span>
                                {card.menuOptions.map((option) => {
                                    const isSelected = option.key === activeMenuKey;

                                    return (
                                        <button
                                            key={option.key}
                                            type="button"
                                            className={`statisticDashboard__cardMenuItem ${
                                                isSelected ? 'statisticDashboard__cardMenuItem--active' : ''
                                            }`}
                                            role="menuitemradio"
                                            aria-checked={isSelected}
                                            onClick={() => {
                                                onMenuChange?.(card.key, option.key);
                                                setIsMenuOpen(false);
                                            }}
                                        >
                                            <span>{option.label}</span>
                                            <strong>{option.value}</strong>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="statisticDashboard__cardValueRow">
                <strong>
                    <AnimatedValue value={displayValue} />
                </strong>
                <TrendBadge trend={displayTrend} />
                {displayDetail && <span className="statisticDashboard__cardDetail">{displayDetail}</span>}
            </div>
        </section>
    );
};

interface PeriodSelectProps<OptionKey extends string> {
    ariaLabel: string;
    onSelect: (key: OptionKey) => void;
    options: Array<{ key: OptionKey; label: string }>;
    value: OptionKey;
}

const PeriodSelect = <OptionKey extends string>({
    ariaLabel,
    onSelect,
    options,
    value,
}: PeriodSelectProps<OptionKey>) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const selectedOption = options.find((option) => option.key === value) || options[0];

    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }

        const handlePointerDown = (event: PointerEvent) => {
            if (!wrapperRef.current?.contains(event.target as Node | null)) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    return (
        <div className="statisticDashboard__dateSelectWrap" ref={wrapperRef}>
            <button
                type="button"
                className="statisticDashboard__dateSelect"
                aria-label={ariaLabel}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                onClick={() => setIsOpen((currentValue) => !currentValue)}
            >
                <CalendarIcon aria-hidden="true" />
                <span>{selectedOption.label}</span>
                <ChevronDownIcon aria-hidden="true" />
            </button>
            {isOpen && (
                <div className="statisticDashboard__dateSelectPanel" role="menu">
                    {options.map((option) => {
                        const isSelected = option.key === value;

                        return (
                            <button
                                key={option.key}
                                type="button"
                                className={`statisticDashboard__dateSelectOption ${
                                    isSelected ? 'statisticDashboard__dateSelectOption--active' : ''
                                }`}
                                role="menuitemradio"
                                aria-checked={isSelected}
                                onClick={() => {
                                    onSelect(option.key);
                                    setIsOpen(false);
                                }}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export const Statistic = () => {
    const [activeScope, setActiveScope] = useState<ScopeKey>('platform');
    const [selectedCardMenuByScope, setSelectedCardMenuByScope] =
        useState<SelectedCardMenuByScope>(readStoredCardMenuSelection);
    const [selectedCasePeriodByScope, setSelectedCasePeriodByScope] = useState<Record<ScopeKey, CasePeriodKey>>({
        platform: 'thisWeek',
        tenant: 'thisWeek',
        agency: 'thisWeek',
    });
    const [selectedConversationPeriodByScope, setSelectedConversationPeriodByScope] = useState<
        Record<ScopeKey, ConversationPeriodKey>
    >({
        platform: 'today',
        tenant: 'today',
        agency: 'today',
    });
    const [selectedConversationSegmentByScope, setSelectedConversationSegmentByScope] = useState<
        Record<ScopeKey, string | undefined>
    >({
        platform: undefined,
        tenant: undefined,
        agency: undefined,
    });
    const [selectedCaseDayByScope, setSelectedCaseDayByScope] =
        useState<Record<ScopeKey, string>>(defaultSelectedCaseDayByScope);
    const dashboard = dashboardByScope[activeScope];
    const selectedCasePeriod = selectedCasePeriodByScope[activeScope];
    const selectedConversationPeriod = selectedConversationPeriodByScope[activeScope];
    const selectedConversationSegment = selectedConversationSegmentByScope[activeScope];
    const caseChart = demoCaseChartsByScope[activeScope][selectedCasePeriod];
    const conversationData = demoConversationByScope[activeScope][selectedConversationPeriod];
    const selectedConversationSegmentLabel = conversationData.segments.some(
        (segment) => segment.label === selectedConversationSegment,
    )
        ? selectedConversationSegment
        : undefined;
    const selectedCaseDay = selectedCaseDayByScope[activeScope];
    const selectedCaseBar =
        caseChart.find((bar) => bar.day === selectedCaseDay) ||
        caseChart.find((bar) => bar.isDefaultSelected) ||
        caseChart[0];
    const maxCaseValue = useMemo(() => Math.max(...caseChart.map((bar) => bar.value), 1), [caseChart]);
    const caseAxisMax = useMemo(() => getCaseAxisMax(maxCaseValue), [maxCaseValue]);
    const yAxisLabels = useMemo(() => getCaseAxisLabels(maxCaseValue), [maxCaseValue]);
    const chartAnimationKey = `${activeScope}-${selectedCasePeriod}`;
    const donutAnimationKey = `${activeScope}-${selectedConversationPeriod}`;
    const updateCardMenuSelection = (cardKey: string, menuKey: CardMenuKey) => {
        setSelectedCardMenuByScope((currentSelection) => ({
            ...currentSelection,
            [activeScope]: {
                ...currentSelection[activeScope],
                [cardKey]: menuKey,
            },
        }));
    };
    const selectCaseDay = (day: string) => {
        setSelectedCaseDayByScope((currentSelection) => ({
            ...currentSelection,
            [activeScope]: day,
        }));
    };
    const selectConversationSegment = (segmentLabel: string) => {
        setSelectedConversationSegmentByScope((currentSelection) => ({
            ...currentSelection,
            [activeScope]: segmentLabel,
        }));
    };

    useEffect(() => {
        storeCardMenuSelection(selectedCardMenuByScope);
    }, [selectedCardMenuByScope]);

    return (
        <Page>
            <div className="statisticDashboardPage">
                <Page.Title>
                    <div className="statisticDashboard__scopeTabs" aria-label="Statistik-Ebene">
                        {scopeOrder.map((scopeKey) => {
                            const scope = scopeDefinitions[scopeKey];
                            const ScopeIcon = scope.icon;
                            const isActive = scope.key === activeScope;

                            return (
                                <button
                                    key={scope.key}
                                    type="button"
                                    aria-pressed={isActive}
                                    className={`statisticDashboard__scopeTab ${
                                        isActive ? 'statisticDashboard__scopeTab--active' : ''
                                    }`}
                                    onClick={() => setActiveScope(scope.key)}
                                >
                                    <ScopeIcon />
                                    <span>{scope.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </Page.Title>

                <div className="statisticDashboard">
                    <div className="statisticDashboard__summaryGrid">
                        {dashboard.topCards.map((card) => (
                            <StatisticCard
                                key={card.key}
                                card={getPersonalizedMetricCard(card, activeScope)}
                                menuValue={selectedCardMenuByScope[activeScope][card.key]}
                                onMenuChange={updateCardMenuSelection}
                            />
                        ))}
                    </div>

                    <div className="statisticDashboard__communicationGrid">
                        {dashboard.communicationCards.map((card) => (
                            <StatisticCard key={card.key} card={getDisplayMetricCard(card, activeScope)} />
                        ))}
                    </div>

                    <div className="statisticDashboard__chartGrid">
                        <section className="statisticDashboard__chartCard statisticDashboard__caseChartCard">
                            <div className="statisticDashboard__chartHeader">
                                <h2>Beratungsfälle</h2>
                                <PeriodSelect<CasePeriodKey>
                                    ariaLabel="Zeitraum für Beratungsfälle"
                                    onSelect={(periodKey) =>
                                        setSelectedCasePeriodByScope((currentPeriods) => ({
                                            ...currentPeriods,
                                            [activeScope]: periodKey,
                                        }))
                                    }
                                    options={casePeriodOptions}
                                    value={selectedCasePeriod}
                                />
                            </div>

                            <div className="statisticDashboard__barChart">
                                <div className="statisticDashboard__axisLabels" aria-hidden="true">
                                    {yAxisLabels.map((label) => (
                                        <span key={label}>{label}</span>
                                    ))}
                                </div>
                                <div className="statisticDashboard__barStage">
                                    {gridLinePositions.map((position) => (
                                        <span
                                            key={position}
                                            className="statisticDashboard__gridLine"
                                            style={{ top: `${position}%` }}
                                        />
                                    ))}
                                    <div className="statisticDashboard__bars">
                                        {caseChart.map((bar, index) => {
                                            const height = Math.round((bar.value / caseAxisMax) * 100);
                                            const isSelected = bar.day === selectedCaseBar.day;
                                            const barStyle = {
                                                '--bar-index': index,
                                                height: `${height}%`,
                                            } as CSSProperties;
                                            const tooltipLift = height <= 35 ? 48 : 18;
                                            const tooltipStyle = {
                                                '--statistic-dashboard-tooltip-bottom': `calc(${height}% + ${tooltipLift}px)`,
                                            } as CSSProperties;

                                            return (
                                                <button
                                                    key={bar.day}
                                                    type="button"
                                                    className={`statisticDashboard__barSlot ${
                                                        isSelected ? 'statisticDashboard__barSlot--selected' : ''
                                                    }`}
                                                    aria-label={`${bar.value} Beratungsfälle am ${bar.dateLabel}`}
                                                    aria-current={isSelected ? 'true' : undefined}
                                                    aria-pressed={isSelected}
                                                    data-day={bar.day}
                                                    onClick={() => selectCaseDay(bar.day)}
                                                    onFocus={() => selectCaseDay(bar.day)}
                                                    onPointerDown={() => selectCaseDay(bar.day)}
                                                >
                                                    {isSelected && (
                                                        <div
                                                            className="statisticDashboard__barTooltip"
                                                            style={tooltipStyle}
                                                        >
                                                            <strong>
                                                                <span />
                                                                {bar.value.toLocaleString('de-DE')}
                                                            </strong>
                                                            <small>{bar.dateLabel}</small>
                                                        </div>
                                                    )}
                                                    <span
                                                        key={`${chartAnimationKey}-${bar.day}`}
                                                        className={`statisticDashboard__bar ${
                                                            isSelected ? 'statisticDashboard__bar--highlight' : ''
                                                        } ${bar.value === 0 ? 'statisticDashboard__bar--empty' : ''}`}
                                                        style={barStyle}
                                                    />
                                                    <small className="statisticDashboard__barDayLabel">{bar.day}</small>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="statisticDashboard__chartCard statisticDashboard__donutCard">
                            <div className="statisticDashboard__chartHeader">
                                <h2>Gesprächstyp</h2>
                                <PeriodSelect<ConversationPeriodKey>
                                    ariaLabel="Zeitraum für Gesprächstyp"
                                    onSelect={(periodKey) =>
                                        setSelectedConversationPeriodByScope((currentPeriods) => ({
                                            ...currentPeriods,
                                            [activeScope]: periodKey,
                                        }))
                                    }
                                    options={conversationPeriodOptions}
                                    value={selectedConversationPeriod}
                                />
                            </div>

                            <div className="statisticDashboard__donutContent">
                                <DonutChart
                                    animationKey={donutAnimationKey}
                                    data={conversationData}
                                    onSegmentSelect={selectConversationSegment}
                                    selectedSegmentLabel={selectedConversationSegmentLabel}
                                />

                                <div className="statisticDashboard__legend">
                                    {conversationData.segments.map((segment) => {
                                        const segmentPercentage = getConversationSegmentPercentage(
                                            segment,
                                            conversationData.segments,
                                        );
                                        const isSelected = segment.label === selectedConversationSegmentLabel;

                                        return (
                                            <button
                                                key={segment.label}
                                                type="button"
                                                className={`statisticDashboard__legendItem ${
                                                    isSelected ? 'statisticDashboard__legendItem--active' : ''
                                                }`}
                                                aria-pressed={isSelected}
                                                onClick={() => selectConversationSegment(segment.label)}
                                            >
                                                <span
                                                    className="statisticDashboard__legendDot"
                                                    style={{ backgroundColor: segment.color }}
                                                />
                                                <p aria-label={segment.label}>
                                                    {segment.displayLabel || segment.label}
                                                </p>
                                                <span
                                                    className="statisticDashboard__legendMeta"
                                                    aria-label={`${segment.value} Gespräche, ${segmentPercentage}%`}
                                                >
                                                    <strong>{segment.value}</strong>
                                                    <small>{segmentPercentage}%</small>
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </Page>
    );
};
