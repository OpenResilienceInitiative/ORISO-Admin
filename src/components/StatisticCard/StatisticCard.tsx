import { useState } from 'react';
import { ArrowDownward, ArrowUpward, MoreVert, NorthEast, SouthEast } from '@mui/icons-material';
import { ReactComponent as ConversationsIcon } from '../../resources/img/svg/statistics-dashboard/conversations.svg';
import { ReactComponent as RequestsIcon } from '../../resources/img/svg/statistics-dashboard/requests.svg';
import { useAnimatedDisplayValue } from '../../pages/Statistic/useAnimatedDisplayValue';
import type {
    CardMenuKey,
    IconTone,
    StatisticCardDefinition,
    SvgIcon,
    TrendBadgeDefinition,
    TrendDirection,
    TrendScoreTone,
} from '../../pages/Statistic/types';

/**
 * A single metric card for the statistic dashboard (Figma Admin.ORISO). Renders the
 * metric icon, title, animated value, trend badge and — when the card exposes
 * `menuOptions` — a per-slot metric picker. Styling comes from the global
 * `statisticDashboard__*` rules in `src/styles/components/statistic.less`, so the
 * card must be rendered where that stylesheet is loaded (the app shell and the
 * Storybook preview both import it).
 *
 * Extracted verbatim from `pages/Statistic.tsx` so it can be documented in Storybook
 * and reused without pulling in the whole dashboard.
 */

type DashboardTranslate = (key: string, options?: Record<string, unknown>) => string;

const translateDashboardKey = (
    translate: DashboardTranslate,
    key: string,
    defaultValue: string,
    options: Record<string, unknown> = {},
) => translate(key, { defaultValue, ...options });

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

export const AnimatedValue = ({ locale = 'de-DE', value }: { locale?: string; value: string }) => (
    <>{useAnimatedDisplayValue(value, 2800, locale)}</>
);

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

export interface StatisticCardProps {
    card: StatisticCardDefinition;
    locale: string;
    menuValue?: CardMenuKey;
    onMenuChange?: (cardKey: string, menuKey: CardMenuKey) => void;
    translate: DashboardTranslate;
}

export const StatisticCard = ({ card, locale, menuValue, onMenuChange, translate }: StatisticCardProps) => {
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
                                    const OptionIcon = option.icon || DisplayIcon;

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
                                            <span className="statisticDashboard__cardMenuItemIcon" aria-hidden="true">
                                                <OptionIcon />
                                            </span>
                                            <span className="statisticDashboard__cardMenuItemBody">
                                                <span className="statisticDashboard__cardMenuItemRow">
                                                    <span className="statisticDashboard__cardMenuItemTitle">
                                                        {option.label}
                                                    </span>
                                                    <strong>{option.value}</strong>
                                                </span>
                                                {option.description && (
                                                    <small className="statisticDashboard__cardMenuItemDescription">
                                                        {option.description}
                                                    </small>
                                                )}
                                            </span>
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

export default StatisticCard;
