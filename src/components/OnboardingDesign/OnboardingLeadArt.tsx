import styles from './styles.module.scss';

export type OnboardingLeadVariant = 'initials' | 'check' | 'refresh' | 'clock';

export interface OnboardingLeadArtProps {
    variant: OnboardingLeadVariant;
    /** Up to two letters, for the `initials` variant. */
    initials?: string;
}

const RED = 'var(--m3-primary, #a5000a)';
const GREY = 'var(--m3-on-surface-variant, #444748)';

/**
 * Calm lead graphic above the page heading: a disc on the left, a dotted path,
 * a target on the right. One hue (ORISO red) plus neutral grey, never green or
 * amber. The `clock` variant is grey on purpose — an expired link is not an
 * alarm. Decorative, so hidden from assistive technology.
 */
export const OnboardingLeadArt = ({ variant, initials = '' }: OnboardingLeadArtProps) => {
    const tone = variant === 'clock' ? GREY : RED;
    const haze = variant === 'clock' ? 'rgba(27, 27, 28, 0.04)' : 'rgba(165, 0, 10, 0.04)';
    const haze2 = variant === 'clock' ? 'rgba(27, 27, 28, 0.07)' : 'rgba(165, 0, 10, 0.07)';
    const dotted = variant === 'clock' ? 'rgba(27, 27, 28, 0.3)' : 'rgba(165, 0, 10, 0.28)';
    const target = variant === 'clock' ? 'rgba(27, 27, 28, 0.3)' : 'rgba(165, 0, 10, 0.45)';

    return (
        <svg className={styles.leadArt} viewBox="0 0 624 120" aria-hidden="true" focusable="false">
            <circle cx="60" cy="60" r="58" fill={haze} />
            <circle cx="60" cy="60" r="44" fill={haze2} />
            <circle cx="60" cy="60" r="30" fill={tone} />
            {variant === 'initials' && (
                <text
                    x="60"
                    y="68"
                    textAnchor="middle"
                    fontFamily="Inter, system-ui, sans-serif"
                    fontSize="22"
                    fontWeight="700"
                    fill="#ffffff"
                >
                    {initials}
                </text>
            )}
            {variant === 'check' && (
                <path
                    d="m49 61 8 8 15-17"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            )}
            {variant === 'refresh' && (
                <g fill="none" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M71 55a13 13 0 1 0 2 10" />
                    <path d="M72 46v10H62" />
                </g>
            )}
            {variant === 'clock' && (
                <g fill="none" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="60" cy="60" r="14" />
                    <path d="M60 52v9l6 4" />
                </g>
            )}
            <line
                x1="132"
                y1="60"
                x2={variant === 'clock' ? 400 : 572}
                y2="60"
                stroke={dotted}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="1 9"
            />
            {variant === 'clock' ? (
                <circle cx="600" cy="60" r="12" fill="none" stroke={target} strokeWidth="2" strokeDasharray="3 4" />
            ) : (
                <>
                    <circle cx="600" cy="60" r="12" fill="none" stroke={target} strokeWidth="2" />
                    <circle cx="600" cy="60" r="4" fill={RED} />
                </>
            )}
        </svg>
    );
};
