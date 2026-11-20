import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { formatContrastRatio, rateColorContrast } from '../../utils/colorContrastRating';
import styles from './styles.module.scss';

export interface ContrastBadgeProps {
    /** Hex colour to rate against the text the theme draws on it. */
    color?: string | null;
    className?: string;
}

/**
 * Small WCAG contrast badge for a theme colour (ORISO-Admin#1374):
 * "AAA · 7,8", "AA · 5,1", or a warning-styled "Zu schwach · 3,2". The rating
 * never relies on colour alone — the level is spelled out — and the full
 * sentence ("Kontrast 7,8 : 1 mit weißer Schrift") is the accessible name and
 * the hover title. Renders nothing for a missing or invalid colour.
 *
 * A `<small>`, not a `<span>`: the colour-field stylesheets restyle every
 * `.colorSelector span`, which would shrink and recolour the badge.
 */
export const ContrastBadge = ({ color, className }: ContrastBadgeProps) => {
    const { t, i18n } = useTranslation();
    const rating = rateColorContrast(color);

    if (!rating) {
        return null;
    }

    const ratio = formatContrastRatio(rating.ratio, i18n?.language);
    const levelLabel = t(`theme.contrast.level.${rating.level}`);
    const sentence = t(rating.whiteText ? 'theme.contrast.title.white' : 'theme.contrast.title.dark', { ratio });
    const title = rating.level === 'fail' ? `${sentence} ${t('theme.contrast.belowAA')}` : sentence;

    return (
        <small
            role="img"
            aria-label={`${levelLabel} – ${title}`}
            title={title}
            data-contrast-level={rating.level}
            className={classNames(styles.badge, { [styles.fail]: rating.level === 'fail' }, className)}
        >
            {rating.level === 'fail' && <WarningAmberRoundedIcon className={styles.icon} aria-hidden="true" />}
            {levelLabel} · {ratio}
        </small>
    );
};

export interface ContrastNoticeProps {
    /** Colours to check, each with the name the owner sees in the list. */
    colors: Array<{ name: string; color?: string | null }>;
    className?: string;
}

/**
 * One short line under a colour list naming every colour below 4.5 : 1
 * against the text drawn on it. Renders nothing when all colours pass.
 */
export const ContrastNotice = ({ colors, className }: ContrastNoticeProps) => {
    const { t } = useTranslation();
    const failing = colors.filter(({ color }) => rateColorContrast(color)?.level === 'fail').map(({ name }) => name);

    if (failing.length === 0) {
        return null;
    }

    return (
        <p className={classNames(styles.notice, className)} role="status">
            <WarningAmberRoundedIcon className={styles.icon} aria-hidden="true" />
            <span>
                {t('theme.contrast.notice', {
                    count: failing.length,
                    names: failing.join(t('theme.contrast.noticeSeparator')),
                })}
            </span>
        </p>
    );
};

export default ContrastBadge;
