import { theme as antdTheme } from 'antd';

import { contrastRatio } from '../utils/contrastRatio';
import { computeOrisoPalette, type OrisoSchemeName } from '../utils/theme/orisoScheme';
import { buildAdminAntdTheme } from './antdM3Theme';

export interface InspectionContext {
    primaryColor: string;
    scheme: OrisoSchemeName;
    locale: 'de' | 'en';
}
export interface InspectionObservation {
    id: string;
    name: string;
    meaning: string;
    source: string;
    kind: 'color' | 'typography' | 'spacing' | 'radius' | 'size';
    expected: string;
    actual: string | null;
    authored: string | null;
    calculated: string | null;
    normalized: { expected: string | null; actual: string | null; calculated: string | null };
    status: 'match' | 'mismatch' | 'missing' | 'unresolved';
    issues: string[];
    target?: { selector: string; property: string };
    contrast?: {
        foreground: string;
        background: string;
        ratio: number | null;
        status: 'measured' | 'unresolved';
    };
}
export interface InspectionReport {
    context: InspectionContext;
    observations: InspectionObservation[];
    observed: {
        language: string;
        viewport: { width: number; height: number; dpr: number };
        innerWidth: number;
    };
}

/** Compare independent canonical and browser evidence, never replace missing data. */
export const observationStatus = ({
    actual,
    authored,
    normalized,
}: Pick<InspectionObservation, 'actual' | 'authored' | 'normalized'>): InspectionObservation['status'] => {
    if (actual === null) return authored?.includes('var(') ? 'unresolved' : 'missing';
    if (normalized.expected === null || normalized.actual === null) return 'unresolved';
    return normalized.expected === normalized.actual ? 'match' : 'mismatch';
};

/** Browser serialization belongs to an owned probe, not the observed component. */
const normalize = (document: Document, property: string, value: string | null): string | null => {
    if (!value || !CSS.supports(property, value)) return null;
    const probe = document.createElement('span');
    probe.hidden = true;
    probe.style.setProperty('all', 'initial', 'important');
    probe.style.setProperty('display', 'none', 'important');
    // Author !important rules must not change an independently expected value.
    probe.style.setProperty(property, value, 'important');
    document.body.append(probe);
    try {
        return document.defaultView?.getComputedStyle(probe).getPropertyValue(property).trim() || null;
    } finally {
        probe.remove();
    }
};

type Rgba = { channels: [number, number, number]; alpha: number };
const rgba = (value: string): Rgba | null => {
    const match = /^rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\s*\)$/.exec(value);
    if (!match) return null;
    const channels = [Number(match[1]), Number(match[2]), Number(match[3])] as [number, number, number];
    const alpha = match[4] === undefined ? 1 : Number(match[4]);
    if (
        channels.some((channel) => !Number.isFinite(channel) || channel < 0 || channel > 255) ||
        !Number.isFinite(alpha) ||
        alpha < 0 ||
        alpha > 1
    )
        return null;
    return { channels, alpha };
};
export const compositeColor = (foreground: Rgba, background: [number, number, number]): [number, number, number] =>
    foreground.channels.map((channel, index) =>
        Math.round(channel * foreground.alpha + background[index] * (1 - foreground.alpha)),
    ) as [number, number, number];
const hex = (channels: [number, number, number]) =>
    `#${channels.map((value) => value.toString(16).padStart(2, '0')).join('')}`;

const resolvedBackground = (element: HTMLElement): [number, number, number] | null => {
    const style = element.ownerDocument.defaultView?.getComputedStyle(element);
    if (!style || Number(style.opacity) !== 1) return null;
    const color = rgba(style.backgroundColor);
    if (!color) return null;
    if (color.alpha === 1) return color.channels;
    // A transparent document is not evidence for an invented white canvas.
    const behind = element.parentElement ? resolvedBackground(element.parentElement) : null;
    return behind ? compositeColor(color, behind) : null;
};
const measuredContrast = (element: HTMLElement): NonNullable<InspectionObservation['contrast']> => {
    const window = element.ownerDocument.defaultView;
    if (!window) throw new Error('Contrast inspection requires a browser window');
    const style = window.getComputedStyle(element);
    const foreground = rgba(style.color);
    let opaqueLayer = true;
    for (let ancestor: HTMLElement | null = element; ancestor; ancestor = ancestor.parentElement) {
        const layer = window.getComputedStyle(ancestor);
        if (
            Number(layer.opacity) !== 1 ||
            layer.backgroundImage !== 'none' ||
            layer.mixBlendMode !== 'normal' ||
            layer.filter !== 'none'
        )
            opaqueLayer = false;
    }
    const background = opaqueLayer ? resolvedBackground(element) : null;
    return {
        foreground: style.color,
        background: style.backgroundColor,
        status: foreground && background ? 'measured' : 'unresolved',
        ratio:
            foreground && background
                ? contrastRatio(hex(compositeColor(foreground, background)), hex(background))
                : null,
    };
};

const fieldMeaning: Record<string, string> = {
    '--admin-field-surface': 'Field surface, one step above the workspace',
    '--admin-field-outline': 'Resting field outline',
    '--admin-field-surface-hover': 'Hovered field surface',
    '--admin-field-selected-surface': 'Selected option surface',
    '--admin-field-selected-text': 'Selected option foreground',
};

export function inspectAppliedTokens({
    root,
    context,
    reference,
}: {
    root: HTMLElement;
    context: InspectionContext;
    reference: 'field' | 'bridge';
}): InspectionReport {
    const document = root.ownerDocument;
    const window = document.defaultView;
    if (!root.isConnected || !window) throw new Error('Token inspection requires a connected browser reference');
    const rootStyle = window.getComputedStyle(document.documentElement);
    const { tokens } = computeOrisoPalette({ accentDark: context.primaryColor }, context.scheme);
    const canonical = antdTheme.getDesignToken(
        buildAdminAntdTheme({ seeds: { accentDark: context.primaryColor }, scheme: context.scheme }),
    );
    const observations: InspectionObservation[] = [];
    const paletteNames =
        reference === 'field'
            ? Object.keys(tokens).filter((name) => name.startsWith('--admin-field-'))
            : ['--m3-primary'];
    paletteNames.forEach((name) => {
        const expected = tokens[name];
        const actual = rootStyle.getPropertyValue(name).trim() || null;
        const authored = document.documentElement.style.getPropertyValue(name).trim() || null;
        const normalized = {
            expected: normalize(document, 'color', expected),
            actual: normalize(document, 'color', actual),
            calculated: normalize(document, 'color', actual),
        };
        const status = observationStatus({ actual, authored, normalized });
        observations.push({
            id: `palette:${name}`,
            name,
            meaning: fieldMeaning[name] || 'Brand primary colour',
            source: `computeOrisoPalette(seeds, scheme).tokens[${name}]`,
            kind: 'color',
            expected,
            actual,
            authored,
            calculated: actual,
            normalized,
            status,
            issues:
                status === 'match'
                    ? []
                    : [
                          `${name}: ${status}; expected ${expected}, computed ${actual ?? '(absent)'}, authored ${
                              authored ?? '(stylesheet)'
                          }`,
                      ],
        });
    });
    const component = (
        name: string,
        property: string,
        selector: string,
        expected: string,
        kind: InspectionObservation['kind'],
        source: string,
        mapping?: string,
    ) => {
        const targets = root.matches(selector) ? [root] : [...root.querySelectorAll<HTMLElement>(selector)];
        const element = targets.length === 1 ? targets[0] : null;
        const actual = element ? window.getComputedStyle(element).getPropertyValue(property).trim() || null : null;
        const authored = element?.style.getPropertyValue(property).trim() || null;
        const calculated = mapping ? rootStyle.getPropertyValue(mapping).trim() || null : null;
        const normalized = {
            expected: normalize(document, property, expected),
            actual: normalize(document, property, actual),
            calculated: normalize(document, property, calculated),
        };
        const status = targets.length > 1 ? 'unresolved' : observationStatus({ actual, authored, normalized });
        const contrast = element && property === 'background-color' ? measuredContrast(element) : undefined;
        const issues =
            status === 'match'
                ? []
                : [`${name} ${property}: ${status}; expected ${expected}, applied ${actual ?? '(absent)'}`];
        if (targets.length !== 1) issues.push(`Expected one target ${selector}; found ${targets.length}`);
        if (contrast?.status === 'unresolved')
            issues.push('Contrast requires a resolvable foreground and actual opaque background chain');
        observations.push({
            id: `component:${name}:${property}`,
            name: `${name} ${property}`,
            meaning: `${kind} used by the real ${name} reference`,
            source,
            kind,
            expected,
            actual,
            authored,
            calculated,
            normalized,
            status,
            issues,
            target: { selector, property },
            ...(contrast ? { contrast } : {}),
        });
    };
    if (reference === 'field') {
        const input = '[data-token-inspection-input]';
        component(
            'field-input',
            'background-color',
            input,
            tokens['--admin-field-surface'],
            'color',
            'buildAdminAntdTheme().components.Input.colorBgContainer ← computeOrisoPalette --admin-field-surface',
            '--admin-field-surface',
        );
        component(
            'field-input',
            'font-size',
            input,
            `${canonical.fontSize}px`,
            'typography',
            'getDesignToken(buildAdminAntdTheme()).fontSize',
        );
        component(
            'field-input',
            'font-family',
            input,
            canonical.fontFamily,
            'typography',
            'getDesignToken(buildAdminAntdTheme()).fontFamily',
        );
        component(
            'field-input',
            'border-radius',
            input,
            `${canonical.borderRadius}px`,
            'radius',
            'getDesignToken(buildAdminAntdTheme()).borderRadius',
        );
        component(
            'field-input',
            'height',
            input,
            `${canonical.controlHeight}px`,
            'size',
            'getDesignToken(buildAdminAntdTheme()).controlHeight',
        );
        component(
            'field-workspace',
            'gap',
            '[data-token-inspection-workspace]',
            `${canonical.sizeXXL}px`,
            'spacing',
            'getDesignToken(buildAdminAntdTheme()).sizeXXL',
        );
    } else {
        component(
            'bridge-primary-button',
            'background-color',
            '[data-token-inspection-bridge] button.ant-btn-primary',
            tokens['--m3-primary'],
            'color',
            'buildAdminAntdTheme().token.colorPrimary ← computeOrisoPalette --m3-primary',
            '--m3-primary',
        );
    }
    return {
        context: { ...context },
        observations,
        observed: {
            language: document.documentElement.lang,
            viewport: { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio },
            innerWidth: root.getBoundingClientRect().width,
        },
    };
}
