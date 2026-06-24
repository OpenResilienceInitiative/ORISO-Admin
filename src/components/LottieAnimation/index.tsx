import * as React from 'react';
import { useEffect, useMemo, useRef } from 'react';
import Lottie, { LottieRefCurrentProps } from 'lottie-react';
import { recolorLottieAccent } from './lottieColorUtils';

// Fallbacks used when the CSS variables cannot be resolved (e.g. SSR / tests).
const DEFAULT_ACCENT_COLOR = '#ffb4aa';
const DEFAULT_SECONDARY_COLOR = '#e8ebee';

const readCssColor = (cssVariableName: string, fallbackColor: string) => {
    if (typeof window === 'undefined') {
        return fallbackColor;
    }

    const value = getComputedStyle(document.documentElement).getPropertyValue(cssVariableName).trim();

    return /^#[0-9a-f]{6}$/i.test(value) ? value : fallbackColor;
};

export interface LottieAnimationProps {
    animationData: Record<string, any>;
    /** CSS variable driving the accent role (teal/red/magenta source colors). */
    accentColorVar?: string;
    /** CSS variable driving the figure role (black source color). */
    secondaryColorVar?: string;
    /** Playback speed. Defaults to half speed, as used on the app layer. */
    speed?: number;
    /** Play through once and stop (default) vs. loop forever. */
    loop?: boolean;
    className?: string;
}

/**
 * Theme-aware Lottie player. Mirrors the ORISO-Frontend EmptyStateAnimation
 * pattern: recolor the animation from CSS variables, autoplay once, half speed.
 */
export const LottieAnimation = ({
    animationData,
    accentColorVar = '--oriso-lottie-accent-color',
    secondaryColorVar = '--oriso-lottie-secondary-color',
    speed = 0.5,
    loop = false,
    className,
}: LottieAnimationProps) => {
    const lottieRef = useRef<LottieRefCurrentProps | null>(null);
    const accentColor = readCssColor(accentColorVar, DEFAULT_ACCENT_COLOR);
    const secondaryColor = readCssColor(secondaryColorVar, DEFAULT_SECONDARY_COLOR);

    const recoloredAnimationData = useMemo(
        () => recolorLottieAccent(animationData, accentColor, secondaryColor),
        [accentColor, animationData, secondaryColor],
    );

    useEffect(() => {
        lottieRef.current?.setSpeed(speed);
    }, [speed]);

    return (
        <div aria-hidden="true" className={className} data-cy="lottie-animation">
            <Lottie
                animationData={recoloredAnimationData}
                autoplay
                loop={loop}
                lottieRef={lottieRef}
                onDOMLoaded={() => lottieRef.current?.setSpeed(speed)}
                rendererSettings={{ preserveAspectRatio: 'xMidYMid meet' }}
            />
        </div>
    );
};

export default LottieAnimation;
