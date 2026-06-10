import { ArrowDownward, ArrowUpward, Close, MoreVert, NorthEast, SouthEast } from '@mui/icons-material';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { AdminSegmentedTabs } from '../components/AdminSegmentedTabs/AdminSegmentedTabs';
import { Page } from '../components/Page';
import SearchInput from '../components/SearchInput/SearchInput';
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
import {
    readStoredCardMenuSelection,
    readStoredFilterTargetSelection,
    storeCardMenuSelection,
    storeFilterTargetSelection,
} from './Statistic/statisticPreferences';
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
    SelectedFilterTargetIdsByScope,
    SelectedCardMenuByScope,
    StatisticCardDefinition,
    SvgIcon,
    TrendBadgeDefinition,
    TrendDirection,
    TrendScoreTone,
} from './Statistic/types';
import { useAnimatedDisplayValue } from './Statistic/useAnimatedDisplayValue';
import type { AdminSegmentedTabItem } from '../components/AdminSegmentedTabs/AdminSegmentedTabs';

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

type DashboardTranslate = (key: string, options?: Record<string, unknown>) => string;

const getDashboardLocale = (language?: string) => (language?.toLowerCase().startsWith('de') ? 'de-DE' : 'en-US');

const translateDashboardKey = (
    translate: DashboardTranslate,
    key: string,
    defaultValue: string,
    options: Record<string, unknown> = {},
) => translate(key, { defaultValue, ...options });

const dashboardTextKeyByValue: Record<string, string> = {
    '1:1-Anfragen': 'statistic.dashboard.text.oneToOneRequests',
    'Alle Chattypen': 'statistic.dashboard.text.allChatTypes',
    'Alle zugeordneten Einheiten': 'statistic.dashboard.filter.allAssignedUnits',
    Anfragen: 'statistic.dashboard.text.requests',
    'Anfragen gesamt': 'statistic.dashboard.text.totalRequests',
    Anrufe: 'statistic.dashboard.text.calls',
    Arbeit: 'statistic.dashboard.topic.work',
    'Anruf-Anteil': 'statistic.dashboard.text.callShare',
    Ausbildung: 'statistic.dashboard.topic.training',
    'Auf Beratungsstellenebene': 'statistic.dashboard.scope.agency',
    'Auf Trägerebene': 'statistic.dashboard.scope.tenant',
    Beratende: 'statistic.dashboard.text.counselors',
    'Beratende im Dienst': 'statistic.dashboard.text.counselorsOnDuty',
    Beratungsfälle: 'statistic.dashboard.text.counselingCases',
    Beratungsgespräche: 'statistic.dashboard.text.counselingConversations',
    Beratungsstellen: 'statistic.dashboard.text.agencyUnits',
    Beratungsstelle: 'statistic.dashboard.text.agencyUnit',
    Chattyp: 'statistic.dashboard.text.chatType',
    'Dieser Monat': 'statistic.dashboard.text.thisMonth',
    'Diese Woche': 'statistic.dashboard.text.thisWeek',
    'Durchschnitt pro Gespräch': 'statistic.dashboard.text.averagePerConversation',
    'Durchschnitt pro Monat': 'statistic.dashboard.text.monthlyAverage',
    Familie: 'statistic.dashboard.topic.family',
    'gefilterte Ansicht': 'statistic.dashboard.text.filteredView',
    gesamt: 'statistic.dashboard.text.total',
    Gespräche: 'statistic.dashboard.text.conversations',
    'Gespräche insgesamt': 'statistic.dashboard.text.totalConversations',
    Gesprächskreise: 'statistic.dashboard.text.conversationGroups',
    'Gesprächs\nkreise': 'statistic.dashboard.text.conversationGroupsWrapped',
    Gesprächstyp: 'statistic.dashboard.text.conversationType',
    Gruppen: 'statistic.dashboard.text.groups',
    'Gruppen-Anfragen': 'statistic.dashboard.text.groupRequests',
    'Häufigstes Thema': 'statistic.dashboard.text.mostFrequentTopic',
    'Häufigstes Thema nach Zeitraum filtern': 'statistic.dashboard.menu.filterMostFrequentTopic',
    'heute aktiv': 'statistic.dashboard.text.activeToday',
    Interna: 'statistic.dashboard.text.internal',
    'Kennzahl in diesem Dashboard-Slot auswählen': 'statistic.dashboard.menu.selectDashboardMetric',
    'Keine Daten': 'statistic.dashboard.text.noData',
    'Keine Filter verfügbar': 'statistic.dashboard.filter.noFilters',
    'Letzter Monat': 'statistic.dashboard.text.lastMonth',
    Live: 'statistic.dashboard.text.live',
    'Live-Chat': 'statistic.dashboard.text.liveChat',
    'Live-Chat-Anfragen': 'statistic.dashboard.text.liveChatRequests',
    'Meine Kennzahl': 'statistic.dashboard.menu.myMetric',
    'Nachrichten Beratende': 'statistic.dashboard.text.counselorMessages',
    'Nachrichten pro Gespräch': 'statistic.dashboard.text.messagesPerConversation',
    'Nachrichten Ratsuchende': 'statistic.dashboard.text.seekerMessages',
    Nähe: 'statistic.dashboard.text.counseling',
    'Nähe (1:1)': 'statistic.dashboard.text.oneToOneCounseling',
    'Nähe / 1:1-Anfragen': 'statistic.dashboard.text.counselingOneToOneRequests',
    'Persönliche Kennzahl auswählen': 'statistic.dashboard.menu.selectPersonalMetric',
    Plattformweit: 'statistic.dashboard.scope.platform',
    Schulden: 'statistic.dashboard.topic.debt',
    Sprachnachrichten: 'statistic.dashboard.text.voiceMessages',
    Statistik: 'statistic.title',
    'Statistik eingrenzen': 'statistic.dashboard.filter.aria',
    'Statistik-Ebene': 'statistic.dashboard.scope.aria',
    Sucht: 'statistic.dashboard.topic.addiction',
    Textnachrichten: 'statistic.dashboard.text.textMessages',
    'Thema letzter Monat': 'statistic.dashboard.text.topicLastMonth',
    'Thema vor 2 Monaten': 'statistic.dashboard.text.topicTwoMonthsAgo',
    'Thema vor 3 Monaten': 'statistic.dashboard.text.topicThreeMonthsAgo',
    Trennung: 'statistic.dashboard.topic.separation',
    Träger: 'statistic.dashboard.text.tenant',
    Videoanrufe: 'statistic.dashboard.text.videoCalls',
    'Videoanruf-Anteil': 'statistic.dashboard.text.videoCallShare',
    'Vor 2 Monaten': 'statistic.dashboard.text.twoMonthsAgo',
    'Vor 3 Monaten': 'statistic.dashboard.text.threeMonthsAgo',
    Wohnen: 'statistic.dashboard.topic.housing',
    Zeitraum: 'statistic.dashboard.text.period',
    'aktive Beratende': 'statistic.dashboard.text.activeCounselors',
    'aktive Beratungsstellen': 'statistic.dashboard.text.activeAgencyUnits',
    'aktive Gespräche': 'statistic.dashboard.text.activeConversations',
    'diese Woche': 'statistic.dashboard.period.thisWeek',
    'dieses Jahr': 'statistic.dashboard.period.thisYear',
    eigene: 'statistic.dashboard.text.own',
    'eigene Beratungsstelle': 'statistic.dashboard.text.ownAgencyUnit',
    gestern: 'statistic.dashboard.period.yesterday',
    heute: 'statistic.dashboard.period.today',
    'letzte Woche': 'statistic.dashboard.period.lastWeek',
    'letztes Jahr': 'statistic.dashboard.period.lastYear',
    'vor drei Wochen': 'statistic.dashboard.period.threeWeeksAgo',
    'vor vier Wochen': 'statistic.dashboard.period.fourWeeksAgo',
    'vor zwei Wochen': 'statistic.dashboard.period.twoWeeksAgo',
    'zugeordnete Beratungsstellen': 'statistic.dashboard.text.assignedAgencyUnits',
    'Ø Nachrichten/Gespräch': 'statistic.dashboard.text.averageMessagesPerConversation',
    'Anzahl Beratungsfälle': 'statistic.dashboard.text.counselingCaseCount',
    'Anzahl Nachrichten Beratende': 'statistic.dashboard.text.counselorMessageCount',
    'Anzahl Nachrichten Ratsuchende': 'statistic.dashboard.text.seekerMessageCount',
    'Anzahl Videoanrufe': 'statistic.dashboard.text.videoCallCount',
};

const dashboardWeekdayKeyByValue: Record<string, string> = {
    Di: 'tuesday',
    Do: 'thursday',
    Fr: 'friday',
    Mi: 'wednesday',
    Mo: 'monday',
    Sa: 'saturday',
    So: 'sunday',
};

const formatDashboardNumberText = (value: string, locale: string) => {
    const trimmedValue = value.trim();
    const numberMatch = trimmedValue.match(/^-?\d{1,3}(?:\.\d{3})*(?:,\d+)?$|^-?\d+(?:,\d+)?$/);

    if (!numberMatch) {
        return value;
    }

    const decimalPart = trimmedValue.includes(',') ? trimmedValue.split(',')[1] : '';
    const normalizedValue = Number(trimmedValue.replace(/\./g, '').replace(',', '.'));

    if (!Number.isFinite(normalizedValue)) {
        return value;
    }

    return normalizedValue.toLocaleString(locale, {
        maximumFractionDigits: decimalPart.length,
        minimumFractionDigits: decimalPart.length,
    });
};

const translateDashboardText = (translate: DashboardTranslate, value = '', locale = 'de-DE') => {
    if (!value) {
        return value;
    }

    const agencyCountMatch = value.match(/^(\d+) Beratungsstellen$/);

    if (agencyCountMatch) {
        const count = Number(agencyCountMatch[1]);

        return translateDashboardKey(translate, 'statistic.dashboard.text.agencyUnitCount', value, {
            count,
            value: formatDashboardNumberText(agencyCountMatch[1], locale),
        });
    }

    const previousMonthTotalMatch = value.match(/^Vormonat gesamt (.+)$/);

    if (previousMonthTotalMatch) {
        return translateDashboardKey(translate, 'statistic.dashboard.text.previousMonthTotal', value, {
            value: formatDashboardNumberText(previousMonthTotalMatch[1], locale),
        });
    }

    const previousWeekTotalMatch = value.match(/^Vorwoche gesamt (.+)$/);

    if (previousWeekTotalMatch) {
        return translateDashboardKey(translate, 'statistic.dashboard.text.previousWeekTotal', value, {
            value: formatDashboardNumberText(previousWeekTotalMatch[1], locale),
        });
    }

    const key = dashboardTextKeyByValue[value];

    return key ? translateDashboardKey(translate, key, value) : value;
};

const translateDashboardValue = (translate: DashboardTranslate, value: string, locale: string) => {
    const translatedValue = translateDashboardText(translate, value, locale);

    return translatedValue === value ? formatDashboardNumberText(value, locale) : translatedValue;
};

const translateDashboardWeekday = (translate: DashboardTranslate, day: string) => {
    const weekdayKey = dashboardWeekdayKeyByValue[day];

    return weekdayKey ? translateDashboardKey(translate, `statistic.dashboard.weekday.${weekdayKey}`, day) : day;
};

const translateDashboardDateLabel = (translate: DashboardTranslate, dateLabel: string) =>
    dateLabel.replace(/^(Mo|Di|Mi|Do|Fr|Sa|So)(?=,)/, (day) => translateDashboardWeekday(translate, day));

const localizeCardMenuOption = (
    option: CardMenuOption,
    translate: DashboardTranslate,
    locale: string,
): CardMenuOption => ({
    ...option,
    detail: option.detail ? translateDashboardText(translate, option.detail, locale) : option.detail,
    label: translateDashboardText(translate, option.label, locale),
    title: option.title ? translateDashboardText(translate, option.title, locale) : option.title,
    value: translateDashboardValue(translate, option.value, locale),
});

const localizeStatisticCard = (
    card: StatisticCardDefinition,
    translate: DashboardTranslate,
    locale: string,
): StatisticCardDefinition => ({
    ...card,
    detail: card.detail ? translateDashboardText(translate, card.detail, locale) : card.detail,
    menuAriaLabel: card.menuAriaLabel
        ? translateDashboardText(translate, card.menuAriaLabel, locale)
        : card.menuAriaLabel,
    menuLabel: card.menuLabel ? translateDashboardText(translate, card.menuLabel, locale) : card.menuLabel,
    menuOptions: card.menuOptions?.map((option) => localizeCardMenuOption(option, translate, locale)),
    title: translateDashboardText(translate, card.title, locale),
    value: translateDashboardValue(translate, card.value, locale),
});

const localizePeriodOptions = <OptionKey extends string>(
    options: Array<{ key: OptionKey; label: string }>,
    translate: DashboardTranslate,
    locale: string,
) =>
    options.map((option) => ({
        ...option,
        label: translateDashboardText(translate, option.label, locale),
    }));

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

type FilterTargetType = 'Träger' | 'Beratungsstelle';

interface FilterTarget {
    id: string;
    label: string;
    type: FilterTargetType;
    detail: string;
}

const filterTargetsByScope: Record<ScopeKey, FilterTarget[]> = {
    platform: [
        {
            id: 'tenant-caritas-nrw',
            label: 'Caritas NRW',
            type: 'Träger',
            detail: '35 Beratungsstellen',
        },
        {
            id: 'tenant-diakonie-rwl',
            label: 'Diakonie RWL',
            type: 'Träger',
            detail: '22 Beratungsstellen',
        },
        {
            id: 'tenant-paritaet-nrw',
            label: 'Der Paritätische NRW',
            type: 'Träger',
            detail: '14 Beratungsstellen',
        },
        {
            id: 'agency-u25-duesseldorf',
            label: 'U25 Düsseldorf',
            type: 'Beratungsstelle',
            detail: 'Caritas NRW',
        },
        {
            id: 'agency-schuldnerberatung-koeln',
            label: 'Schuldnerberatung Köln',
            type: 'Beratungsstelle',
            detail: 'Caritas NRW',
        },
        {
            id: 'agency-jugendberatung-essen',
            label: 'Jugendberatung Essen',
            type: 'Beratungsstelle',
            detail: 'Caritas NRW',
        },
    ],
    tenant: [
        {
            id: 'agency-u25-duesseldorf',
            label: 'U25 Düsseldorf',
            type: 'Beratungsstelle',
            detail: 'Caritas NRW',
        },
        {
            id: 'agency-schuldnerberatung-koeln',
            label: 'Schuldnerberatung Köln',
            type: 'Beratungsstelle',
            detail: 'Caritas NRW',
        },
        {
            id: 'agency-jugendberatung-essen',
            label: 'Jugendberatung Essen',
            type: 'Beratungsstelle',
            detail: 'Caritas NRW',
        },
    ],
    agency: [
        {
            id: 'agency-u25-duesseldorf',
            label: 'U25 Düsseldorf',
            type: 'Beratungsstelle',
            detail: 'eigene Beratungsstelle',
        },
    ],
};

const normalizeFilterSearch = (value: string, locale: string) => value.trim().toLocaleLowerCase(locale);

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

type ConversationValues = [number, number, number, number];

interface TopicStatistic {
    label: string;
    share: number;
}

interface FilterTargetMetricStats {
    activeAgencies: number;
    activeConversations: number;
    cases: number;
    conversationsTotal: number;
    counselors: number;
    groups: number;
    liveChat: number;
    messagesCounselors: number;
    messagesSeekers: number;
    oneToOne: number;
    phoneCalls: number;
    textMessagesTotal: number;
    videoCalls: number;
    voiceMessages: number;
    topTopic: TopicStatistic;
    previousMonth: TopicStatistic;
    twoMonthsAgo: TopicStatistic;
    threeMonthsAgo: TopicStatistic;
}

interface FilterTargetStatistics {
    caseCharts: Record<CasePeriodKey, number[]>;
    conversation: Record<ConversationPeriodKey, ConversationValues>;
    metrics: FilterTargetMetricStats;
}

const fallbackStatisticTargetIdsByScope: Record<ScopeKey, string[]> = {
    platform: ['tenant-caritas-nrw', 'tenant-diakonie-rwl', 'tenant-paritaet-nrw'],
    tenant: ['tenant-caritas-nrw'],
    agency: ['agency-u25-duesseldorf'],
};

const filterTargetStatisticsById: Record<string, FilterTargetStatistics> = {
    'tenant-caritas-nrw': {
        metrics: {
            activeAgencies: 35,
            activeConversations: 4,
            cases: 8,
            conversationsTotal: 7,
            counselors: 6,
            groups: 2,
            liveChat: 3,
            messagesCounselors: 5,
            messagesSeekers: 13,
            oneToOne: 4,
            phoneCalls: 1,
            textMessagesTotal: 18,
            videoCalls: 0,
            voiceMessages: 2,
            topTopic: { label: 'Schulden', share: 59 },
            previousMonth: { label: 'Wohnen', share: 44 },
            twoMonthsAgo: { label: 'Trennung', share: 31 },
            threeMonthsAgo: { label: 'Sucht', share: 27 },
        },
        caseCharts: {
            thisWeek: [1, 2, 1, 4, 3, 1, 0],
            lastWeek: [0, 1, 2, 3, 2, 1, 0],
            twoWeeksAgo: [1, 1, 1, 2, 2, 0, 0],
            threeWeeksAgo: [0, 1, 1, 2, 1, 0, 0],
            fourWeeksAgo: [0, 1, 0, 1, 1, 0, 0],
        },
        conversation: {
            today: [1, 2, 0, 0],
            yesterday: [1, 1, 1, 0],
            thisWeek: [2, 5, 3, 0],
            total: [7, 14, 11, 0],
            thisYear: [4, 11, 8, 0],
            lastYear: [5, 9, 6, 1],
        },
    },
    'tenant-diakonie-rwl': {
        metrics: {
            activeAgencies: 22,
            activeConversations: 3,
            cases: 5,
            conversationsTotal: 4,
            counselors: 4,
            groups: 1,
            liveChat: 2,
            messagesCounselors: 4,
            messagesSeekers: 8,
            oneToOne: 2,
            phoneCalls: 1,
            textMessagesTotal: 12,
            videoCalls: 0,
            voiceMessages: 1,
            topTopic: { label: 'Familie', share: 42 },
            previousMonth: { label: 'Schulden', share: 34 },
            twoMonthsAgo: { label: 'Wohnen', share: 25 },
            threeMonthsAgo: { label: 'Trennung', share: 21 },
        },
        caseCharts: {
            thisWeek: [0, 1, 1, 2, 1, 0, 0],
            lastWeek: [0, 1, 0, 2, 1, 0, 0],
            twoWeeksAgo: [0, 0, 1, 1, 1, 0, 0],
            threeWeeksAgo: [0, 1, 0, 1, 0, 0, 0],
            fourWeeksAgo: [0, 0, 1, 1, 0, 0, 0],
        },
        conversation: {
            today: [1, 1, 0, 0],
            yesterday: [0, 1, 1, 0],
            thisWeek: [2, 3, 1, 0],
            total: [5, 8, 5, 0],
            thisYear: [3, 6, 4, 0],
            lastYear: [4, 6, 3, 1],
        },
    },
    'tenant-paritaet-nrw': {
        metrics: {
            activeAgencies: 14,
            activeConversations: 2,
            cases: 4,
            conversationsTotal: 3,
            counselors: 3,
            groups: 1,
            liveChat: 1,
            messagesCounselors: 3,
            messagesSeekers: 6,
            oneToOne: 2,
            phoneCalls: 0,
            textMessagesTotal: 9,
            videoCalls: 0,
            voiceMessages: 1,
            topTopic: { label: 'Ausbildung', share: 38 },
            previousMonth: { label: 'Familie', share: 28 },
            twoMonthsAgo: { label: 'Schulden', share: 22 },
            threeMonthsAgo: { label: 'Wohnen', share: 18 },
        },
        caseCharts: {
            thisWeek: [1, 0, 1, 1, 0, 0, 0],
            lastWeek: [0, 1, 0, 1, 1, 0, 0],
            twoWeeksAgo: [0, 0, 1, 1, 0, 0, 0],
            threeWeeksAgo: [0, 0, 0, 1, 1, 0, 0],
            fourWeeksAgo: [0, 0, 1, 0, 0, 0, 0],
        },
        conversation: {
            today: [0, 1, 0, 0],
            yesterday: [1, 0, 0, 0],
            thisWeek: [1, 2, 1, 0],
            total: [3, 5, 3, 0],
            thisYear: [2, 4, 2, 0],
            lastYear: [3, 3, 2, 1],
        },
    },
    'agency-u25-duesseldorf': {
        metrics: {
            activeAgencies: 1,
            activeConversations: 2,
            cases: 3,
            conversationsTotal: 3,
            counselors: 2,
            groups: 1,
            liveChat: 1,
            messagesCounselors: 2,
            messagesSeekers: 5,
            oneToOne: 1,
            phoneCalls: 1,
            textMessagesTotal: 7,
            videoCalls: 0,
            voiceMessages: 1,
            topTopic: { label: 'Trennung', share: 34 },
            previousMonth: { label: 'Schulden', share: 28 },
            twoMonthsAgo: { label: 'Familie', share: 24 },
            threeMonthsAgo: { label: 'Wohnen', share: 19 },
        },
        caseCharts: {
            thisWeek: [0, 1, 0, 2, 1, 0, 0],
            lastWeek: [0, 0, 1, 1, 1, 0, 0],
            twoWeeksAgo: [0, 1, 0, 1, 0, 0, 0],
            threeWeeksAgo: [0, 0, 0, 1, 1, 0, 0],
            fourWeeksAgo: [0, 0, 1, 0, 1, 0, 0],
        },
        conversation: {
            today: [1, 1, 0, 0],
            yesterday: [1, 0, 1, 0],
            thisWeek: [2, 2, 1, 0],
            total: [3, 4, 3, 0],
            thisYear: [2, 3, 2, 0],
            lastYear: [3, 2, 1, 0],
        },
    },
    'agency-schuldnerberatung-koeln': {
        metrics: {
            activeAgencies: 1,
            activeConversations: 1,
            cases: 2,
            conversationsTotal: 2,
            counselors: 1,
            groups: 0,
            liveChat: 1,
            messagesCounselors: 1,
            messagesSeekers: 4,
            oneToOne: 1,
            phoneCalls: 0,
            textMessagesTotal: 5,
            videoCalls: 0,
            voiceMessages: 0,
            topTopic: { label: 'Schulden', share: 71 },
            previousMonth: { label: 'Wohnen', share: 35 },
            twoMonthsAgo: { label: 'Arbeit', share: 25 },
            threeMonthsAgo: { label: 'Sucht', share: 18 },
        },
        caseCharts: {
            thisWeek: [0, 0, 0, 1, 1, 0, 0],
            lastWeek: [0, 0, 1, 1, 0, 0, 0],
            twoWeeksAgo: [0, 0, 0, 1, 0, 0, 0],
            threeWeeksAgo: [0, 0, 0, 1, 0, 0, 0],
            fourWeeksAgo: [0, 0, 0, 0, 1, 0, 0],
        },
        conversation: {
            today: [1, 0, 0, 0],
            yesterday: [0, 1, 0, 0],
            thisWeek: [1, 2, 0, 0],
            total: [2, 3, 1, 0],
            thisYear: [1, 2, 1, 0],
            lastYear: [2, 2, 1, 0],
        },
    },
    'agency-jugendberatung-essen': {
        metrics: {
            activeAgencies: 1,
            activeConversations: 2,
            cases: 3,
            conversationsTotal: 2,
            counselors: 2,
            groups: 1,
            liveChat: 2,
            messagesCounselors: 2,
            messagesSeekers: 3,
            oneToOne: 1,
            phoneCalls: 1,
            textMessagesTotal: 5,
            videoCalls: 0,
            voiceMessages: 1,
            topTopic: { label: 'Ausbildung', share: 48 },
            previousMonth: { label: 'Familie', share: 31 },
            twoMonthsAgo: { label: 'Trennung', share: 28 },
            threeMonthsAgo: { label: 'Wohnen', share: 16 },
        },
        caseCharts: {
            thisWeek: [1, 0, 0, 1, 1, 0, 0],
            lastWeek: [0, 1, 0, 1, 0, 0, 0],
            twoWeeksAgo: [0, 1, 0, 0, 1, 0, 0],
            threeWeeksAgo: [0, 0, 1, 0, 0, 0, 0],
            fourWeeksAgo: [0, 0, 0, 1, 0, 0, 0],
        },
        conversation: {
            today: [0, 1, 0, 0],
            yesterday: [1, 0, 0, 0],
            thisWeek: [1, 2, 1, 0],
            total: [2, 4, 2, 0],
            thisYear: [1, 3, 1, 0],
            lastYear: [2, 3, 1, 0],
        },
    },
    'agency-familienberatung-dortmund': {
        metrics: {
            activeAgencies: 1,
            activeConversations: 1,
            cases: 2,
            conversationsTotal: 1,
            counselors: 1,
            groups: 1,
            liveChat: 1,
            messagesCounselors: 1,
            messagesSeekers: 2,
            oneToOne: 0,
            phoneCalls: 0,
            textMessagesTotal: 3,
            videoCalls: 0,
            voiceMessages: 0,
            topTopic: { label: 'Familie', share: 63 },
            previousMonth: { label: 'Trennung', share: 29 },
            twoMonthsAgo: { label: 'Wohnen', share: 21 },
            threeMonthsAgo: { label: 'Schulden', share: 14 },
        },
        caseCharts: {
            thisWeek: [0, 1, 0, 1, 0, 0, 0],
            lastWeek: [0, 0, 0, 1, 1, 0, 0],
            twoWeeksAgo: [0, 0, 1, 0, 0, 0, 0],
            threeWeeksAgo: [0, 0, 0, 1, 0, 0, 0],
            fourWeeksAgo: [0, 0, 0, 0, 0, 0, 0],
        },
        conversation: {
            today: [0, 1, 0, 0],
            yesterday: [0, 0, 1, 0],
            thisWeek: [1, 1, 1, 0],
            total: [1, 3, 2, 0],
            thisYear: [1, 2, 1, 0],
            lastYear: [1, 2, 2, 0],
        },
    },
};

const formatIntegerMetric = (value: number) => value.toLocaleString('de-DE');

const formatDecimalMetric = (value: number) =>
    value.toLocaleString('de-DE', {
        maximumFractionDigits: 1,
        minimumFractionDigits: 1,
    });

const formatShareMetric = (value: number, total: number) => `${total ? Math.round((value / total) * 100) : 0}%`;

const getEmptyFilterTargetStatistics = (): FilterTargetStatistics => ({
    metrics: {
        activeAgencies: 0,
        activeConversations: 0,
        cases: 0,
        conversationsTotal: 0,
        counselors: 0,
        groups: 0,
        liveChat: 0,
        messagesCounselors: 0,
        messagesSeekers: 0,
        oneToOne: 0,
        phoneCalls: 0,
        textMessagesTotal: 0,
        videoCalls: 0,
        voiceMessages: 0,
        topTopic: { label: 'Keine Daten', share: 0 },
        previousMonth: { label: 'Keine Daten', share: 0 },
        twoMonthsAgo: { label: 'Keine Daten', share: 0 },
        threeMonthsAgo: { label: 'Keine Daten', share: 0 },
    },
    caseCharts: {
        thisWeek: [0, 0, 0, 0, 0, 0, 0],
        lastWeek: [0, 0, 0, 0, 0, 0, 0],
        twoWeeksAgo: [0, 0, 0, 0, 0, 0, 0],
        threeWeeksAgo: [0, 0, 0, 0, 0, 0, 0],
        fourWeeksAgo: [0, 0, 0, 0, 0, 0, 0],
    },
    conversation: {
        today: [0, 0, 0, 0],
        yesterday: [0, 0, 0, 0],
        thisWeek: [0, 0, 0, 0],
        total: [0, 0, 0, 0],
        thisYear: [0, 0, 0, 0],
        lastYear: [0, 0, 0, 0],
    },
});

const pickStrongerTopic = (currentTopic: TopicStatistic, nextTopic: TopicStatistic) =>
    nextTopic.share > currentTopic.share ? nextTopic : currentTopic;

type NumericFilterMetricKey = keyof Omit<
    FilterTargetMetricStats,
    'topTopic' | 'previousMonth' | 'twoMonthsAgo' | 'threeMonthsAgo'
>;

const numericFilterMetricKeys: NumericFilterMetricKey[] = [
    'activeAgencies',
    'activeConversations',
    'cases',
    'conversationsTotal',
    'counselors',
    'groups',
    'liveChat',
    'messagesCounselors',
    'messagesSeekers',
    'oneToOne',
    'phoneCalls',
    'textMessagesTotal',
    'videoCalls',
    'voiceMessages',
];

const aggregateFilterTargetStatistics = (targetIds: string[]) =>
    targetIds.reduce<FilterTargetStatistics>((aggregatedStats, targetId) => {
        const targetStats = filterTargetStatisticsById[targetId];

        if (!targetStats) {
            return aggregatedStats;
        }

        const metrics = numericFilterMetricKeys.reduce<FilterTargetMetricStats>(
            (nextMetrics, metricKey) => ({
                ...nextMetrics,
                [metricKey]: aggregatedStats.metrics[metricKey] + targetStats.metrics[metricKey],
            }),
            {
                ...aggregatedStats.metrics,
                previousMonth: pickStrongerTopic(
                    aggregatedStats.metrics.previousMonth,
                    targetStats.metrics.previousMonth,
                ),
                threeMonthsAgo: pickStrongerTopic(
                    aggregatedStats.metrics.threeMonthsAgo,
                    targetStats.metrics.threeMonthsAgo,
                ),
                topTopic: pickStrongerTopic(aggregatedStats.metrics.topTopic, targetStats.metrics.topTopic),
                twoMonthsAgo: pickStrongerTopic(aggregatedStats.metrics.twoMonthsAgo, targetStats.metrics.twoMonthsAgo),
            },
        );

        const caseCharts = casePeriodOptions.reduce<Record<CasePeriodKey, number[]>>(
            (nextCharts, { key }) => ({
                ...nextCharts,
                [key]: aggregatedStats.caseCharts[key].map(
                    (value, index) => value + targetStats.caseCharts[key][index],
                ),
            }),
            {} as Record<CasePeriodKey, number[]>,
        );

        const conversation = conversationPeriodOptions.reduce<Record<ConversationPeriodKey, ConversationValues>>(
            (nextConversation, { key }) => ({
                ...nextConversation,
                [key]: aggregatedStats.conversation[key].map(
                    (value, index) => value + targetStats.conversation[key][index],
                ) as ConversationValues,
            }),
            {} as Record<ConversationPeriodKey, ConversationValues>,
        );

        return {
            caseCharts,
            conversation,
            metrics,
        };
    }, getEmptyFilterTargetStatistics());

const getEffectiveStatisticTargetIds = (activeScope: ScopeKey, selectedTargetIds: string[]) => {
    const selectableTargetIds = new Set(filterTargetsByScope[activeScope].map((target) => target.id));
    const selectedAvailableTargetIds = selectedTargetIds.filter(
        (targetId) => selectableTargetIds.has(targetId) && Boolean(filterTargetStatisticsById[targetId]),
    );

    return selectedAvailableTargetIds.length
        ? selectedAvailableTargetIds
        : fallbackStatisticTargetIdsByScope[activeScope];
};

const buildMetricOverridesFromFilterStats = (
    stats: FilterTargetStatistics,
): Partial<Record<CardMenuKey, Partial<CardMenuOption>>> => {
    const totalRequests = stats.metrics.oneToOne + stats.metrics.liveChat + stats.metrics.groups;
    const messageTotal = stats.metrics.messagesSeekers + stats.metrics.messagesCounselors;
    const messagesPerSession = messageTotal / Math.max(stats.metrics.conversationsTotal, 1);
    const previousRequestTotal = Math.max(totalRequests + 1, Math.round(totalRequests * 1.18));
    const previousCasesTotal = Math.max(stats.metrics.cases + 1, Math.round(stats.metrics.cases * 1.12));

    return {
        activeAgencies: {
            value: formatIntegerMetric(stats.metrics.activeAgencies),
            detail: 'zugeordnete Beratungsstellen',
        },
        activeConversations: {
            value: formatIntegerMetric(stats.metrics.activeConversations),
        },
        all: {
            value: formatIntegerMetric(totalRequests),
            detail: `Vormonat gesamt ${formatIntegerMetric(previousRequestTotal)}`,
        },
        cases: {
            value: formatIntegerMetric(stats.metrics.cases),
            detail: `Vorwoche gesamt ${formatIntegerMetric(previousCasesTotal)}`,
        },
        conversationsTotal: {
            value: formatIntegerMetric(stats.metrics.conversationsTotal),
        },
        counselors: {
            value: formatIntegerMetric(stats.metrics.counselors),
        },
        groups: {
            value: formatIntegerMetric(stats.metrics.groups),
        },
        liveChat: {
            value: formatIntegerMetric(stats.metrics.liveChat),
        },
        messagesCounselors: {
            value: formatIntegerMetric(stats.metrics.messagesCounselors),
        },
        messagesPerSession: {
            value: formatDecimalMetric(messagesPerSession),
        },
        messagesSeekers: {
            value: formatIntegerMetric(stats.metrics.messagesSeekers),
        },
        oneToOne: {
            value: formatIntegerMetric(stats.metrics.oneToOne),
        },
        phoneShare: {
            value: formatShareMetric(stats.metrics.phoneCalls, stats.metrics.conversationsTotal),
        },
        previousMonth: {
            value: stats.metrics.previousMonth.label,
            trend: { value: `~ ${stats.metrics.previousMonth.share}%`, tone: 'dark' },
        },
        textMessagesTotal: {
            value: formatIntegerMetric(stats.metrics.textMessagesTotal),
        },
        threeMonthsAgo: {
            value: stats.metrics.threeMonthsAgo.label,
            trend: { value: `~ ${stats.metrics.threeMonthsAgo.share}%`, tone: 'dark' },
        },
        topTopic: {
            value: stats.metrics.topTopic.label,
            detail: 'gefilterte Ansicht',
            trend: { value: `~ ${stats.metrics.topTopic.share}%`, tone: 'dark' },
        },
        twoMonthsAgo: {
            value: stats.metrics.twoMonthsAgo.label,
            trend: { value: `~ ${stats.metrics.twoMonthsAgo.share}%`, tone: 'dark' },
        },
        videoCallCount: {
            value: formatIntegerMetric(stats.metrics.videoCalls),
        },
        videoShare: {
            value: formatShareMetric(stats.metrics.videoCalls, stats.metrics.conversationsTotal),
        },
        voiceShare: {
            value: formatShareMetric(stats.metrics.voiceMessages, Math.max(messageTotal, 1)),
        },
    };
};

const buildCaseChartsFromFilterStats = (stats: FilterTargetStatistics): Record<CasePeriodKey, CaseChartBar[]> =>
    casePeriodOptions.reduce(
        (charts, { key }) => ({
            ...charts,
            [key]: createDemoCaseChart(key, stats.caseCharts[key]),
        }),
        {} as Record<CasePeriodKey, CaseChartBar[]>,
    );

const buildConversationByPeriodFromFilterStats = (
    stats: FilterTargetStatistics,
): Record<ConversationPeriodKey, ConversationPeriodData> =>
    conversationPeriodOptions.reduce(
        (conversationByPeriod, { key }) => ({
            ...conversationByPeriod,
            [key]: createConversationData(stats.conversation[key]),
        }),
        {} as Record<ConversationPeriodKey, ConversationPeriodData>,
    );

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
    metricOverrides: Partial<Record<CardMenuKey, Partial<CardMenuOption>>>,
    metricKey?: CardMenuKey,
): Metric => {
    if (!metricKey) {
        return metric;
    }

    const override = {
        ...demoMetricOverridesByScope[activeScope][metricKey],
        ...metricOverrides[metricKey],
    };

    return Object.keys(override).length ? { ...metric, ...override } : metric;
};

const getDisplayMetricCard = (
    card: StatisticCardDefinition,
    activeScope: ScopeKey,
    metricOverrides: Partial<Record<CardMenuKey, Partial<CardMenuOption>>>,
) => applyDemoMetricOverride(card, activeScope, metricOverrides, defaultMetricKeyByCardKey[card.key]);

const getPersonalizedMetricCard = (
    card: StatisticCardDefinition,
    activeScope: ScopeKey,
    metricOverrides: Partial<Record<CardMenuKey, Partial<CardMenuOption>>>,
): StatisticCardDefinition => {
    const displayCard = getDisplayMetricCard(card, activeScope, metricOverrides);

    return {
        ...displayCard,
        defaultMenuKey: defaultMetricKeyByCardKey[card.key],
        menuAriaLabel: 'Kennzahl in diesem Dashboard-Slot auswählen',
        menuLabel: 'Meine Kennzahl',
        menuOptions: dashboardMetricOptionsByScope[activeScope]
            .filter((option) => !duplicatedCommunicationMetricKeys.has(option.key))
            .map((option) => applyDemoMetricOverride(option, activeScope, metricOverrides, option.key)),
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

const formatTrendValue = (value: string, isNegative: boolean, locale = 'de-DE') => {
    const magnitude = getTrendMagnitude(value);
    const formattedMagnitude = magnitude.toLocaleString(locale, {
        maximumFractionDigits: 1,
        minimumFractionDigits: Number.isInteger(magnitude) ? 0 : 1,
    });

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

const AnimatedValue = ({ locale = 'de-DE', value }: { locale?: string; value: string }) => (
    <>{useAnimatedDisplayValue(value, 2800, locale)}</>
);

const DonutChart = ({
    animationKey,
    data,
    locale,
    onSegmentSelect,
    selectedSegmentLabel,
    translate,
}: {
    animationKey: string;
    data: ConversationPeriodData;
    locale: string;
    onSegmentSelect: (segmentLabel: string) => void;
    selectedSegmentLabel?: string;
    translate: DashboardTranslate;
}) => {
    const renderSegments = useMemo(() => buildDonutSegments(data.segments), [data.segments]);
    const selectedSegment = data.segments.find((segment) => segment.label === selectedSegmentLabel);
    const hasSelectedSegment = Boolean(selectedSegment);
    const centerValue = selectedSegment
        ? formatDashboardNumberText(`${selectedSegment.value}`, locale)
        : translateDashboardValue(translate, data.total, locale);
    const centerPercentage = selectedSegment
        ? `${getConversationSegmentPercentage(selectedSegment, data.segments)}%`
        : undefined;
    const centerLabel = selectedSegment
        ? translateDashboardText(translate, selectedSegment.displayLabel || selectedSegment.label, locale)
        : translateDashboardText(translate, 'gesamt', locale);
    const totalLabel = translateDashboardValue(translate, data.total, locale);

    const handleSegmentKeyDown = (event: ReactKeyboardEvent<SVGCircleElement>, segmentLabel: string) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSegmentSelect(segmentLabel);
        }
    };

    return (
        <div
            className="statisticDashboard__donut"
            aria-label={translateDashboardKey(translate, 'statistic.dashboard.chart.totalConversationsAria', '', {
                defaultValue: `Gespräche insgesamt ${totalLabel}`,
                value: totalLabel,
            })}
        >
            <svg
                key={animationKey}
                className="statisticDashboard__donutSvg"
                viewBox="0 0 120 120"
                aria-label={translateDashboardKey(
                    translate,
                    'statistic.dashboard.chart.conversationTypeShares',
                    'Gesprächstyp-Anteile',
                )}
                focusable="false"
                role="group"
            >
                <circle className="statisticDashboard__donutTrack" cx="60" cy="60" r="43" />
                {renderSegments.map((segment, index) => {
                    const segmentData = data.segments[index];
                    const isSelected = selectedSegment?.label === segmentData.label;
                    const isClickableSegment = segmentData.value > 0;
                    const segmentPercentage = getConversationSegmentPercentage(segmentData, data.segments);
                    const segmentLabel = translateDashboardText(translate, segmentData.label, locale);
                    const segmentValue = formatDashboardNumberText(`${segmentData.value}`, locale);
                    const segmentStyle = {
                        '--segment-index': index,
                        '--segment-offset': -segment.offset,
                        '--segment-size': segment.size,
                    } as CSSProperties;

                    return (
                        <circle
                            key={`${segment.color}-${index}`}
                            aria-label={translateDashboardKey(
                                translate,
                                'statistic.dashboard.chart.segmentAria',
                                `${segmentData.label}: ${segmentData.value} Gespräche, ${segmentPercentage}%`,
                                {
                                    label: segmentLabel,
                                    percentage: segmentPercentage,
                                    value: segmentValue,
                                },
                            )}
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
                <strong>{selectedSegment ? centerValue : <AnimatedValue locale={locale} value={centerValue} />}</strong>
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

const TrendBadge = ({
    locale,
    translate,
    trend,
}: {
    locale: string;
    translate: DashboardTranslate;
    trend?: TrendBadgeDefinition;
}) => {
    if (!trend) {
        return null;
    }

    const direction = getTrendDirection(trend);
    const scoreTone = getTrendScoreTone(trend, direction);
    const isNegative = direction === 'down' || direction === 'downRight';
    const displayValue = formatTrendValue(trend.value, isNegative, locale);
    const TrendIcon = getTrendIcon(direction);

    return (
        <span
            className={getTrendClassName(scoreTone)}
            aria-label={`${translateDashboardKey(
                translate,
                isNegative ? 'statistic.dashboard.trend.decrease' : 'statistic.dashboard.trend.increase',
                isNegative ? 'Abnahme' : 'Zunahme',
            )} ${displayValue}`}
        >
            <TrendIcon aria-hidden="true" />
            {displayValue}
        </span>
    );
};

interface StatisticCardProps {
    card: StatisticCardDefinition;
    locale: string;
    menuValue?: CardMenuKey;
    onMenuChange?: (cardKey: string, menuKey: CardMenuKey) => void;
    translate: DashboardTranslate;
}

const StatisticCard = ({ card, locale, menuValue, onMenuChange, translate }: StatisticCardProps) => {
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
    const menuLabel =
        card.menuLabel || translateDashboardKey(translate, 'statistic.dashboard.text.chatType', 'Chattyp');
    const menuAriaLabel =
        card.menuAriaLabel ||
        translateDashboardKey(
            translate,
            'statistic.dashboard.menu.filterByChatType',
            `${card.title} nach Chattyp filtern`,
            {
                title: card.title,
            },
        );

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
                    <AnimatedValue locale={locale} value={displayValue} />
                </strong>
                <TrendBadge locale={locale} translate={translate} trend={displayTrend} />
                {displayDetail && <span className="statisticDashboard__cardDetail">{displayDetail}</span>}
            </div>
        </section>
    );
};

interface StatisticFilterBarProps {
    availableTargets: FilterTarget[];
    locale: string;
    onAddFirstSuggestion: () => void;
    onAddTarget: (targetId: string) => void;
    onRemoveTarget: (targetId: string) => void;
    onSearchChange: (value: string) => void;
    searchValue: string;
    selectedTargets: FilterTarget[];
    suggestions: FilterTarget[];
    translate: DashboardTranslate;
}

const StatisticFilterBar = ({
    availableTargets,
    locale,
    onAddFirstSuggestion,
    onAddTarget,
    onRemoveTarget,
    onSearchChange,
    searchValue,
    selectedTargets,
    suggestions,
    translate,
}: StatisticFilterBarProps) => {
    const [isSuggestionMenuOpen, setIsSuggestionMenuOpen] = useState(false);
    const visibleSuggestions = (() => {
        if (searchValue.trim() || suggestions.length) {
            return suggestions;
        }

        return availableTargets
            .filter((target) => !selectedTargets.some((selectedTarget) => selectedTarget.id === target.id))
            .slice(0, 6);
    })();
    const hasSuggestions = visibleSuggestions.length > 0;

    const addFirstVisibleSuggestion = () => {
        if (visibleSuggestions[0]) {
            onAddTarget(visibleSuggestions[0].id);
        } else {
            onAddFirstSuggestion();
        }
    };

    const handleSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            addFirstVisibleSuggestion();
            setIsSuggestionMenuOpen(false);
        }

        if (event.key === 'Escape') {
            setIsSuggestionMenuOpen(false);
        }
    };

    return (
        <div
            className="statisticDashboard__filterBar"
            aria-label={translateDashboardText(translate, 'Statistik eingrenzen', locale)}
        >
            <div
                className="statisticDashboard__filterSearchWrap"
                onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                        setIsSuggestionMenuOpen(false);
                    }
                }}
            >
                <SearchInput
                    className="statisticDashboard__filterSearch"
                    placeholder={translateDashboardKey(translate, 'statistic.dashboard.filter.placeholder', 'Suche')}
                    ariaLabel={translateDashboardKey(
                        translate,
                        'statistic.dashboard.filter.searchAria',
                        'Beratungsstellen oder Träger suchen',
                    )}
                    value={searchValue}
                    searchOnChange={false}
                    onClick={() => setIsSuggestionMenuOpen(true)}
                    onFocus={() => setIsSuggestionMenuOpen(true)}
                    onKeyDown={handleSearchKeyDown}
                    onValueChange={(value) => {
                        setIsSuggestionMenuOpen(true);
                        onSearchChange(value);
                    }}
                    handleOnSearch={() => {
                        addFirstVisibleSuggestion();
                        setIsSuggestionMenuOpen(false);
                    }}
                    handleOnSearchClear={() => setIsSuggestionMenuOpen(true)}
                />

                {isSuggestionMenuOpen && hasSuggestions && (
                    <div className="statisticDashboard__filterSuggestions" role="listbox">
                        {visibleSuggestions.map((target) => (
                            <button
                                key={target.id}
                                type="button"
                                className="statisticDashboard__filterSuggestion"
                                role="option"
                                aria-selected="false"
                                onClick={() => {
                                    onAddTarget(target.id);
                                    setIsSuggestionMenuOpen(false);
                                }}
                            >
                                <span>
                                    <strong>{target.label}</strong>
                                    <small>{translateDashboardText(translate, target.detail, locale)}</small>
                                </span>
                                <em>{translateDashboardText(translate, target.type, locale)}</em>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {!!selectedTargets.length && (
                <div
                    className="statisticDashboard__filterChips"
                    aria-label={translateDashboardKey(translate, 'statistic.dashboard.filter.active', 'Aktive Filter')}
                >
                    {selectedTargets.map((target) => (
                        <span key={target.id} className="statisticDashboard__filterChip">
                            <small>{translateDashboardText(translate, target.type, locale)}</small>
                            <span>{target.label}</span>
                            <button
                                type="button"
                                aria-label={translateDashboardKey(
                                    translate,
                                    'statistic.dashboard.filter.removeTarget',
                                    `${target.label} entfernen`,
                                    { target: target.label },
                                )}
                                onClick={() => onRemoveTarget(target.id)}
                            >
                                <Close aria-hidden="true" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
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
    const translationResponse = useTranslation() as unknown as {
        0?: DashboardTranslate;
        1?: { language?: string; resolvedLanguage?: string };
        i18n?: { language?: string; resolvedLanguage?: string };
        t?: DashboardTranslate;
    };
    const translateSource = translationResponse.t || translationResponse[0];
    const i18nInstance = translationResponse.i18n || translationResponse[1];
    const translate: DashboardTranslate = (key, options) =>
        translateSource?.(key, options) || String(options?.defaultValue || key);
    const locale = getDashboardLocale(i18nInstance?.resolvedLanguage || i18nInstance?.language);
    const [activeScope, setActiveScope] = useState<ScopeKey>('platform');
    const [selectedCardMenuByScope, setSelectedCardMenuByScope] =
        useState<SelectedCardMenuByScope>(readStoredCardMenuSelection);
    const [selectedFilterTargetIdsByScope, setSelectedFilterTargetIdsByScope] =
        useState<SelectedFilterTargetIdsByScope>(readStoredFilterTargetSelection);
    const [filterSearchByScope, setFilterSearchByScope] = useState<Record<ScopeKey, string>>({
        platform: '',
        tenant: '',
        agency: '',
    });
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
    const availableFilterTargets = filterTargetsByScope[activeScope];
    const selectedFilterTargetIds = selectedFilterTargetIdsByScope[activeScope] || [];
    const filterSearch = filterSearchByScope[activeScope];
    const visibleFilterTargetIds = selectedFilterTargetIds.filter((targetId) =>
        availableFilterTargets.some((target) => target.id === targetId),
    );
    const effectiveStatisticTargetIds = useMemo(
        () => getEffectiveStatisticTargetIds(activeScope, selectedFilterTargetIds),
        [activeScope, selectedFilterTargetIds],
    );
    const filteredStats = useMemo(
        () => aggregateFilterTargetStatistics(effectiveStatisticTargetIds),
        [effectiveStatisticTargetIds],
    );
    const metricOverrides = useMemo(() => buildMetricOverridesFromFilterStats(filteredStats), [filteredStats]);
    const filteredCaseCharts = useMemo(() => buildCaseChartsFromFilterStats(filteredStats), [filteredStats]);
    const filteredConversationByPeriod = useMemo(
        () => buildConversationByPeriodFromFilterStats(filteredStats),
        [filteredStats],
    );
    const selectedCasePeriod = selectedCasePeriodByScope[activeScope];
    const selectedConversationPeriod = selectedConversationPeriodByScope[activeScope];
    const selectedConversationSegment = selectedConversationSegmentByScope[activeScope];
    const caseChart = filteredCaseCharts[selectedCasePeriod] || demoCaseChartsByScope[activeScope][selectedCasePeriod];
    const conversationData =
        filteredConversationByPeriod[selectedConversationPeriod] ||
        demoConversationByScope[activeScope][selectedConversationPeriod];
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
    const yAxisLabels = useMemo(() => getCaseAxisLabels(maxCaseValue, locale), [locale, maxCaseValue]);
    const localizedCasePeriodOptions = useMemo(
        () => localizePeriodOptions(casePeriodOptions, translate, locale),
        [locale, translate],
    );
    const localizedConversationPeriodOptions = useMemo(
        () => localizePeriodOptions(conversationPeriodOptions, translate, locale),
        [locale, translate],
    );
    const chartAnimationKey = `${activeScope}-${selectedCasePeriod}-${effectiveStatisticTargetIds.join('-')}`;
    const donutAnimationKey = `${activeScope}-${selectedConversationPeriod}-${effectiveStatisticTargetIds.join('-')}`;
    const selectedFilterTargets = useMemo(
        () =>
            visibleFilterTargetIds
                .map((targetId) => availableFilterTargets.find((target) => target.id === targetId))
                .filter((target): target is FilterTarget => Boolean(target)),
        [availableFilterTargets, visibleFilterTargetIds],
    );
    const filterSuggestions = useMemo(() => {
        const normalizedSearch = normalizeFilterSearch(filterSearch, locale);

        return availableFilterTargets
            .filter((target) => !visibleFilterTargetIds.includes(target.id))
            .filter((target) =>
                normalizedSearch
                    ? [
                          target.label,
                          translateDashboardText(translate, target.detail, locale),
                          translateDashboardText(translate, target.type, locale),
                      ].some((value) => normalizeFilterSearch(value, locale).includes(normalizedSearch))
                    : true,
            )
            .slice(0, 6);
    }, [availableFilterTargets, filterSearch, locale, translate, visibleFilterTargetIds]);
    const scopeTabItems: AdminSegmentedTabItem[] = scopeOrder.map((scopeKey) => {
        const scope = scopeDefinitions[scopeKey];
        const ScopeIcon = scope.icon;

        return {
            id: scope.key,
            label: translateDashboardText(translate, scope.label, locale),
            icon: <ScopeIcon />,
        };
    });
    const updateCardMenuSelection = (cardKey: string, menuKey: CardMenuKey) => {
        setSelectedCardMenuByScope((currentSelection) => ({
            ...currentSelection,
            [activeScope]: {
                ...currentSelection[activeScope],
                [cardKey]: menuKey,
            },
        }));
    };
    const updateFilterSearch = (value: string) => {
        setFilterSearchByScope((currentSearch) => ({
            ...currentSearch,
            [activeScope]: value,
        }));
    };
    const addFilterTarget = (targetId: string) => {
        const nextTarget = availableFilterTargets.find((target) => target.id === targetId);

        if (!nextTarget) {
            return;
        }

        setSelectedFilterTargetIdsByScope((currentSelection) => {
            const currentScopeSelection = (currentSelection[activeScope] || []).filter((currentTargetId) => {
                const currentTarget = availableFilterTargets.find((target) => target.id === currentTargetId);

                return currentTarget?.type === nextTarget.type;
            });

            if (currentScopeSelection.includes(targetId)) {
                return currentSelection;
            }

            return {
                ...currentSelection,
                [activeScope]: [...currentScopeSelection, targetId],
            };
        });
        updateFilterSearch('');
    };
    const addFirstFilterSuggestion = () => {
        if (filterSuggestions[0]) {
            addFilterTarget(filterSuggestions[0].id);
        }
    };
    const removeFilterTarget = (targetId: string) => {
        setSelectedFilterTargetIdsByScope((currentSelection) => ({
            ...currentSelection,
            [activeScope]: (currentSelection[activeScope] || []).filter(
                (currentTargetId) => currentTargetId !== targetId,
            ),
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

    useEffect(() => {
        storeFilterTargetSelection(selectedFilterTargetIdsByScope);
    }, [selectedFilterTargetIdsByScope]);

    return (
        <Page>
            <div className="statisticDashboardPage">
                <Page.Title>
                    <AdminSegmentedTabs
                        className="statisticDashboard__scopeTabs"
                        activeId={activeScope}
                        ariaLabel={translateDashboardText(translate, 'Statistik-Ebene', locale)}
                        items={scopeTabItems}
                        onChange={(scopeKey) => setActiveScope(scopeKey as ScopeKey)}
                    />
                </Page.Title>

                <div className="statisticDashboard">
                    {activeScope !== 'agency' && (
                        <StatisticFilterBar
                            availableTargets={availableFilterTargets}
                            locale={locale}
                            onAddFirstSuggestion={addFirstFilterSuggestion}
                            onAddTarget={addFilterTarget}
                            onRemoveTarget={removeFilterTarget}
                            onSearchChange={updateFilterSearch}
                            searchValue={filterSearch}
                            selectedTargets={selectedFilterTargets}
                            suggestions={filterSuggestions}
                            translate={translate}
                        />
                    )}

                    <div className="statisticDashboard__summaryGrid">
                        {dashboard.topCards.map((card) => (
                            <StatisticCard
                                key={card.key}
                                card={localizeStatisticCard(
                                    getPersonalizedMetricCard(card, activeScope, metricOverrides),
                                    translate,
                                    locale,
                                )}
                                locale={locale}
                                menuValue={selectedCardMenuByScope[activeScope][card.key]}
                                onMenuChange={updateCardMenuSelection}
                                translate={translate}
                            />
                        ))}
                    </div>

                    <div className="statisticDashboard__communicationGrid">
                        {dashboard.communicationCards.map((card) => (
                            <StatisticCard
                                key={card.key}
                                card={localizeStatisticCard(
                                    getDisplayMetricCard(card, activeScope, metricOverrides),
                                    translate,
                                    locale,
                                )}
                                locale={locale}
                                translate={translate}
                            />
                        ))}
                    </div>

                    <div className="statisticDashboard__chartGrid">
                        <section className="statisticDashboard__chartCard statisticDashboard__caseChartCard">
                            <div className="statisticDashboard__chartHeader">
                                <h2>{translateDashboardText(translate, 'Beratungsfälle', locale)}</h2>
                                <PeriodSelect<CasePeriodKey>
                                    ariaLabel={translateDashboardKey(
                                        translate,
                                        'statistic.dashboard.chart.casePeriodAria',
                                        'Zeitraum für Beratungsfälle',
                                    )}
                                    onSelect={(periodKey) =>
                                        setSelectedCasePeriodByScope((currentPeriods) => ({
                                            ...currentPeriods,
                                            [activeScope]: periodKey,
                                        }))
                                    }
                                    options={localizedCasePeriodOptions}
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
                                            const barValue = bar.value.toLocaleString(locale);
                                            const dateLabel = translateDashboardDateLabel(translate, bar.dateLabel);
                                            const dayLabel = translateDashboardWeekday(translate, bar.day);

                                            return (
                                                <button
                                                    key={bar.day}
                                                    type="button"
                                                    className={`statisticDashboard__barSlot ${
                                                        isSelected ? 'statisticDashboard__barSlot--selected' : ''
                                                    }`}
                                                    aria-label={translateDashboardKey(
                                                        translate,
                                                        'statistic.dashboard.chart.caseBarAria',
                                                        `${bar.value} Beratungsfälle am ${bar.dateLabel}`,
                                                        { date: dateLabel, value: barValue },
                                                    )}
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
                                                                {barValue}
                                                            </strong>
                                                            <small>{dateLabel}</small>
                                                        </div>
                                                    )}
                                                    <span
                                                        key={`${chartAnimationKey}-${bar.day}`}
                                                        className={`statisticDashboard__bar ${
                                                            isSelected ? 'statisticDashboard__bar--highlight' : ''
                                                        } ${bar.value === 0 ? 'statisticDashboard__bar--empty' : ''}`}
                                                        style={barStyle}
                                                    />
                                                    <small className="statisticDashboard__barDayLabel">
                                                        {dayLabel}
                                                    </small>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="statisticDashboard__chartCard statisticDashboard__donutCard">
                            <div className="statisticDashboard__chartHeader">
                                <h2>{translateDashboardText(translate, 'Gesprächstyp', locale)}</h2>
                                <PeriodSelect<ConversationPeriodKey>
                                    ariaLabel={translateDashboardKey(
                                        translate,
                                        'statistic.dashboard.chart.conversationPeriodAria',
                                        'Zeitraum für Gesprächstyp',
                                    )}
                                    onSelect={(periodKey) =>
                                        setSelectedConversationPeriodByScope((currentPeriods) => ({
                                            ...currentPeriods,
                                            [activeScope]: periodKey,
                                        }))
                                    }
                                    options={localizedConversationPeriodOptions}
                                    value={selectedConversationPeriod}
                                />
                            </div>

                            <div className="statisticDashboard__donutContent">
                                <DonutChart
                                    animationKey={donutAnimationKey}
                                    data={conversationData}
                                    locale={locale}
                                    onSegmentSelect={selectConversationSegment}
                                    selectedSegmentLabel={selectedConversationSegmentLabel}
                                    translate={translate}
                                />

                                <div className="statisticDashboard__legend">
                                    {conversationData.segments.map((segment) => {
                                        const segmentPercentage = getConversationSegmentPercentage(
                                            segment,
                                            conversationData.segments,
                                        );
                                        const isSelected = segment.label === selectedConversationSegmentLabel;
                                        const segmentLabel = translateDashboardText(
                                            translate,
                                            segment.displayLabel || segment.label,
                                            locale,
                                        );
                                        const segmentAriaLabel = translateDashboardText(
                                            translate,
                                            segment.label,
                                            locale,
                                        );
                                        const segmentValue = formatDashboardNumberText(`${segment.value}`, locale);

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
                                                <p aria-label={segmentAriaLabel}>{segmentLabel}</p>
                                                <span
                                                    className="statisticDashboard__legendMeta"
                                                    aria-label={translateDashboardKey(
                                                        translate,
                                                        'statistic.dashboard.chart.segmentMetaAria',
                                                        `${segment.value} Gespräche, ${segmentPercentage}%`,
                                                        {
                                                            percentage: segmentPercentage,
                                                            value: segmentValue,
                                                        },
                                                    )}
                                                >
                                                    <strong>{segmentValue}</strong>
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
