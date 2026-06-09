import { useEffect, useState } from 'react';

const parseDisplayNumber = (value: string) => {
    const trimmedValue = value.trim();
    const match = trimmedValue.match(/^(-?[\d.]+(?:,\d+)?)(%)?$/);

    if (!match) {
        return null;
    }

    const numericPart = match[1];
    const decimalPart = numericPart.includes(',') ? numericPart.split(',')[1] : '';
    const normalizedValue = Number(numericPart.replace(/\./g, '').replace(',', '.'));

    if (!Number.isFinite(normalizedValue)) {
        return null;
    }

    return {
        decimals: decimalPart.length,
        suffix: match[2] || '',
        value: normalizedValue,
    };
};

const formatDisplayNumber = (value: number, decimals: number, suffix: string) => {
    const formattedValue =
        decimals > 0
            ? value.toFixed(decimals).replace('.', ',')
            : Math.round(value).toLocaleString('de-DE', { maximumFractionDigits: 0 });

    return `${formattedValue}${suffix}`;
};

export const useAnimatedDisplayValue = (value: string, duration = 2800) => {
    const [displayValue, setDisplayValue] = useState(value);

    useEffect(() => {
        const parsedValue = parseDisplayNumber(value);
        const prefersReducedMotion =
            typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (!parsedValue || prefersReducedMotion) {
            setDisplayValue(value);
            return undefined;
        }

        let animationFrame = 0;
        let startTime = 0;

        const animateValue = (timestamp: number) => {
            if (!startTime) {
                startTime = timestamp;
            }

            const progress = Math.min((timestamp - startTime) / duration, 1);
            const easedProgress = 1 - (1 - progress) ** 3;
            const nextValue = parsedValue.value * easedProgress;

            setDisplayValue(formatDisplayNumber(nextValue, parsedValue.decimals, parsedValue.suffix));

            if (progress < 1) {
                animationFrame = window.requestAnimationFrame(animateValue);
            }
        };

        setDisplayValue(formatDisplayNumber(0, parsedValue.decimals, parsedValue.suffix));
        animationFrame = window.requestAnimationFrame(animateValue);

        return () => window.cancelAnimationFrame(animationFrame);
    }, [duration, value]);

    return displayValue;
};
