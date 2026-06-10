import { useEffect, useState } from 'react';

const getNumberSeparators = (locale: string) =>
    locale.toLowerCase().startsWith('de')
        ? { decimalSeparator: ',', groupSeparator: '.' }
        : { decimalSeparator: '.', groupSeparator: ',' };

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseDisplayNumber = (value: string, locale: string) => {
    const trimmedValue = value.trim();
    const { decimalSeparator, groupSeparator } = getNumberSeparators(locale);
    const match = trimmedValue.match(/^(-?[\d.,]+)(%)?$/);

    if (!match) {
        return null;
    }

    const numericPart = match[1];
    const decimalPart = numericPart.includes(decimalSeparator) ? numericPart.split(decimalSeparator)[1] : '';
    const normalizedValue = Number(
        numericPart.replace(new RegExp(escapeRegExp(groupSeparator), 'g'), '').replace(decimalSeparator, '.'),
    );

    if (!Number.isFinite(normalizedValue)) {
        return null;
    }

    return {
        decimals: decimalPart.length,
        suffix: match[2] || '',
        value: normalizedValue,
    };
};

const formatDisplayNumber = (value: number, decimals: number, suffix: string, locale: string) => {
    const formattedValue = value.toLocaleString(locale, {
        maximumFractionDigits: decimals,
        minimumFractionDigits: decimals,
    });

    return `${formattedValue}${suffix}`;
};

export const useAnimatedDisplayValue = (value: string, duration = 2800, locale = 'de-DE') => {
    const [displayValue, setDisplayValue] = useState(value);

    useEffect(() => {
        const parsedValue = parseDisplayNumber(value, locale);
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

            setDisplayValue(formatDisplayNumber(nextValue, parsedValue.decimals, parsedValue.suffix, locale));

            if (progress < 1) {
                animationFrame = window.requestAnimationFrame(animateValue);
            }
        };

        setDisplayValue(formatDisplayNumber(0, parsedValue.decimals, parsedValue.suffix, locale));
        animationFrame = window.requestAnimationFrame(animateValue);

        return () => window.cancelAnimationFrame(animationFrame);
    }, [duration, locale, value]);

    return displayValue;
};
