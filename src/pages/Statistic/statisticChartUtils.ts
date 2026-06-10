import type { ConversationSegment, DonutRenderSegment } from './types';

const donutGapSize = 1.3;

export const gridLinePositions = [0, 33.33, 66.66, 100];

export const getCaseAxisMax = (maxValue: number) => {
    if (maxValue <= 6) {
        return 6;
    }

    if (maxValue <= 10) {
        return 10;
    }

    if (maxValue <= 20) {
        return 20;
    }

    return Math.ceil(maxValue / 10) * 10;
};

export const getCaseAxisLabels = (maxValue: number, locale = 'de-DE') => {
    const topValue = getCaseAxisMax(maxValue);

    return [topValue, Math.round(topValue * 0.66), Math.round(topValue * 0.33), 0].map((label) =>
        label.toLocaleString(locale),
    );
};

export const buildDonutSegments = (segments: ConversationSegment[]): DonutRenderSegment[] => {
    const total = segments.reduce((sum, segment) => sum + segment.value, 0);
    const drawableSize = 100 - segments.length * donutGapSize;
    let cursor = 0;

    if (!total) {
        return [];
    }

    return segments.map((segment) => {
        const size = Math.max((segment.value / total) * drawableSize, 0);
        const renderSegment = {
            color: segment.color,
            offset: cursor,
            size,
        };

        cursor += size + donutGapSize;

        return renderSegment;
    });
};
