import { Close } from '@mui/icons-material';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { CSVLink } from 'react-csv';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import ActiveAgenciesIcon from '@mui/icons-material/HomeWorkOutlined';
import ConversationsIcon from '@mui/icons-material/QuestionAnswerOutlined';
import PhoneCallsIcon from '@mui/icons-material/PhoneOutlined';
import RequestsIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import TextMessagesIcon from '@mui/icons-material/KeyboardOutlined';
import TopicIcon from '@mui/icons-material/CategoryOutlined';
import VideoCallsIcon from '@mui/icons-material/VideocamOutlined';
import VoiceMessagesIcon from '@mui/icons-material/MicNoneOutlined';
import routePathNames from '../appConfig';
import { AdminSegmentedTabs } from '../components/AdminSegmentedTabs/AdminSegmentedTabs';
import { DashboardEmptyState } from '../components/DashboardEmptyState/DashboardEmptyState';
import { Page } from '../components/Page';
import { CardGrid } from '../components/CardGrid';
import cardStyles from '../components/Card/styles.module.scss';
import { GlobalSearchBar } from '../components/GlobalSearch';
import Spinner from '../components/Spinner/Spinner';
import { AnimatedValue, StatisticCard } from '../components/StatisticCard/StatisticCard';
import { UserRole } from '../enums/UserRole';
import { useUserRoles } from '../hooks/useUserRoles.hook';
import { ReactComponent as DownloadIcon } from '../resources/img/svg/download.svg';
import statisticsPreviewIllustration from '../resources/img/tile-help/statistics/tracking.webp';
import { ReactComponent as CalendarIcon } from '../resources/img/svg/statistics-dashboard/calendar.svg';
import { ReactComponent as ChevronDownIcon } from '../resources/img/svg/statistics-dashboard/chevron-down.svg';
import { ReactComponent as ScopeAgencyIcon } from '../resources/img/svg/statistics-dashboard/scope-agency.svg';
import { ReactComponent as ScopePlatformIcon } from '../resources/img/svg/statistics-dashboard/scope-platform.svg';
import { ReactComponent as ScopeTenantIcon } from '../resources/img/svg/statistics-dashboard/scope-tenant.svg';
import { conversationPeriodOptions, defaultSelectedCaseDayByScope, scopeOrder } from './Statistic/statisticConstants';
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
    buildCasePeriodOptions,
    buildConversationPeriodOptions,
    buildCaseWeekOverview,
    CASE_WEEK_OVERVIEW_KEY,
    caseChartDayCodes,
    casePeriodKeyForWeek,
    DEFAULT_CHART_WEEKS,
    DEFAULT_TOPIC_MONTHS,
    emptyCaseCharts,
    getTodayDayCode,
    NO_DATA_LABEL,
    noDataTopics,
    topicMenuKeyForMonth,
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
import { TutorialStatisticsSection } from './Statistic/TutorialStatisticsSection';
import { StatisticInfoRow } from './Statistic/StatisticInfoRow';
import { useStatisticDashboardData } from './Statistic/useStatisticDashboardData.hook';
import type {
    CardMenuKey,
    CardMenuOption,
    CardMenuOptionBlueprint,
    CaseChartBar,
    CasePeriodKey,
    ConversationSegment,
    ConversationPeriodData,
    ConversationPeriodKey,
    ScopeDashboardBlueprint,
    ScopeDefinition,
    ScopeKey,
    SelectedFilterTargetIdsByScope,
    SelectedCardMenuByScope,
    StatisticCardBlueprint,
    StatisticCardDefinition,
    StatisticEmptyKind,
    TrendBadgeDefinition,
} from './Statistic/types';
import type { AdminSegmentedTabItem } from '../components/AdminSegmentedTabs/AdminSegmentedTabs';
import { Notify } from '../components/Notify';
import { HintText } from '../components/HintText';

/** Visible anchor of the dashboard's load state: where "Ansehen" and the quiet text live. */
const STATISTIC_STATE_ID = 'statistic-dashboard-state';

const conversationSegmentBlueprint = [
    { label: 'Mail', color: 'var(--statistic-series-mail)' },
    { label: 'Live', color: 'var(--statistic-series-live)' },
    { label: 'Gesprächskreise', displayLabel: 'Gesprächs\nkreise', color: 'var(--statistic-series-groups)' },
    { label: 'Interna', color: 'var(--statistic-series-internal)' },
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
    'wird noch nicht erfasst': 'statistic.dashboard.empty.notTracked',
    'noch keine Daten': 'statistic.dashboard.empty.noDataYet',
    'konnte nicht geladen werden': 'statistic.dashboard.empty.loadFailed',
    'zeigt sich ab dem ersten Gespräch': 'statistic.dashboard.empty.topicPending',
    'Aktuell in Beratung': 'statistic.dashboard.text.currentlyInCounselling',
    'Statistik unterdrückt': 'statistic.dashboard.filter.suppressed',
    'Geschützt – zu wenige aktive Beratende': 'statistic.dashboard.empty.protected',
    'Keine Filter verfügbar': 'statistic.dashboard.filter.noFilters',
    'Letzter Monat': 'statistic.dashboard.text.lastMonth',
    Live: 'statistic.dashboard.text.live',
    'Live-Chat': 'statistic.dashboard.text.liveChat',
    'Live-Chat-Anfragen': 'statistic.dashboard.text.liveChatRequests',
    'Meine Kennzahl': 'statistic.dashboard.menu.myMetric',
    'Nachrichten Beratende': 'statistic.dashboard.text.counselorMessages',
    'Nachrichten pro Gespräch': 'statistic.dashboard.text.messagesPerConversation',
    'Nachrichten Ratsuchende': 'statistic.dashboard.text.seekerMessages',
    Mail: 'statistic.dashboard.text.counseling',
    'Mail (1:1)': 'statistic.dashboard.text.oneToOneCounseling',
    'Mail / 1:1-Anfragen': 'statistic.dashboard.text.counselingOneToOneRequests',
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

const countedDashboardLabels: Array<{ pattern: RegExp; key: string }> = [
    { pattern: /^vor (\d+) Wochen$/, key: 'statistic.dashboard.period.weeksAgo' },
    { pattern: /^(\d+) Wochen im Überblick$/, key: 'statistic.dashboard.period.weekOverview' },
    { pattern: /^Thema vor (\d+) Monaten$/, key: 'statistic.dashboard.text.topicMonthsAgo' },
    { pattern: /^Vor (\d+) Monaten$/, key: 'statistic.dashboard.text.monthsAgo' },
];

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

    if (key) {
        return translateDashboardKey(translate, key, value);
    }

    // Labels generated for the configurable chart and topic windows (UserService#1544)
    const countedLabel = countedDashboardLabels.find(({ pattern }) => pattern.test(value));

    if (countedLabel) {
        const count = Number(value.match(countedLabel.pattern)?.[1]);

        return translateDashboardKey(translate, countedLabel.key, value, { count });
    }

    return value;
};

const translateDashboardValue = (translate: DashboardTranslate, value: string, locale: string) => {
    const translatedValue = translateDashboardText(translate, value, locale);

    return translatedValue === value ? formatDashboardNumberText(value, locale) : translatedValue;
};

const translateDashboardWeekday = (translate: DashboardTranslate, day: string) => {
    const weekdayKey = dashboardWeekdayKeyByValue[day];

    return weekdayKey ? translateDashboardKey(translate, `statistic.dashboard.weekday.${weekdayKey}`, day) : day;
};

const translateCalendarWeek = (translate: DashboardTranslate, label: string) =>
    label.replace(/^KW (\d+)/, (calendarWeek, week: string) =>
        translateDashboardKey(translate, 'statistic.dashboard.chart.calendarWeek', calendarWeek, { week }),
    );

const translateDashboardDateLabel = (translate: DashboardTranslate, dateLabel: string) =>
    translateCalendarWeek(
        translate,
        dateLabel.replace(/^(Mo|Di|Mi|Do|Fr|Sa|So)(?=,)/, (day) => translateDashboardWeekday(translate, day)),
    );

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
    emptyHint: option.emptyHint ? translateDashboardText(translate, option.emptyHint, locale) : option.emptyHint,
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
    emptyHint: card.emptyHint ? translateDashboardText(translate, card.emptyHint, locale) : card.emptyHint,
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

const dashboardMetricOptionsByScope: Record<ScopeKey, CardMenuOptionBlueprint[]> = {
    platform: [
        {
            key: 'all',
            label: 'Anfragen gesamt',
            title: 'Anfragen gesamt',
            icon: RequestsIcon,
        },
        {
            key: 'oneToOne',
            label: 'Mail (1:1)',
            title: 'Mail (1:1)',
            icon: RequestsIcon,
        },
        {
            key: 'liveChat',
            label: 'Live-Chat',
            title: 'Live-Chat',
            icon: RequestsIcon,
        },
        {
            key: 'groups',
            label: 'Gruppen',
            title: 'Gruppen',
            icon: RequestsIcon,
        },
        {
            key: 'cases',
            label: 'Anzahl Beratungsfälle',
            title: 'Beratungsfälle',
            icon: ConversationsIcon,
            iconTone: 'muted',
        },
        {
            key: 'conversationsTotal',
            label: 'Gespräche insgesamt',
            title: 'Gespräche insgesamt',
            icon: ConversationsIcon,
        },
        {
            key: 'textMessagesTotal',
            label: 'Textnachrichten',
            title: 'Textnachrichten',
            icon: TextMessagesIcon,
            iconTone: 'muted',
        },
        {
            key: 'messagesSeekers',
            label: 'Anzahl Nachrichten Ratsuchende',
            title: 'Nachrichten Ratsuchende',
            icon: TextMessagesIcon,
            iconTone: 'muted',
        },
        {
            key: 'messagesCounselors',
            label: 'Anzahl Nachrichten Beratende',
            title: 'Nachrichten Beratende',
            icon: TextMessagesIcon,
            iconTone: 'muted',
        },
        {
            key: 'phoneShare',
            label: 'Anruf-Anteil',
            title: 'Anrufe',
            icon: PhoneCallsIcon,
            iconTone: 'coral',
        },
        {
            key: 'videoShare',
            label: 'Videoanruf-Anteil',
            title: 'Videoanrufe',
            icon: VideoCallsIcon,
            iconTone: 'danger',
        },
        {
            key: 'videoCallCount',
            label: 'Anzahl Videoanrufe',
            title: 'Anzahl Videoanrufe',
            icon: VideoCallsIcon,
            iconTone: 'danger',
        },
        {
            key: 'voiceShare',
            label: 'Sprachnachrichten',
            title: 'Sprachnachrichten',
            icon: VoiceMessagesIcon,
            iconTone: 'coral',
        },
        {
            key: 'activeAgencies',
            label: 'Beratungsstellen',
            title: 'aktive Beratungsstellen',
            icon: ActiveAgenciesIcon,
        },
        {
            key: 'counselors',
            label: 'aktive Beratende',
            title: 'aktive Beratende',
            icon: ActiveAgenciesIcon,
        },
        {
            key: 'messagesPerSession',
            label: 'Ø Nachrichten/Gespräch',
            title: 'Nachrichten pro Gespräch',
            icon: TextMessagesIcon,
            iconTone: 'muted',
        },
        {
            key: 'activeConversations',
            label: 'aktive Gespräche',
            title: 'aktive Gespräche',
            icon: ConversationsIcon,
            iconTone: 'muted',
        },
    ],
    tenant: [
        {
            key: 'all',
            label: 'Anfragen gesamt',
            title: 'Anfragen gesamt',
            icon: RequestsIcon,
        },
        {
            key: 'oneToOne',
            label: 'Mail (1:1)',
            title: 'Mail (1:1)',
            icon: RequestsIcon,
        },
        {
            key: 'liveChat',
            label: 'Live-Chat',
            title: 'Live-Chat',
            icon: RequestsIcon,
        },
        {
            key: 'groups',
            label: 'Gruppen',
            title: 'Gruppen',
            icon: RequestsIcon,
        },
        {
            key: 'cases',
            label: 'Anzahl Beratungsfälle',
            title: 'Beratungsfälle',
            icon: ConversationsIcon,
            iconTone: 'muted',
        },
        {
            key: 'conversationsTotal',
            label: 'Gespräche insgesamt',
            title: 'Gespräche insgesamt',
            icon: ConversationsIcon,
        },
        {
            key: 'textMessagesTotal',
            label: 'Textnachrichten',
            title: 'Textnachrichten',
            icon: TextMessagesIcon,
            iconTone: 'muted',
        },
        {
            key: 'messagesSeekers',
            label: 'Anzahl Nachrichten Ratsuchende',
            title: 'Nachrichten Ratsuchende',
            icon: TextMessagesIcon,
            iconTone: 'muted',
        },
        {
            key: 'messagesCounselors',
            label: 'Anzahl Nachrichten Beratende',
            title: 'Nachrichten Beratende',
            icon: TextMessagesIcon,
            iconTone: 'muted',
        },
        {
            key: 'phoneShare',
            label: 'Anruf-Anteil',
            title: 'Anrufe',
            icon: PhoneCallsIcon,
            iconTone: 'coral',
        },
        {
            key: 'videoShare',
            label: 'Videoanruf-Anteil',
            title: 'Videoanrufe',
            icon: VideoCallsIcon,
            iconTone: 'danger',
        },
        {
            key: 'videoCallCount',
            label: 'Anzahl Videoanrufe',
            title: 'Anzahl Videoanrufe',
            icon: VideoCallsIcon,
            iconTone: 'danger',
        },
        {
            key: 'voiceShare',
            label: 'Sprachnachrichten',
            title: 'Sprachnachrichten',
            icon: VoiceMessagesIcon,
            iconTone: 'coral',
        },
        {
            key: 'activeAgencies',
            label: 'Beratungsstellen',
            title: 'aktive Beratungsstellen',
            icon: ActiveAgenciesIcon,
        },
        {
            key: 'counselors',
            label: 'aktive Beratende',
            title: 'aktive Beratende',
            icon: ActiveAgenciesIcon,
        },
        {
            key: 'messagesPerSession',
            label: 'Ø Nachrichten/Gespräch',
            title: 'Nachrichten pro Gespräch',
            icon: TextMessagesIcon,
            iconTone: 'muted',
        },
        {
            key: 'activeConversations',
            label: 'aktive Gespräche',
            title: 'aktive Gespräche',
            icon: ConversationsIcon,
            iconTone: 'muted',
        },
    ],
    agency: [
        {
            key: 'all',
            label: 'Anfragen gesamt',
            title: 'Anfragen gesamt',
            icon: RequestsIcon,
        },
        {
            key: 'oneToOne',
            label: 'Mail (1:1)',
            title: 'Mail (1:1)',
            icon: RequestsIcon,
        },
        {
            key: 'liveChat',
            label: 'Live-Chat',
            title: 'Live-Chat',
            icon: RequestsIcon,
        },
        {
            key: 'groups',
            label: 'Gruppen',
            title: 'Gruppen',
            icon: RequestsIcon,
        },
        {
            key: 'cases',
            label: 'Anzahl Beratungsfälle',
            title: 'Beratungsfälle',
            icon: ConversationsIcon,
            iconTone: 'muted',
        },
        {
            key: 'conversationsTotal',
            label: 'Gespräche insgesamt',
            title: 'Gespräche insgesamt',
            icon: ConversationsIcon,
        },
        {
            key: 'textMessagesTotal',
            label: 'Textnachrichten',
            title: 'Textnachrichten',
            icon: TextMessagesIcon,
            iconTone: 'muted',
        },
        {
            key: 'messagesSeekers',
            label: 'Anzahl Nachrichten Ratsuchende',
            title: 'Nachrichten Ratsuchende',
            icon: TextMessagesIcon,
            iconTone: 'muted',
        },
        {
            key: 'messagesCounselors',
            label: 'Anzahl Nachrichten Beratende',
            title: 'Nachrichten Beratende',
            icon: TextMessagesIcon,
            iconTone: 'muted',
        },
        {
            key: 'phoneShare',
            label: 'Anruf-Anteil',
            title: 'Anrufe',
            icon: PhoneCallsIcon,
            iconTone: 'coral',
        },
        {
            key: 'videoShare',
            label: 'Videoanruf-Anteil',
            title: 'Videoanrufe',
            icon: VideoCallsIcon,
            iconTone: 'danger',
        },
        {
            key: 'videoCallCount',
            label: 'Anzahl Videoanrufe',
            title: 'Anzahl Videoanrufe',
            icon: VideoCallsIcon,
            iconTone: 'danger',
        },
        {
            key: 'voiceShare',
            label: 'Sprachnachrichten',
            title: 'Sprachnachrichten',
            icon: VoiceMessagesIcon,
            iconTone: 'coral',
        },
        {
            key: 'activeCounselors',
            label: 'aktive Beratende',
            title: 'aktive Beratende',
            icon: ActiveAgenciesIcon,
        },
        {
            key: 'messagesPerSession',
            label: 'Ø Nachrichten/Gespräch',
            title: 'Nachrichten pro Gespräch',
            icon: TextMessagesIcon,
            iconTone: 'muted',
        },
        {
            key: 'activeConversations',
            label: 'aktive Gespräche',
            title: 'aktive Gespräche',
            icon: ConversationsIcon,
            iconTone: 'muted',
        },
    ],
};

const topicMenuLabel = (monthsAgo: number) => {
    if (monthsAgo === 0) {
        return 'Häufigstes Thema';
    }

    return monthsAgo === 1 ? 'Thema letzter Monat' : `Thema vor ${monthsAgo} Monaten`;
};

const topicMonthDetail = (monthsAgo: number) => {
    if (monthsAgo === 0) {
        return 'Dieser Monat';
    }

    return monthsAgo === 1 ? 'Letzter Monat' : `Vor ${monthsAgo} Monaten`;
};

/**
 * One "most frequent topic" entry per month of the configured topic window (UserService#1544),
 * appended to every scope's metric menu. The first four keep their established keys and labels.
 */
const buildTopicMetricOptions = (topicMonths: number): CardMenuOptionBlueprint[] =>
    Array.from({ length: topicMonths }, (unused, monthsAgo) => ({
        key: topicMenuKeyForMonth(monthsAgo),
        label: topicMenuLabel(monthsAgo),
        title: 'Häufigstes Thema',
        icon: TopicIcon,
    }));

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
    activeCounselors: 'Zeigt, wie viele Beratende aktiv sind.',
    all: 'Bündelt alle Anfragen über die verfügbaren Chattypen hinweg.',
    cases: 'Zeigt aktive Beratungsfälle und macht Falllasten schneller einschätzbar.',
    consultations: 'Zeigt Beratungsgespräche und macht Nutzungsintensität je Zeitraum sichtbar.',
    conversationsTotal: 'Zeigt laufende Gespräche für einen schnellen Blick auf die Aktivität.',
    counselors: 'Zeigt, wie viele Beratende aktiv sind.',
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
    description:
        option.description ||
        metricMenuDescriptionByKey[option.key] ||
        'Zeigt, welches Thema in diesem Zeitraum die Beratung geprägt hat.',
});

const formatIntegerMetric = (value: number) => value.toLocaleString('de-DE');

const getEmptyFilterTargetStatistics = (
    chartWeeks = DEFAULT_CHART_WEEKS,
    topicMonths = DEFAULT_TOPIC_MONTHS,
): FilterTargetStatistics => ({
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
        topicsByMonth: noDataTopics(topicMonths),
    },
    caseCharts: emptyCaseCharts(chartWeeks),
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

type NumericFilterMetricKey = keyof Omit<FilterTargetMetricStats, 'topicsByMonth'>;

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

const aggregateFilterTargetStatistics = (
    targetIds: string[],
    statisticsById: Record<string, FilterTargetStatistics>,
    chartWeeks: number,
    topicMonths: number,
) =>
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
                topicsByMonth: aggregatedStats.metrics.topicsByMonth.map((topic, monthsAgo) =>
                    pickStrongerTopic(topic, targetStats.metrics.topicsByMonth[monthsAgo] ?? topic),
                ),
            },
        );

        const caseCharts = aggregatedStats.caseCharts.map((days, weeksAgo) =>
            days.map((value, dayIndex) => value + (targetStats.caseCharts[weeksAgo]?.[dayIndex] ?? 0)),
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
    }, getEmptyFilterTargetStatistics(chartWeeks, topicMonths));

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

/**
 * True when the aggregated statistics carry no counselling activity at all — fresh
 * tenant or agency, nothing happened yet. The dashboard then shows ONE friendly
 * DashboardEmptyState hero instead of repeating "Keine Daten" on every card.
 * Structural values (counselors, assigned agencies) don't count as activity: a tenant
 * with onboarded counsellors but no counselling yet still gets the hero. KDG
 * suppression is handled separately (notice + per-card hints), never by the hero.
 */
const activityMetricKeys = numericFilterMetricKeys.filter(
    (metricKey) => metricKey !== 'counselors' && metricKey !== 'activeAgencies',
);

const isFilterStatsEmpty = (stats: FilterTargetStatistics): boolean =>
    !stats.enquiriesPreviousMonth &&
    activityMetricKeys.every((metricKey) => !stats.metrics[metricKey]) &&
    stats.metrics.topicsByMonth.every((topic) => topic.share === 0) &&
    stats.caseCharts.every((weekValues) => weekValues.every((value) => value === 0)) &&
    Object.values(stats.conversation).every((segmentValues) => segmentValues.every((value) => value === 0));

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

// German seed strings for the calm empty presentation (translated like every other
// dashboard seed via dashboardTextKeyByValue).
const NOT_TRACKED_HINT = 'wird noch nicht erfasst';
const PROTECTED_HINT = 'Geschützt – zu wenige aktive Beratende';
const NO_DATA_YET_HINT = 'noch keine Daten';
/** Width of the Träger/Beratungsstelle filter; the stylesheet reads it as --statistic-filter-width. */
const STATISTIC_FILTER_WIDTH = 400;
/** After a failed load the figure is unknown, not absent (#1374). */
const LOAD_FAILED_HINT = 'konnte nicht geladen werden';
const TOPIC_PENDING_HINT = 'zeigt sich ab dem ersten Gespräch';

type EmptyState = Pick<CardMenuOption, 'emptyHint' | 'emptyKind'>;
const noEmptyState: EmptyState = { emptyHint: undefined, emptyKind: undefined };
/** A metric without an application-layer source: honest "not tracked yet" card. */
const notTrackedOverride: Required<Pick<CardMenuOption, 'value' | 'detail' | 'trend' | 'emptyHint' | 'emptyKind'>> = {
    value: NO_DATA_LABEL,
    detail: undefined,
    trend: undefined,
    emptyHint: NOT_TRACKED_HINT,
    emptyKind: 'notTracked',
};

/**
 * Maps aggregated real statistics onto the dashboard metric slots. Metrics without an
 * application-layer data source keep the "Keine Daten" value (CSV export, screen
 * readers) but additionally carry an emptyHint so the card renders the calm dash +
 * hint presentation; trends are only shown where a real comparison value exists
 * (requests vs. previous month, topic shares).
 */
// Record (not Partial<Record<...>>) is deliberate: it makes a missing CardMenuKey a
// compile-time error instead of a silent runtime gap, so every card/menu key added to
// CardMenuKey is forced to get a real mapping here before it can render anything.
const buildMetricOverridesFromFilterStats = (
    stats: FilterTargetStatistics,
    allTargetsSuppressed = false,
    loadFailed = false,
): Record<CardMenuKey, Partial<CardMenuOption>> => {
    const requestTrend = buildChangeTrend(stats.metrics.oneToOne, stats.enquiriesPreviousMonth);
    const requestDetail =
        stats.enquiriesPreviousMonth !== null
            ? `Vormonat gesamt ${formatIntegerMetric(stats.enquiriesPreviousMonth)}`
            : undefined;
    // null = withheld (all targets KDG-suppressed) or simply not there yet.
    const emptyKind: StatisticEmptyKind = allTargetsSuppressed ? 'protected' : 'pending';
    const pendingHint = loadFailed ? LOAD_FAILED_HINT : NO_DATA_YET_HINT;
    const pendingTopicHint = loadFailed ? LOAD_FAILED_HINT : TOPIC_PENDING_HINT;
    const emptyMetricHint = allTargetsSuppressed ? PROTECTED_HINT : pendingHint;
    const emptyTopicHint = allTargetsSuppressed ? PROTECTED_HINT : pendingTopicHint;
    const metricEmptyState = (value: MetricValue): EmptyState =>
        value === null ? { emptyHint: emptyMetricHint, emptyKind } : noEmptyState;
    const topicEmptyState = (topic: TopicStatistic): EmptyState =>
        topic.label === NO_DATA_LABEL ? { emptyHint: emptyTopicHint, emptyKind } : noEmptyState;
    const topicOverride = (monthsAgo: number): Partial<CardMenuOption> => {
        const topic = stats.metrics.topicsByMonth[monthsAgo] ?? { label: NO_DATA_LABEL, share: 0 };

        return {
            value: topic.label,
            ...topicEmptyState(topic),
            detail: topicMonthDetail(monthsAgo),
            trend: buildTopicTrend(topic),
        };
    };
    // months beyond the four named keys, when the topic window is longer (UserService#1544)
    const furtherTopicOverrides = Object.fromEntries(
        stats.metrics.topicsByMonth
            .map((unusedTopic, monthsAgo) => monthsAgo)
            .filter((monthsAgo) => monthsAgo >= 4)
            .map((monthsAgo) => [topicMenuKeyForMonth(monthsAgo), topicOverride(monthsAgo)]),
    ) as Partial<Record<CardMenuKey, Partial<CardMenuOption>>>;

    return {
        activeAgencies: {
            value: formatMetricValue(stats.metrics.activeAgencies),
            ...metricEmptyState(stats.metrics.activeAgencies),
            detail: 'zugeordnete Beratungsstellen',
            trend: undefined,
        },
        activeConversations: {
            value: formatMetricValue(stats.metrics.activeConversations),
            ...metricEmptyState(stats.metrics.activeConversations),
            detail: 'heute aktiv',
            trend: undefined,
        },
        activeCounselors: {
            value: formatMetricValue(stats.metrics.counselors),
            ...metricEmptyState(stats.metrics.counselors),
            detail: undefined,
            trend: undefined,
        },
        all: {
            value: formatMetricValue(stats.metrics.oneToOne),
            ...metricEmptyState(stats.metrics.oneToOne),
            detail: requestDetail,
            trend: requestTrend,
        },
        cases: {
            value: formatMetricValue(stats.metrics.cases),
            ...metricEmptyState(stats.metrics.cases),
            detail: 'Aktuell in Beratung',
            trend: undefined,
        },
        consultations: notTrackedOverride,
        conversationsTotal: {
            value: formatMetricValue(stats.metrics.conversationsTotal),
            ...metricEmptyState(stats.metrics.conversationsTotal),
            detail: 'gesamt',
            trend: undefined,
        },
        counselors: {
            value: formatMetricValue(stats.metrics.counselors),
            ...metricEmptyState(stats.metrics.counselors),
            detail: undefined,
            trend: undefined,
        },
        groups: {
            value: formatMetricValue(stats.metrics.groups),
            ...metricEmptyState(stats.metrics.groups),
            detail: 'gesamt',
            trend: undefined,
        },
        liveChat: notTrackedOverride,
        messagesCounselors: notTrackedOverride,
        messagesPerSession: notTrackedOverride,
        messagesSeekers: notTrackedOverride,
        oneToOne: {
            value: formatMetricValue(stats.metrics.oneToOne),
            ...metricEmptyState(stats.metrics.oneToOne),
            detail: '1:1-Anfragen',
            trend: requestTrend,
        },
        phoneShare: notTrackedOverride,
        previousMonth: topicOverride(1),
        textMessagesTotal: notTrackedOverride,
        threeMonthsAgo: topicOverride(3),
        topTopic: topicOverride(0),
        twoMonthsAgo: topicOverride(2),
        videoCallCount: notTrackedOverride,
        videoShare: notTrackedOverride,
        voiceShare: notTrackedOverride,
        ...furtherTopicOverrides,
    };
};

/** Seven day bars per week of the chart window, plus the week overview with one bar per week. */
const buildCaseChartsFromFilterStats = (
    stats: FilterTargetStatistics,
    dateLabelsByWeek: string[][],
    todayDayCode: string,
    now: Date,
): Partial<Record<CasePeriodKey, CaseChartBar[]>> => ({
    ...Object.fromEntries(
        stats.caseCharts.map((days, weeksAgo) => [
            casePeriodKeyForWeek(weeksAgo),
            caseChartDayCodes.map((day, index) => ({
                day,
                dateLabel: dateLabelsByWeek[weeksAgo]?.[index] ?? '',
                value: days[index],
                isDefaultSelected: day === todayDayCode,
            })),
        ]),
    ),
    [CASE_WEEK_OVERVIEW_KEY]: buildCaseWeekOverview(stats.caseCharts, now),
});

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

const noSourceMetricOverride = notTrackedOverride;

/**
 * Resolves the value/detail/trend for a card or menu-option blueprint. Every
 * call always applies an override - real metric data when metricKey maps to
 * one, otherwise the explicit "Keine Daten" fallback - so an unmapped key can
 * only ever surface as an honest empty state, never as the (now-removed)
 * hardcoded blueprint number.
 */
const resolveMetricOverride = (
    metricOverrides: Partial<Record<CardMenuKey, Partial<CardMenuOption>>>,
    metricKey?: CardMenuKey,
): Partial<CardMenuOption> => (metricKey && metricOverrides[metricKey]) || noSourceMetricOverride;

const applyMenuOptionOverride = (
    option: CardMenuOptionBlueprint,
    metricOverrides: Partial<Record<CardMenuKey, Partial<CardMenuOption>>>,
    metricKey?: CardMenuKey,
): CardMenuOption =>
    ({
        ...option,
        ...resolveMetricOverride(metricOverrides, metricKey),
    } as CardMenuOption);

/**
 * Also resolves every embedded menuOptions entry through applyMenuOptionOverride
 * (keyed by each option's own `key`), not just the card's own value/detail/trend.
 * Top cards get their menuOptions rebuilt again by getPersonalizedMetricCard right
 * after, but communication cards render their blueprint's menuOptions as-is - those
 * need real values resolved here or their dropdown would show blank numbers.
 */
const applyCardOverride = (
    card: StatisticCardBlueprint,
    metricOverrides: Partial<Record<CardMenuKey, Partial<CardMenuOption>>>,
    metricKey?: CardMenuKey,
): StatisticCardDefinition =>
    ({
        ...card,
        ...resolveMetricOverride(metricOverrides, metricKey),
        menuOptions: card.menuOptions?.map((option) => applyMenuOptionOverride(option, metricOverrides, option.key)),
    } as StatisticCardDefinition);

const getDisplayMetricCard = (
    card: StatisticCardBlueprint,
    metricOverrides: Partial<Record<CardMenuKey, Partial<CardMenuOption>>>,
) => applyCardOverride(card, metricOverrides, defaultMetricKeyByCardKey[card.key]);

const getPersonalizedMetricCard = (
    card: StatisticCardBlueprint,
    activeScope: ScopeKey,
    metricOverrides: Partial<Record<CardMenuKey, Partial<CardMenuOption>>>,
    topicMonths: number,
    isFixedStand: boolean,
): StatisticCardDefinition => {
    const displayCard = getDisplayMetricCard(card, metricOverrides);

    return {
        ...displayCard,
        defaultMenuKey: defaultMetricKeyByCardKey[card.key],
        menuAriaLabel: 'Kennzahl in diesem Dashboard-Slot auswählen',
        menuLabel: 'Meine Kennzahl',
        menuOptions: [...dashboardMetricOptionsByScope[activeScope], ...buildTopicMetricOptions(topicMonths)]
            .filter((option) => !duplicatedCommunicationMetricKeys.has(option.key))
            .filter((option) => !isFixedStand || option.key !== 'activeConversations')
            .map((option) => withMetricMenuDescription(applyMenuOptionOverride(option, metricOverrides, option.key))),
    };
};

/** A fixed stand holds no "active today", so its menus do not offer it. */
const withoutActiveToday = (dashboard: ScopeDashboardBlueprint): ScopeDashboardBlueprint => {
    const withoutOption = (card: StatisticCardBlueprint): StatisticCardBlueprint => ({
        ...card,
        menuOptions: card.menuOptions?.filter((option) => option.key !== 'activeConversations'),
    });
    return {
        ...dashboard,
        topCards: dashboard.topCards.map(withoutOption),
        communicationCards: dashboard.communicationCards.map(withoutOption),
    };
};

const dashboardByScope: Record<ScopeKey, ScopeDashboardBlueprint> = {
    platform: {
        topCards: [
            {
                key: 'requests',
                title: 'Anfragen',
                icon: RequestsIcon,
                menuOptions: [
                    {
                        key: 'all',
                        label: 'Alle Chattypen',
                    },
                    {
                        key: 'oneToOne',
                        label: 'Mail (1:1)',
                    },
                    {
                        key: 'liveChat',
                        label: 'Live-Chat',
                    },
                    {
                        key: 'groups',
                        label: 'Gruppen',
                    },
                ],
                size: 'large',
            },
            {
                key: 'active-agencies',
                title: 'aktive Beratungsstellen',
                icon: ActiveAgenciesIcon,
                menuLabel: 'Meine Kennzahl',
                menuAriaLabel: 'Persönliche Kennzahl auswählen',
                menuOptions: [
                    {
                        key: 'all',
                        label: 'Beratungsstellen',
                        title: 'aktive Beratungsstellen',
                        icon: ActiveAgenciesIcon,
                    },
                    {
                        key: 'consultations',
                        label: 'Beratungsgespräche',
                        title: 'Beratungsgespräche',
                        icon: ConversationsIcon,
                        iconTone: 'muted',
                    },
                    {
                        key: 'counselors',
                        label: 'aktive Beratende',
                        title: 'aktive Beratende',
                        icon: ActiveAgenciesIcon,
                    },
                    {
                        key: 'messagesPerSession',
                        label: 'Ø Nachrichten/Gespräch',
                        title: 'Nachrichten pro Gespräch',
                        icon: TextMessagesIcon,
                        iconTone: 'muted',
                    },
                    {
                        key: 'activeConversations',
                        label: 'aktive Gespräche',
                        title: 'aktive Gespräche',
                        icon: ConversationsIcon,
                        iconTone: 'muted',
                    },
                ],
                size: 'large',
            },
            {
                key: 'top-topic',
                title: 'Häufigstes Thema',
                icon: TopicIcon,
                menuLabel: 'Zeitraum',
                menuAriaLabel: 'Häufigstes Thema nach Zeitraum filtern',
                menuOptions: [
                    {
                        key: 'all',
                        label: 'Dieser Monat',
                    },
                    {
                        key: 'previousMonth',
                        label: 'Letzter Monat',
                    },
                    {
                        key: 'twoMonthsAgo',
                        label: 'Vor 2 Monaten',
                    },
                    {
                        key: 'threeMonthsAgo',
                        label: 'Vor 3 Monaten',
                    },
                ],
                size: 'large',
            },
        ],
        communicationCards: [
            {
                key: 'conversations',
                title: 'Gespräche insgesamt',
                icon: ConversationsIcon,
                size: 'medium',
            },
            {
                key: 'text-messages',
                title: 'Textnachrichten',
                icon: TextMessagesIcon,
                iconTone: 'muted',
                size: 'small',
            },
            {
                key: 'phone-calls',
                title: 'Anrufe',
                icon: PhoneCallsIcon,
                iconTone: 'coral',
                size: 'small',
            },
            {
                key: 'video-calls',
                title: 'Videoanrufe',
                icon: VideoCallsIcon,
                iconTone: 'danger',
                size: 'small',
            },
            {
                key: 'voice-messages',
                title: 'Sprachnachrichten',
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
                icon: RequestsIcon,
                menuOptions: [
                    {
                        key: 'all',
                        label: 'Alle Chattypen',
                    },
                    {
                        key: 'oneToOne',
                        label: 'Mail (1:1)',
                    },
                    {
                        key: 'liveChat',
                        label: 'Live-Chat',
                    },
                    {
                        key: 'groups',
                        label: 'Gruppen',
                    },
                ],
                size: 'large',
            },
            {
                key: 'active-agencies',
                title: 'aktive Beratungsstellen',
                icon: ActiveAgenciesIcon,
                menuLabel: 'Meine Kennzahl',
                menuAriaLabel: 'Persönliche Kennzahl auswählen',
                menuOptions: [
                    {
                        key: 'all',
                        label: 'Beratungsstellen',
                        title: 'aktive Beratungsstellen',
                        icon: ActiveAgenciesIcon,
                    },
                    {
                        key: 'consultations',
                        label: 'Beratungsgespräche',
                        title: 'Beratungsgespräche',
                        icon: ConversationsIcon,
                        iconTone: 'muted',
                    },
                    {
                        key: 'counselors',
                        label: 'aktive Beratende',
                        title: 'aktive Beratende',
                        icon: ActiveAgenciesIcon,
                    },
                    {
                        key: 'messagesPerSession',
                        label: 'Ø Nachrichten/Gespräch',
                        title: 'Nachrichten pro Gespräch',
                        icon: TextMessagesIcon,
                        iconTone: 'muted',
                    },
                    {
                        key: 'activeConversations',
                        label: 'aktive Gespräche',
                        title: 'aktive Gespräche',
                        icon: ConversationsIcon,
                        iconTone: 'muted',
                    },
                ],
                size: 'large',
            },
            {
                key: 'top-topic',
                title: 'Häufigstes Thema',
                icon: TopicIcon,
                menuLabel: 'Zeitraum',
                menuAriaLabel: 'Häufigstes Thema nach Zeitraum filtern',
                menuOptions: [
                    {
                        key: 'all',
                        label: 'Dieser Monat',
                    },
                    {
                        key: 'previousMonth',
                        label: 'Letzter Monat',
                    },
                    {
                        key: 'twoMonthsAgo',
                        label: 'Vor 2 Monaten',
                    },
                    {
                        key: 'threeMonthsAgo',
                        label: 'Vor 3 Monaten',
                    },
                ],
                size: 'large',
            },
        ],
        communicationCards: [
            {
                key: 'conversations',
                title: 'Gespräche insgesamt',
                icon: ConversationsIcon,
                size: 'medium',
            },
            {
                key: 'text-messages',
                title: 'Textnachrichten',
                icon: TextMessagesIcon,
                iconTone: 'muted',
                size: 'small',
            },
            {
                key: 'phone-calls',
                title: 'Anrufe',
                icon: PhoneCallsIcon,
                iconTone: 'coral',
                size: 'small',
            },
            {
                key: 'video-calls',
                title: 'Videoanrufe',
                icon: VideoCallsIcon,
                iconTone: 'danger',
                size: 'small',
            },
            {
                key: 'voice-messages',
                title: 'Sprachnachrichten',
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
                icon: RequestsIcon,
                menuOptions: [
                    {
                        key: 'all',
                        label: 'Alle Chattypen',
                    },
                    {
                        key: 'oneToOne',
                        label: 'Mail (1:1)',
                    },
                    {
                        key: 'liveChat',
                        label: 'Live-Chat',
                    },
                    {
                        key: 'groups',
                        label: 'Gruppen',
                    },
                ],
                size: 'large',
            },
            {
                key: 'active-counselors',
                title: 'aktive Beratende',
                icon: ActiveAgenciesIcon,
                menuLabel: 'Meine Kennzahl',
                menuAriaLabel: 'Persönliche Kennzahl auswählen',
                menuOptions: [
                    {
                        key: 'all',
                        label: 'aktive Beratende',
                        title: 'aktive Beratende',
                        icon: ActiveAgenciesIcon,
                    },
                    {
                        key: 'consultations',
                        label: 'Beratungsgespräche',
                        title: 'Beratungsgespräche',
                        icon: ConversationsIcon,
                        iconTone: 'muted',
                    },
                    {
                        key: 'messagesPerSession',
                        label: 'Ø Nachrichten/Gespräch',
                        title: 'Nachrichten pro Gespräch',
                        icon: TextMessagesIcon,
                        iconTone: 'muted',
                    },
                    {
                        key: 'activeConversations',
                        label: 'aktive Gespräche',
                        title: 'aktive Gespräche',
                        icon: ConversationsIcon,
                        iconTone: 'muted',
                    },
                ],
                size: 'large',
            },
            {
                key: 'top-topic',
                title: 'Häufigstes Thema',
                icon: TopicIcon,
                menuLabel: 'Zeitraum',
                menuAriaLabel: 'Häufigstes Thema nach Zeitraum filtern',
                menuOptions: [
                    {
                        key: 'all',
                        label: 'Dieser Monat',
                    },
                    {
                        key: 'previousMonth',
                        label: 'Letzter Monat',
                    },
                    {
                        key: 'twoMonthsAgo',
                        label: 'Vor 2 Monaten',
                    },
                    {
                        key: 'threeMonthsAgo',
                        label: 'Vor 3 Monaten',
                    },
                ],
                size: 'large',
            },
        ],
        communicationCards: [
            {
                key: 'conversations',
                title: 'Gespräche insgesamt',
                icon: ConversationsIcon,
                size: 'medium',
            },
            {
                key: 'text-messages',
                title: 'Textnachrichten',
                icon: TextMessagesIcon,
                iconTone: 'muted',
                size: 'small',
            },
            {
                key: 'phone-calls',
                title: 'Anrufe',
                icon: PhoneCallsIcon,
                iconTone: 'coral',
                size: 'small',
            },
            {
                key: 'video-calls',
                title: 'Videoanrufe',
                icon: VideoCallsIcon,
                iconTone: 'danger',
                size: 'small',
            },
            {
                key: 'voice-messages',
                title: 'Sprachnachrichten',
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
                <GlobalSearchBar
                    defaultExpanded
                    expandedWidth={STATISTIC_FILTER_WIDTH}
                    className="statisticDashboard__filterSearch"
                    ariaLabel={translateDashboardKey(
                        translate,
                        'statistic.dashboard.filter.searchAria',
                        'Beratungsstellen oder Träger suchen',
                    )}
                    value={searchValue}
                    onInputClick={() => setIsSuggestionMenuOpen(true)}
                    onInputFocus={() => setIsSuggestionMenuOpen(true)}
                    onInputKeyDown={handleSearchKeyDown}
                    onSearchChange={(value) => {
                        setIsSuggestionMenuOpen(true);
                        onSearchChange(value);
                    }}
                    onSearch={() => {
                        addFirstVisibleSuggestion();
                        setIsSuggestionMenuOpen(false);
                    }}
                    searchPlaceholder={translateDashboardKey(
                        translate,
                        'statistic.dashboard.filter.placeholder',
                        'Suche',
                    )}
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
        platform: casePeriodKeyForWeek(0),
        tenant: casePeriodKeyForWeek(0),
        agency: casePeriodKeyForWeek(0),
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
    const {
        data: statisticData,
        isError: hasStatisticLoadError,
        isLoading: isStatisticLoading,
        isUnavailable: isStatisticUnavailable,
    } = useStatisticDashboardData();
    const navigate = useNavigate();
    // A fixed stand is read from its own time: its "this week" must not slide with today.
    const chartNow = useMemo(() => statisticData.referenceDate ?? new Date(), [statisticData.referenceDate]);
    const todayDayCode = useMemo(() => getTodayDayCode(chartNow), [chartNow]);
    const isFixedStand = statisticData.snapshotInterval !== 'LIVE';
    const isWeeklyStand = statisticData.snapshotInterval === 'WEEKLY';
    const dashboard = useMemo(
        () => (isFixedStand ? withoutActiveToday(dashboardByScope[activeScope]) : dashboardByScope[activeScope]),
        [activeScope, isFixedStand],
    );
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
    const { chartWeeks, topicMonths } = statisticData;
    const caseChartDateLabelsByWeek = useMemo(
        () => buildCaseChartDateLabels(chartNow, chartWeeks),
        [chartNow, chartWeeks],
    );
    const filteredStats = useMemo(
        () =>
            aggregateFilterTargetStatistics(
                effectiveStatisticTargetIds,
                statisticData.statisticsById,
                chartWeeks,
                topicMonths,
            ),
        [chartWeeks, effectiveStatisticTargetIds, statisticData.statisticsById, topicMonths],
    );
    const suppressedSelectedTargetCount = useMemo(
        () =>
            effectiveStatisticTargetIds.filter((targetId) => statisticData.statisticsById[targetId]?.suppressed).length,
        [effectiveStatisticTargetIds, statisticData.statisticsById],
    );
    // A total is what the page shows when nothing is picked: the platform row, or a Träger admin's own
    // Träger row. Neither is in the picker, so a hidden one is told apart from a hidden centre.
    const hiddenTotalShown = useMemo(
        () =>
            effectiveStatisticTargetIds.some(
                (targetId) =>
                    statisticData.statisticsById[targetId]?.suppressed &&
                    !availableFilterTargets.some((target) => target.id === targetId),
            ),
        [availableFilterTargets, effectiveStatisticTargetIds, statisticData.statisticsById],
    );
    const hiddenRowShown = suppressedSelectedTargetCount > (hiddenTotalShown ? 1 : 0);
    const allTargetsSuppressed =
        effectiveStatisticTargetIds.length > 0 && suppressedSelectedTargetCount === effectiveStatisticTargetIds.length;
    const metricOverrides = useMemo(
        () => buildMetricOverridesFromFilterStats(filteredStats, allTargetsSuppressed, hasStatisticLoadError),
        [allTargetsSuppressed, filteredStats, hasStatisticLoadError],
    );
    const isDashboardEmpty = useMemo(() => isFilterStatsEmpty(filteredStats), [filteredStats]);
    // A stand with zeros is a real statement, so it shows them like any other value. A level without
    // any target has nothing to state, even when the stand holds numbers for another level.
    const showEmptyHero =
        isDashboardEmpty &&
        !(isFixedStand && effectiveStatisticTargetIds.length > 0) &&
        !isStatisticLoading &&
        !hasStatisticLoadError &&
        !isStatisticUnavailable &&
        !allTargetsSuppressed;
    // After a failed load the page says so; a preview would read as "not enough data yet".
    const showPreviewPanel = (showEmptyHero || allTargetsSuppressed) && !hasStatisticLoadError;
    const previewHighlights = [
        {
            title: translateDashboardKey(translate, 'statistic.dashboard.preview.timeline.title', 'Verlauf über Zeit'),
            text: translateDashboardKey(
                translate,
                'statistic.dashboard.preview.timeline.text',
                'Anfragen und Gespräche pro Woche, mit Vorjahresvergleich.',
            ),
        },
        {
            title: translateDashboardKey(translate, 'statistic.dashboard.preview.compare.title', 'Träger im Vergleich'),
            text: translateDashboardKey(
                translate,
                'statistic.dashboard.preview.compare.text',
                'Auslastung je Träger – nur wenn jeder Wert groß genug ist.',
            ),
        },
        {
            title: translateDashboardKey(translate, 'statistic.dashboard.preview.topics.title', 'Themen'),
            text: translateDashboardKey(
                translate,
                'statistic.dashboard.preview.topics.text',
                'Welche Themen am häufigsten angefragt werden.',
            ),
        },
    ];
    const csvExportRows = useMemo(
        () => [
            ...dashboard.topCards.map((card) => {
                const localized = localizeStatisticCard(
                    getPersonalizedMetricCard(
                        card,
                        activeScope,
                        metricOverrides,
                        statisticData.topicMonths,
                        isFixedStand,
                    ),
                    translate,
                    locale,
                );
                return { title: localized.title, value: localized.value };
            }),
            ...dashboard.communicationCards.map((card) => {
                const localized = localizeStatisticCard(getDisplayMetricCard(card, metricOverrides), translate, locale);
                return { title: localized.title, value: localized.value };
            }),
        ],
        [activeScope, dashboard, locale, metricOverrides, topicMonths, translate],
    );
    const filteredCaseCharts = useMemo(
        () => buildCaseChartsFromFilterStats(filteredStats, caseChartDateLabelsByWeek, todayDayCode, chartNow),
        [caseChartDateLabelsByWeek, chartNow, filteredStats, todayDayCode],
    );
    const filteredConversationByPeriod = useMemo(
        () => buildConversationByPeriodFromFilterStats(filteredStats),
        [filteredStats],
    );
    // a period beyond a shortened window falls back to this week; a weekly stand has only week bars
    let selectedCasePeriod = casePeriodKeyForWeek(0);
    if (isWeeklyStand) {
        selectedCasePeriod = CASE_WEEK_OVERVIEW_KEY;
    } else if (filteredCaseCharts[selectedCasePeriodByScope[activeScope]]) {
        selectedCasePeriod = selectedCasePeriodByScope[activeScope];
    }
    const isWeekOverview = selectedCasePeriod === CASE_WEEK_OVERVIEW_KEY;
    const conversationPeriods = useMemo(
        () => buildConversationPeriodOptions(statisticData.snapshotInterval, statisticData.dataUntil, locale),
        [locale, statisticData.dataUntil, statisticData.snapshotInterval],
    );
    // a period the current stand does not hold falls back to its newest one
    const selectedConversationPeriod = conversationPeriods.some(
        ({ key }) => key === selectedConversationPeriodByScope[activeScope],
    )
        ? selectedConversationPeriodByScope[activeScope]
        : conversationPeriods[0].key;
    const selectedConversationSegment = selectedConversationSegmentByScope[activeScope];
    const caseChart = filteredCaseCharts[selectedCasePeriod] ?? [];
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
        () =>
            localizePeriodOptions(
                buildCasePeriodOptions(chartWeeks).filter(
                    ({ key }) => !isWeeklyStand || key === CASE_WEEK_OVERVIEW_KEY,
                ),
                translate,
                locale,
            ),
        [chartWeeks, isWeeklyStand, locale, translate],
    );
    const localizedConversationPeriodOptions = useMemo(
        () => localizePeriodOptions(conversationPeriods, translate, locale),
        [conversationPeriods, locale, translate],
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
                {/* Levels left, the Träger/Beratungsstelle filter right, one divider under
                    both (ORISO-Admin#1374). */}
                <div
                    className="statisticDashboard__headerRow"
                    style={{ '--statistic-filter-width': `${STATISTIC_FILTER_WIDTH}px` } as CSSProperties}
                >
                    <AdminSegmentedTabs
                        className="statisticDashboard__scopeTabs"
                        activeId={activeScope}
                        ariaLabel={translateDashboardText(translate, 'Statistik-Ebene', locale)}
                        items={scopeTabItems}
                        onChange={(scopeKey) => setActiveScope(scopeKey as ScopeKey)}
                    />
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
                </div>
            </Page.Title>
            <div className="statisticDashboardPage" lang={i18nInstance?.resolvedLanguage || i18nInstance?.language}>
                <div className="statisticDashboard">
                    <div key={activeScope} className="statisticDashboard__animatedContent">
                        {isStatisticUnavailable && (
                            <div id={STATISTIC_STATE_ID}>
                                <Notify
                                    quietText={translate('notify.tile.notLoaded')}
                                    title={translate('notify.title.statistics')}
                                    severity="error"
                                    causeKey="statistic:dashboard"
                                    jump={STATISTIC_STATE_ID}
                                    retry
                                >
                                    {translateDashboardKey(
                                        translate,
                                        'statistic.dashboard.unavailable',
                                        'Die Statistik ist vorübergehend nicht verfügbar. Es werden keine Zahlen angezeigt. Bitte versuchen Sie es später noch einmal.',
                                    )}
                                </Notify>
                            </div>
                        )}
                        {isStatisticLoading && (
                            <div className="statisticDashboard__loading" role="status" aria-live="polite">
                                <Spinner />
                                <p>
                                    {translateDashboardKey(
                                        translate,
                                        'statistic.dashboard.loading',
                                        'Statistik wird geladen …',
                                    )}
                                </p>
                            </div>
                        )}
                        {!isStatisticLoading && !isStatisticUnavailable && (
                            <>
                                {hasStatisticLoadError && (
                                    <div id={STATISTIC_STATE_ID}>
                                        <Notify
                                            quietText={translate('notify.tile.notLoaded')}
                                            title={translate('notify.title.statistics')}
                                            severity="error"
                                            causeKey="statistic:dashboard"
                                            jump={STATISTIC_STATE_ID}
                                            retry
                                        >
                                            {translateDashboardKey(
                                                translate,
                                                'statistic.dashboard.loadError',
                                                'Statistikdaten konnten nicht geladen werden.',
                                            )}
                                        </Notify>
                                    </div>
                                )}
                                {statisticData.suppressionDisabled && (
                                    <HintText className="statisticDashboard__caption">
                                        {translateDashboardKey(
                                            translate,
                                            'statistic.dashboard.suppressionDisabledNotice',
                                            'Kleinzellen-Schutz deaktiviert – nur für Testumgebungen',
                                        )}
                                    </HintText>
                                )}
                                <StatisticInfoRow
                                    stand={
                                        statisticData.generatedAt &&
                                        !hasStatisticLoadError &&
                                        (statisticData.snapshotInterval === 'LIVE' || statisticData.dataUntil)
                                            ? {
                                                  dataUntil: statisticData.dataUntil,
                                                  snapshotInterval: statisticData.snapshotInterval,
                                              }
                                            : null
                                    }
                                    privacyReasons={[
                                        ...(hiddenRowShown
                                            ? [
                                                  translateDashboardKey(
                                                      translate,
                                                      'statistic.dashboard.suppressedNotice',
                                                      'Einige Bereiche zeigen aus Datenschutzgründen keine Zahlen. Das gilt für Bereiche mit weniger aktiven Beratenden als der festgelegten Mindestzahl. Es kann auch einen größeren Bereich treffen, wenn sich seine Zahlen sonst aus der Gesamtzahl ausrechnen ließen.',
                                                  ),
                                              ]
                                            : []),
                                        ...(hiddenTotalShown
                                            ? [
                                                  translateDashboardKey(
                                                      translate,
                                                      'statistic.dashboard.suppressedTotalNotice',
                                                      'Die Gesamtzahl wird aus Datenschutzgründen nicht angezeigt, weil sie auf zu wenigen aktiven Beratenden beruht oder die Zahlen eines kleinen Bereichs verraten würde.',
                                                  ),
                                              ]
                                            : []),
                                    ]}
                                />
                                {/* a file of "Keine Daten" would look like "not tracked"; after a load error there is nothing to export */}
                                {!allTargetsSuppressed && !hasStatisticLoadError && (
                                    <div className="statisticDashboard__export">
                                        <CSVLink
                                            className="statisticDashboard__exportLink"
                                            data={csvExportRows}
                                            filename={`${translateDashboardKey(
                                                translate,
                                                'statistic.dashboard.csvExport.filename',
                                                'Statistik',
                                            )} - ${activeScope} - ${new Date().toISOString().slice(0, 10)}.csv`}
                                            headers={[
                                                {
                                                    key: 'title',
                                                    label: translateDashboardKey(
                                                        translate,
                                                        'statistic.dashboard.csvExport.metricColumn',
                                                        'Kennzahl',
                                                    ),
                                                },
                                                {
                                                    key: 'value',
                                                    label: translateDashboardKey(
                                                        translate,
                                                        'statistic.dashboard.csvExport.valueColumn',
                                                        'Wert',
                                                    ),
                                                },
                                            ]}
                                            separator=";"
                                        >
                                            <DownloadIcon aria-hidden="true" focusable="false" />
                                            {translateDashboardKey(
                                                translate,
                                                'statistic.dashboard.csvExport.label',
                                                'Statistik als CSV herunterladen',
                                            )}
                                        </CSVLink>
                                    </div>
                                )}
                                {/* All eight figures in one raster: four per row on a desktop, so the
                                    channel tiles line up under the key figures (ORISO-Admin#1374). */}
                                <CardGrid
                                    raster
                                    fluid
                                    minCardWidth={280}
                                    className={`statisticDashboard__summaryGrid${
                                        showEmptyHero ? ' statisticDashboard__summaryGrid--quiet' : ''
                                    }`}
                                >
                                    {dashboard.topCards.map((card) => (
                                        <CardGrid.Item key={card.key}>
                                            <StatisticCard
                                                card={localizeStatisticCard(
                                                    getPersonalizedMetricCard(
                                                        card,
                                                        activeScope,
                                                        metricOverrides,
                                                        statisticData.topicMonths,
                                                        isFixedStand,
                                                    ),
                                                    translate,
                                                    locale,
                                                )}
                                                locale={locale}
                                                menuValue={selectedCardMenuByScope[activeScope][card.key]}
                                                onMenuChange={updateCardMenuSelection}
                                                translate={translate}
                                            />
                                        </CardGrid.Item>
                                    ))}
                                    {dashboard.communicationCards.map((card) => (
                                        <CardGrid.Item key={card.key}>
                                            <StatisticCard
                                                card={localizeStatisticCard(
                                                    getDisplayMetricCard(card, metricOverrides),
                                                    translate,
                                                    locale,
                                                )}
                                                locale={locale}
                                                translate={translate}
                                            />
                                        </CardGrid.Item>
                                    ))}
                                </CardGrid>

                                {/* Nothing to chart yet (no data, or every figure protected): say what will
                                    appear here instead of drawing empty charts (ORISO-Admin#1374). */}
                                {showPreviewPanel && (
                                    <DashboardEmptyState
                                        className="statisticDashboard__emptyHero"
                                        illustration={statisticsPreviewIllustration}
                                        title={
                                            showEmptyHero
                                                ? translateDashboardKey(
                                                      translate,
                                                      'statistic.dashboard.empty.heroTitle',
                                                      'Ihr Dashboard füllt sich mit der ersten Beratung',
                                                  )
                                                : translateDashboardKey(
                                                      translate,
                                                      'statistic.dashboard.preview.title',
                                                      'Das sehen Sie hier, sobald genug Daten da sind',
                                                  )
                                        }
                                        highlights={previewHighlights}
                                        action={
                                            showEmptyHero
                                                ? {
                                                      label: translateDashboardKey(
                                                          translate,
                                                          'statistic.dashboard.empty.heroAction',
                                                          'Beratende verwalten',
                                                      ),
                                                      onClick: () => navigate(routePathNames.consultants),
                                                  }
                                                : undefined
                                        }
                                    />
                                )}
                                {/* hidden figures or a failed load: no chart, a chart of zeros would read as "nothing happened" */}
                                {!showPreviewPanel && !hasStatisticLoadError && (
                                    <CardGrid
                                        raster
                                        fillers={false}
                                        className={`statisticDashboard__chartGrid${
                                            showEmptyHero ? ' statisticDashboard__chartGrid--quiet' : ''
                                        }`}
                                    >
                                        <CardGrid.Item span={2}>
                                            <section
                                                className={`${cardStyles.card} statisticDashboard__chartCard statisticDashboard__caseChartCard`}
                                            >
                                                <div className="statisticDashboard__chartHeader">
                                                    <h2>
                                                        {translateDashboardText(translate, 'Beratungsfälle', locale)}
                                                    </h2>
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
                                                        <div
                                                            className={`statisticDashboard__bars${
                                                                isWeekOverview ? ' statisticDashboard__bars--weeks' : ''
                                                            }`}
                                                            style={{ '--bar-count': caseChart.length } as CSSProperties}
                                                        >
                                                            {caseChart.map((bar, index) => {
                                                                const height = Math.round(
                                                                    (bar.value / caseAxisMax) * 100,
                                                                );
                                                                const isSelected = bar.day === selectedCaseBar?.day;
                                                                const barStyle = {
                                                                    '--bar-index': index,
                                                                    height: `${height}%`,
                                                                } as CSSProperties;
                                                                const tooltipLift = height <= 35 ? 48 : 18;
                                                                const tooltipStyle = {
                                                                    '--statistic-dashboard-tooltip-bottom': `calc(${height}% + ${tooltipLift}px)`,
                                                                } as CSSProperties;
                                                                const barValue = bar.value.toLocaleString(locale);
                                                                const dateLabel = translateDashboardDateLabel(
                                                                    translate,
                                                                    bar.dateLabel,
                                                                );
                                                                // week overview: many bars, so only the week number below each
                                                                const dayLabel = isWeekOverview
                                                                    ? bar.day.replace(/^KW /, '')
                                                                    : translateDashboardWeekday(translate, bar.day);

                                                                return (
                                                                    <button
                                                                        key={bar.day}
                                                                        type="button"
                                                                        className={`statisticDashboard__barSlot ${
                                                                            isSelected
                                                                                ? 'statisticDashboard__barSlot--selected'
                                                                                : ''
                                                                        }`}
                                                                        aria-label={
                                                                            isWeekOverview
                                                                                ? translateDashboardKey(
                                                                                      translate,
                                                                                      'statistic.dashboard.chart.weekBarAria',
                                                                                      `${bar.value} Beratungsfälle in ${bar.dateLabel}`,
                                                                                      {
                                                                                          date: dateLabel,
                                                                                          value: barValue,
                                                                                      },
                                                                                  )
                                                                                : translateDashboardKey(
                                                                                      translate,
                                                                                      'statistic.dashboard.chart.caseBarAria',
                                                                                      `${bar.value} Beratungsfälle am ${bar.dateLabel}`,
                                                                                      {
                                                                                          date: dateLabel,
                                                                                          value: barValue,
                                                                                      },
                                                                                  )
                                                                        }
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
                                                                                isSelected
                                                                                    ? 'statisticDashboard__bar--highlight'
                                                                                    : ''
                                                                            } ${
                                                                                bar.value === 0
                                                                                    ? 'statisticDashboard__bar--empty'
                                                                                    : ''
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
                                        </CardGrid.Item>

                                        <CardGrid.Item>
                                            <section
                                                className={`${cardStyles.card} statisticDashboard__chartCard statisticDashboard__donutCard`}
                                            >
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
                                                            const isSelected =
                                                                segment.label === selectedConversationSegmentLabel;
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
                                                            const segmentValue = formatDashboardNumberText(
                                                                `${segment.value}`,
                                                                locale,
                                                            );

                                                            return (
                                                                <button
                                                                    key={segment.label}
                                                                    type="button"
                                                                    className={`statisticDashboard__legendItem ${
                                                                        isSelected
                                                                            ? 'statisticDashboard__legendItem--active'
                                                                            : ''
                                                                    }`}
                                                                    aria-pressed={isSelected}
                                                                    onClick={() =>
                                                                        selectConversationSegment(segment.label)
                                                                    }
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
                                        </CardGrid.Item>
                                    </CardGrid>
                                )}
                            </>
                        )}
                    </div>
                    {!isStatisticUnavailable &&
                        (isSuperAdmin || hasRole([UserRole.TenantAdmin, UserRole.SingleTenantAdmin])) && (
                            <TutorialStatisticsSection />
                        )}
                </div>
            </div>
        </Page>
    );
};
