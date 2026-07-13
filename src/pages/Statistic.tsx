import { Close } from '@mui/icons-material';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { AdminSegmentedTabs } from '../components/AdminSegmentedTabs/AdminSegmentedTabs';
import { Page } from '../components/Page';
import SearchInput from '../components/SearchInput/SearchInput';
import { AnimatedValue, StatisticCard } from '../components/StatisticCard/StatisticCard';
import { UserRole } from '../enums/UserRole';
import { useUserRoles } from '../hooks/useUserRoles.hook';
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
import {
    buildCaseChartDateLabels,
    caseChartDayCodes,
    getTodayDayCode,
    NO_DATA_LABEL,
} from './Statistic/statisticDashboardData';
import type {
    ConversationValues,
    FilterTarget,
    FilterTargetMetricStats,
    FilterTargetStatistics,
    MetricValue,
    StatisticData,
    TopicStatistic,
} from './Statistic/statisticDashboardData';
import { useStatisticDashboardData } from './Statistic/useStatisticDashboardData.hook';
import type {
    CardMenuKey,
    CardMenuOption,
    CaseChartBar,
    CasePeriodKey,
    ConversationSegment,
    ConversationPeriodData,
    ConversationPeriodKey,
    ScopeDashboard,
    ScopeDefinition,
    ScopeKey,
    SelectedFilterTargetIdsByScope,
    SelectedCardMenuByScope,
    StatisticCardDefinition,
    TrendBadgeDefinition,
} from './Statistic/types';
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
    'Aktuell in Beratung': 'statistic.dashboard.text.currentlyInCounselling',
    'Statistik unterdrückt': 'statistic.dashboard.filter.suppressed',
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
    description: option.description
        ? translateDashboardText(translate, option.description, locale)
        : option.description,
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

const getAllowedStatisticScopes = (
    isSuperAdmin: boolean,
    hasRole: (role: UserRole | UserRole[]) => boolean,
): ScopeKey[] => {
    if (isSuperAdmin) {
        return scopeOrder;
    }

    if (hasRole([UserRole.TenantAdmin, UserRole.SingleTenantAdmin])) {
        return ['tenant', 'agency'];
    }

    if (hasRole([UserRole.AgencyAdmin, UserRole.RestrictedAgencyAdmin])) {
        return ['agency'];
    }

    return ['agency'];
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

const metricMenuDescriptionByKey: Record<CardMenuKey, string> = {
    activeAgencies: 'Zeigt, welche Beratungsstellen aktiv eingebunden sind und wo Kapazität entsteht.',
    activeConversations: 'Macht heute aktive Gespräche sichtbar, damit Spitzen früh erkannt werden.',
    activeCounselors: 'Zeigt aktive Beratende und hilft bei Dienst- und Vertretungsplanung.',
    all: 'Bündelt alle Anfragen über die verfügbaren Chattypen hinweg.',
    cases: 'Zeigt aktive Beratungsfälle und macht Falllasten schneller einschätzbar.',
    consultations: 'Zeigt Beratungsgespräche und macht Nutzungsintensität je Zeitraum sichtbar.',
    conversationsTotal: 'Zeigt laufende Gespräche für einen schnellen Blick auf die Aktivität.',
    counselors: 'Zeigt verfügbare Beratende für Tagessteuerung und Auslastung.',
    groups: 'Macht Gruppenanfragen sichtbar und unterstützt die Planung von Gesprächskreisen.',
    liveChat: 'Zeigt Sofortkontakte, damit Live-Beratungszeiten besser geplant werden.',
    messagesCounselors: 'Misst Antworten der Beratenden und unterstützt die Auslastungssteuerung.',
    messagesPerSession: 'Zeigt die durchschnittliche Nachrichtentiefe pro Gespräch.',
    messagesSeekers: 'Misst Aktivität der Ratsuchenden und zeigt Kommunikationsbedarf.',
    oneToOne: 'Fokussiert klassische 1:1-Beratung und macht Nachfrage-Spitzen sichtbar.',
    phoneShare: 'Zeigt, wie stark Telefonkontakte im Gesamtvolumen genutzt werden.',
    previousMonth: 'Vergleicht, welches Thema im letzten Monat die Beratung geprägt hat.',
    textMessagesTotal: 'Macht schriftliche Beratungsarbeit und asynchrone Kontakte sichtbar.',
    threeMonthsAgo: 'Zeigt, ob Themen über drei Monate stabil bleiben oder kippen.',
    topTopic: 'Zeigt das häufigste Thema und unterstützt Themen- und Ressourcenplanung.',
    twoMonthsAgo: 'Vergleicht, welches Thema vor zwei Monaten besonders sichtbar war.',
    videoCallCount: 'Zeigt die Anzahl der Videoanrufe für fachliche und technische Planung.',
    videoShare: 'Macht Videoberatung als Anteil an allen Kontakten sichtbar.',
    voiceShare: 'Zeigt Sprachnachrichten und deren Bedeutung für barriereärmere Kommunikation.',
};

const withMetricMenuDescription = (option: CardMenuOption): CardMenuOption => ({
    ...option,
    description: option.description || metricMenuDescriptionByKey[option.key],
});

const formatIntegerMetric = (value: number) => value.toLocaleString('de-DE');

const getEmptyFilterTargetStatistics = (): FilterTargetStatistics => ({
    suppressed: false,
    enquiriesPreviousMonth: null,
    metrics: {
        activeAgencies: null,
        activeConversations: null,
        cases: null,
        conversationsTotal: null,
        counselors: null,
        groups: null,
        liveChat: null,
        messagesCounselors: null,
        messagesSeekers: null,
        oneToOne: null,
        phoneCalls: null,
        textMessagesTotal: null,
        videoCalls: null,
        voiceMessages: null,
        topTopic: { label: NO_DATA_LABEL, share: 0 },
        previousMonth: { label: NO_DATA_LABEL, share: 0 },
        twoMonthsAgo: { label: NO_DATA_LABEL, share: 0 },
        threeMonthsAgo: { label: NO_DATA_LABEL, share: 0 },
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

const addMetricValues = (first: MetricValue, second: MetricValue): MetricValue =>
    first === null && second === null ? null : (first ?? 0) + (second ?? 0);

const aggregateFilterTargetStatistics = (targetIds: string[], statisticsById: Record<string, FilterTargetStatistics>) =>
    targetIds.reduce<FilterTargetStatistics>((aggregatedStats, targetId) => {
        const targetStats = statisticsById[targetId];

        // KDG small-cell suppression: suppressed targets contribute nothing
        if (!targetStats || targetStats.suppressed) {
            return aggregatedStats;
        }

        const metrics = numericFilterMetricKeys.reduce<FilterTargetMetricStats>(
            (nextMetrics, metricKey) => ({
                ...nextMetrics,
                [metricKey]: addMetricValues(aggregatedStats.metrics[metricKey], targetStats.metrics[metricKey]),
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
            suppressed: false,
            enquiriesPreviousMonth: addMetricValues(
                aggregatedStats.enquiriesPreviousMonth,
                targetStats.enquiriesPreviousMonth,
            ),
            caseCharts,
            conversation,
            metrics,
        };
    }, getEmptyFilterTargetStatistics());

const getEffectiveStatisticTargetIds = (
    activeScope: ScopeKey,
    selectedTargetIds: string[],
    statisticData: StatisticData,
) => {
    const selectableTargetIds = new Set(statisticData.targetsByScope[activeScope].map((target) => target.id));
    const selectedAvailableTargetIds = selectedTargetIds.filter(
        (targetId) => selectableTargetIds.has(targetId) && Boolean(statisticData.statisticsById[targetId]),
    );

    return selectedAvailableTargetIds.length
        ? selectedAvailableTargetIds
        : statisticData.fallbackIdsByScope[activeScope];
};

const formatMetricValue = (value: MetricValue) => (value === null ? NO_DATA_LABEL : formatIntegerMetric(value));

const buildChangeTrend = (current: MetricValue, previous: MetricValue): TrendBadgeDefinition | undefined => {
    if (current === null || previous === null || (previous === 0 && current === 0)) {
        return undefined;
    }

    const change = previous === 0 ? 100 : Math.round(((current - previous) / previous) * 100);
    const magnitude = Math.abs(change);

    if (change < 0) {
        return { value: `~ ${magnitude}%`, tone: 'red', direction: magnitude >= 15 ? 'down' : 'downRight' };
    }

    return { value: `~ ${magnitude}%`, tone: 'blue', direction: magnitude >= 15 ? 'up' : 'upRight' };
};

const buildTopicTrend = (topic: TopicStatistic): TrendBadgeDefinition | undefined =>
    topic.share > 0 ? { value: `~ ${topic.share}%`, tone: 'dark' } : undefined;

/**
 * Maps aggregated real statistics onto the dashboard metric slots. Metrics without an
 * application-layer data source are rendered as "Keine Daten"; trends are only shown
 * where a real comparison value exists (requests vs. previous month, topic shares).
 */
const buildMetricOverridesFromFilterStats = (
    stats: FilterTargetStatistics,
): Partial<Record<CardMenuKey, Partial<CardMenuOption>>> => {
    const requestTrend = buildChangeTrend(stats.metrics.oneToOne, stats.enquiriesPreviousMonth);
    const requestDetail =
        stats.enquiriesPreviousMonth !== null
            ? `Vormonat gesamt ${formatIntegerMetric(stats.enquiriesPreviousMonth)}`
            : undefined;

    return {
        activeAgencies: {
            value: formatMetricValue(stats.metrics.activeAgencies),
            detail: 'zugeordnete Beratungsstellen',
            trend: undefined,
        },
        activeConversations: {
            value: formatMetricValue(stats.metrics.activeConversations),
            detail: 'heute aktiv',
            trend: undefined,
        },
        activeCounselors: {
            value: formatMetricValue(stats.metrics.counselors),
            detail: undefined,
            trend: undefined,
        },
        all: {
            value: formatMetricValue(stats.metrics.oneToOne),
            detail: requestDetail,
            trend: requestTrend,
        },
        cases: {
            value: formatMetricValue(stats.metrics.cases),
            detail: 'Aktuell in Beratung',
            trend: undefined,
        },
        consultations: { value: NO_DATA_LABEL, detail: undefined, trend: undefined },
        conversationsTotal: {
            value: formatMetricValue(stats.metrics.conversationsTotal),
            detail: 'gesamt',
            trend: undefined,
        },
        counselors: {
            value: formatMetricValue(stats.metrics.counselors),
            detail: undefined,
            trend: undefined,
        },
        groups: {
            value: formatMetricValue(stats.metrics.groups),
            detail: 'gesamt',
            trend: undefined,
        },
        liveChat: { value: NO_DATA_LABEL, detail: undefined, trend: undefined },
        messagesCounselors: { value: NO_DATA_LABEL, detail: undefined, trend: undefined },
        messagesPerSession: { value: NO_DATA_LABEL, detail: undefined, trend: undefined },
        messagesSeekers: { value: NO_DATA_LABEL, detail: undefined, trend: undefined },
        oneToOne: {
            value: formatMetricValue(stats.metrics.oneToOne),
            detail: '1:1-Anfragen',
            trend: requestTrend,
        },
        phoneShare: { value: NO_DATA_LABEL, detail: undefined, trend: undefined },
        previousMonth: {
            value: stats.metrics.previousMonth.label,
            detail: 'Letzter Monat',
            trend: buildTopicTrend(stats.metrics.previousMonth),
        },
        textMessagesTotal: { value: NO_DATA_LABEL, detail: undefined, trend: undefined },
        threeMonthsAgo: {
            value: stats.metrics.threeMonthsAgo.label,
            detail: 'Vor 3 Monaten',
            trend: buildTopicTrend(stats.metrics.threeMonthsAgo),
        },
        topTopic: {
            value: stats.metrics.topTopic.label,
            detail: 'Dieser Monat',
            trend: buildTopicTrend(stats.metrics.topTopic),
        },
        twoMonthsAgo: {
            value: stats.metrics.twoMonthsAgo.label,
            detail: 'Vor 2 Monaten',
            trend: buildTopicTrend(stats.metrics.twoMonthsAgo),
        },
        videoCallCount: { value: NO_DATA_LABEL, detail: undefined, trend: undefined },
        videoShare: { value: NO_DATA_LABEL, detail: undefined, trend: undefined },
        voiceShare: { value: NO_DATA_LABEL, detail: undefined, trend: undefined },
    };
};

const buildCaseChartsFromFilterStats = (
    stats: FilterTargetStatistics,
    dateLabelsByPeriod: Record<CasePeriodKey, string[]>,
    todayDayCode: string,
): Record<CasePeriodKey, CaseChartBar[]> =>
    casePeriodOptions.reduce(
        (charts, { key }) => ({
            ...charts,
            [key]: caseChartDayCodes.map((day, index) => ({
                day,
                dateLabel: dateLabelsByPeriod[key][index],
                value: stats.caseCharts[key][index],
                isDefaultSelected: day === todayDayCode,
            })),
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

const noSourceMetricOverride: Partial<CardMenuOption> = {
    value: NO_DATA_LABEL,
    detail: undefined,
    trend: undefined,
};

const applyMetricOverride = <Metric extends StatisticCardDefinition | CardMenuOption>(
    metric: Metric,
    metricOverrides: Partial<Record<CardMenuKey, Partial<CardMenuOption>>>,
    metricKey?: CardMenuKey,
): Metric => {
    if (!metricKey) {
        return metric;
    }

    const override = metricOverrides[metricKey] ?? noSourceMetricOverride;

    return { ...metric, ...override };
};

const getDisplayMetricCard = (
    card: StatisticCardDefinition,
    metricOverrides: Partial<Record<CardMenuKey, Partial<CardMenuOption>>>,
) => applyMetricOverride(card, metricOverrides, defaultMetricKeyByCardKey[card.key]);

const getPersonalizedMetricCard = (
    card: StatisticCardDefinition,
    activeScope: ScopeKey,
    metricOverrides: Partial<Record<CardMenuKey, Partial<CardMenuOption>>>,
): StatisticCardDefinition => {
    const displayCard = getDisplayMetricCard(card, metricOverrides);

    return {
        ...displayCard,
        defaultMenuKey: defaultMetricKeyByCardKey[card.key],
        menuAriaLabel: 'Kennzahl in diesem Dashboard-Slot auswählen',
        menuLabel: 'Meine Kennzahl',
        menuOptions: dashboardMetricOptionsByScope[activeScope]
            .filter((option) => !duplicatedCommunicationMetricKeys.has(option.key))
            .map((option) => withMetricMenuDescription(applyMetricOverride(option, metricOverrides, option.key))),
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
    },
};

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
    const { hasRole, isSuperAdmin } = useUserRoles();
    const allowedScopeKeys = useMemo(() => getAllowedStatisticScopes(isSuperAdmin, hasRole), [hasRole, isSuperAdmin]);
    const allowedScopeKey = allowedScopeKeys.join('|');
    const defaultScope = allowedScopeKeys[0] || 'agency';
    const [activeScope, setActiveScope] = useState<ScopeKey>(defaultScope);
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
    const { data: statisticData, isError: hasStatisticLoadError } = useStatisticDashboardData();
    const caseChartDateLabelsByPeriod = useMemo(() => buildCaseChartDateLabels(new Date()), []);
    const todayDayCode = useMemo(() => getTodayDayCode(new Date()), []);
    const dashboard = dashboardByScope[activeScope];
    const availableFilterTargets = statisticData.targetsByScope[activeScope];
    const selectedFilterTargetIds = selectedFilterTargetIdsByScope[activeScope] || [];
    const filterSearch = filterSearchByScope[activeScope];
    const visibleFilterTargetIds = selectedFilterTargetIds.filter((targetId) =>
        availableFilterTargets.some((target) => target.id === targetId),
    );
    const effectiveStatisticTargetIds = useMemo(
        () => getEffectiveStatisticTargetIds(activeScope, selectedFilterTargetIds, statisticData),
        [activeScope, selectedFilterTargetIds, statisticData],
    );
    const filteredStats = useMemo(
        () => aggregateFilterTargetStatistics(effectiveStatisticTargetIds, statisticData.statisticsById),
        [effectiveStatisticTargetIds, statisticData.statisticsById],
    );
    const suppressedSelectedTargetCount = useMemo(
        () =>
            effectiveStatisticTargetIds.filter((targetId) => statisticData.statisticsById[targetId]?.suppressed).length,
        [effectiveStatisticTargetIds, statisticData.statisticsById],
    );
    const metricOverrides = useMemo(() => buildMetricOverridesFromFilterStats(filteredStats), [filteredStats]);
    const filteredCaseCharts = useMemo(
        () => buildCaseChartsFromFilterStats(filteredStats, caseChartDateLabelsByPeriod, todayDayCode),
        [caseChartDateLabelsByPeriod, filteredStats, todayDayCode],
    );
    const filteredConversationByPeriod = useMemo(
        () => buildConversationByPeriodFromFilterStats(filteredStats),
        [filteredStats],
    );
    const selectedCasePeriod = selectedCasePeriodByScope[activeScope];
    const selectedConversationPeriod = selectedConversationPeriodByScope[activeScope];
    const selectedConversationSegment = selectedConversationSegmentByScope[activeScope];
    const caseChart = filteredCaseCharts[selectedCasePeriod];
    const conversationData = filteredConversationByPeriod[selectedConversationPeriod];
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
    const scopeTabItems: AdminSegmentedTabItem[] = allowedScopeKeys.map((scopeKey) => {
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

    useEffect(() => {
        if (!allowedScopeKeys.includes(activeScope)) {
            setActiveScope(defaultScope);
        }
    }, [activeScope, allowedScopeKey, defaultScope]);

    return (
        <Page>
            <Page.Title>
                <AdminSegmentedTabs
                    className="statisticDashboard__scopeTabs"
                    activeId={activeScope}
                    ariaLabel={translateDashboardText(translate, 'Statistik-Ebene', locale)}
                    items={scopeTabItems}
                    onChange={(scopeKey) => setActiveScope(scopeKey as ScopeKey)}
                />
            </Page.Title>
            <div className="statisticDashboardPage">
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

                    <div key={activeScope} className="statisticDashboard__animatedContent">
                        {hasStatisticLoadError && (
                            <p className="statisticDashboard__notice statisticDashboard__notice--error" role="alert">
                                {translateDashboardKey(
                                    translate,
                                    'statistic.dashboard.loadError',
                                    'Statistikdaten konnten nicht geladen werden.',
                                )}
                            </p>
                        )}
                        {statisticData.suppressionDisabled && (
                            <p className="statisticDashboard__notice statisticDashboard__notice--warning" role="alert">
                                {translateDashboardKey(
                                    translate,
                                    'statistic.dashboard.suppressionDisabledNotice',
                                    'Kleinzellen-Schutz deaktiviert – nur für Testumgebungen',
                                )}
                            </p>
                        )}
                        {suppressedSelectedTargetCount > 0 && (
                            <p className="statisticDashboard__notice statisticDashboard__notice--info">
                                {translateDashboardKey(
                                    translate,
                                    'statistic.dashboard.suppressedNotice',
                                    'Für Bereiche mit weniger als zwei Beratenden werden aus Datenschutzgründen keine Statistiken angezeigt.',
                                )}
                            </p>
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
                                        getDisplayMetricCard(card, metricOverrides),
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
                                                            } ${
                                                                bar.value === 0 ? 'statisticDashboard__bar--empty' : ''
                                                            }`}
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
            </div>
        </Page>
    );
};
