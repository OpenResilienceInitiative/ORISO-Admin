import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';
import { ConfigProvider, theme as antdTheme } from 'antd';
import deDE from 'antd/es/locale/de_DE';
import enGB from 'antd/es/locale/en_GB';

import * as fieldStories from '../components/FieldTokens.stories';
import * as bridgeStories from './AdminThemeBridge.stories';
import { buildAdminAntdTheme } from './antdM3Theme';
import i18n from '../i18n';
import { markTokenDiagnostic } from '../../scripts/story-token-diagnostic';
import { applyAdminInvertedTheme, applyAdminTheme } from '../utils/applyAdminTheme';
import { contrastRatio } from '../utils/contrastRatio';
import { computeOrisoPalette, type OrisoSchemeName } from '../utils/theme/orisoScheme';

type ReferenceStoryContext = Parameters<NonNullable<typeof fieldStories.FieldAnatomy.render>>[1];

// Ordinary real-browser contracts; no DOM/CSS mocks and no a11y override.
// Native results and exact source bindings are retained in the task evidence packet.
interface Observation {
    id: string;
    name: string;
    meaning: string;
    source: string;
    kind: 'color' | 'typography' | 'spacing' | 'radius' | 'size';
    expected: string;
    actual: string | null;
    status: 'match' | 'mismatch' | 'missing' | 'unresolved';
    target?: { selector: string; property: string };
    contrast?: { foreground: string; background: string; ratio: number | null; status: 'measured' | 'unresolved' };
}
interface InspectionReport {
    context: { primaryColor: string; scheme: OrisoSchemeName; locale: string };
    observations: Observation[];
}

const contexts = [
    { primaryColor: '#A5000A', scheme: 'light', locale: 'de' },
    { primaryColor: '#A5000A', scheme: 'light', locale: 'en' },
    { primaryColor: '#A5000A', scheme: 'inverted', locale: 'de' },
    { primaryColor: '#A5000A', scheme: 'inverted', locale: 'en' },
    { primaryColor: '#1D4ED8', scheme: 'light', locale: 'de' },
    { primaryColor: '#1D4ED8', scheme: 'light', locale: 'en' },
    { primaryColor: '#1D4ED8', scheme: 'inverted', locale: 'de' },
    { primaryColor: '#1D4ED8', scheme: 'inverted', locale: 'en' },
] satisfies InspectionReport['context'][];

const readReport = (canvasElement: HTMLElement): InspectionReport => {
    const output = within(canvasElement).getByLabelText('Applied token report');
    const report: InspectionReport = JSON.parse(output.textContent || 'null');
    expect(report).toMatchObject({ context: expect.any(Object), observations: expect.any(Array) });
    expect(report.observations.length).toBeGreaterThan(0);
    expect(new Set(report.observations.map(({ id }) => id)).size).toBe(report.observations.length);
    return report;
};

const findObservation = (report: InspectionReport, id: string) => {
    const observation = report.observations.find((entry) => entry.id === id);
    expect(observation, `Missing report observation: ${id}`).toBeDefined();
    if (!observation) throw new Error(`Missing report observation: ${id}`);
    return observation;
};

// Independent test probe: an author stylesheet must not recolour the expected value.
const serialize = (property: string, value: string) => {
    markTokenDiagnostic(`serialize:${property}:before`);
    expect(CSS.supports(property, value), `${property}: ${value} must be valid CSS`).toBe(true);
    const probe = document.createElement('span');
    probe.hidden = true;
    probe.style.setProperty(property, value, 'important');
    document.body.append(probe);
    try {
        const result = getComputedStyle(probe).getPropertyValue(property).trim();
        markTokenDiagnostic(`serialize:${property}:computed`);
        expect(result, `${property}: ${value} must resolve`).not.toBe('');
        return result;
    } finally {
        probe.remove();
    }
};

const withDeclaration = async (
    target: HTMLElement,
    property: string,
    value: string,
    assertion: () => Promise<void>,
) => {
    const previous = target.style.getPropertyValue(property);
    const priority = target.style.getPropertyPriority(property);
    target.style.setProperty(property, value, 'important');
    try {
        await assertion();
    } finally {
        if (previous) target.style.setProperty(property, previous, priority);
        else target.style.removeProperty(property);
    }
    expect(target.style.getPropertyValue(property)).toBe(previous);
    expect(target.style.getPropertyPriority(property)).toBe(priority);
};

const prepareContext =
    (context: InspectionReport['context'], hostileProbeRule = false) =>
    async () => {
        const style = document.documentElement.getAttribute('style');
        const { language } = i18n;
        const documentLanguage = document.documentElement.getAttribute('lang');
        const rule = hostileProbeRule ? document.createElement('style') : null;
        if (rule) {
            // Targets normalization probes, not the actual Input reference.
            rule.textContent =
                'body > span { color: rgb(1, 2, 3) !important; background-color: rgb(1, 2, 3) !important; }';
            document.head.append(rule);
        }
        const restore = async () => {
            rule?.remove();
            if (style === null) document.documentElement.removeAttribute('style');
            else document.documentElement.setAttribute('style', style);
            markTokenDiagnostic('restore:language:before', context);
            await i18n.changeLanguage(language);
            markTokenDiagnostic('restore:language:after', context);
            if (documentLanguage === null) document.documentElement.removeAttribute('lang');
            else document.documentElement.setAttribute('lang', documentLanguage);
        };
        try {
            markTokenDiagnostic('prepare:language:before', context);
            await i18n.changeLanguage(context.locale);
            markTokenDiagnostic('prepare:language:after', context);
            const apply = context.scheme === 'light' ? applyAdminTheme : applyAdminInvertedTheme;
            markTokenDiagnostic('prepare:theme:before', context);
            expect(apply({ primaryColor: context.primaryColor })).toBe(true);
            markTokenDiagnostic('prepare:theme:after', context);
            return restore;
        } catch (error) {
            await restore();
            throw error;
        }
    };

const reference = (context: InspectionReport['context'], storyContext: ReferenceStoryContext, bridge = false) => {
    // Ordinary CSF already owns the project decorators. Re-composing them here
    // would mount a second Router; these reference exports have no local decorators.
    const render = bridge ? bridgeStories.BeforeAfter.render : fieldStories.FieldAnatomy.render;
    if (!render) throw new Error('The existing reference story must provide its render function');
    return (
        <ConfigProvider
            theme={buildAdminAntdTheme({ seeds: { accentDark: context.primaryColor }, scheme: context.scheme })}
            locale={context.locale === 'de' ? deDE : enGB}
        >
            {render(context, storyContext)}
        </ConfigProvider>
    );
};

const meta = {
    title: 'Foundations/Applied Token Inspection Contracts',
    parameters: { layout: 'fullscreen' },
} satisfies Meta;
export default meta;
type Story = StoryObj;

const colorOver = (value: string, background?: string) => {
    const channels = /^rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\s*\)$/.exec(value);
    if (!channels) throw new Error(`Expected computed colour, received ${value}`);
    const alpha = channels[4] === undefined ? 1 : Number(channels[4]);
    if (alpha < 1 && !background) throw new Error(`A translucent colour needs its actual background: ${value}`);
    const hex = channels.slice(1, 4).map((channel, index) => {
        const behind = background ? parseInt(background.slice(1 + index * 2, 3 + index * 2), 16) : 0;
        return Math.round(Number(channel) * alpha + behind * (1 - alpha))
            .toString(16)
            .padStart(2, '0');
    });
    return `#${hex.join('')}`;
};

const fieldContract = (context: InspectionReport['context']): Story => ({
    render: (_, storyContext) => {
        markTokenDiagnostic('render:before', context);
        const rendered = reference(context, storyContext);
        markTokenDiagnostic('render:after', context);
        return rendered;
    },
    beforeEach: prepareContext(context),
    play: async ({ canvasElement }) => {
        markTokenDiagnostic('play:before', context);
        const container = canvasElement;
        const screen = within(canvasElement);
        const table = screen.getByRole('table', { name: 'Applied design tokens' });
        ['Token', 'Meaning', 'Source', 'Expected', 'Applied', 'Status'].forEach((name) => {
            expect(within(table).getByRole('columnheader', { name })).toBeVisible();
        });
        const { tokens } = computeOrisoPalette({ accentDark: context.primaryColor }, context.scheme);
        markTokenDiagnostic('play:report:before', context);
        const report = readReport(canvasElement);
        markTokenDiagnostic('play:report:after', context);
        expect(report.context).toMatchObject(context);
        markTokenDiagnostic('play:palette:before', context);
        Object.entries(tokens)
            .filter(([name]) => name.startsWith('--admin-field-'))
            .forEach(([name, expected]) => {
                markTokenDiagnostic(`play:palette:${name}:before`, context);
                const observation = findObservation(report, `palette:${name}`);
                expect(observation).toMatchObject({ name, expected, status: 'match' });
                expect(observation.meaning).not.toBe('');
                expect(observation.source).toContain('computeOrisoPalette');
                expect(observation.actual).toBe(
                    getComputedStyle(document.documentElement).getPropertyValue(name).trim(),
                );
                expect(within(table).getByRole('rowheader', { name }).closest('tr')).toBeVisible();
                markTokenDiagnostic(`play:palette:${name}:after`, context);
            });
        markTokenDiagnostic('play:palette:after', context);
        const input = container.querySelector('input.ant-input:not([disabled])');
        expect(input).toBeInstanceOf(HTMLElement);
        if (!(input instanceof HTMLElement)) throw new Error('The real Antd Input must render');
        const observed = getComputedStyle(input);
        const field = findObservation(report, 'component:field-input:background-color');
        expect(field.source).toContain('buildAdminAntdTheme');
        expect(field).toMatchObject({ expected: tokens['--admin-field-surface'], status: 'match' });
        expect(field.actual).toBe(observed.backgroundColor);
        expect(observed.backgroundColor).toBe(serialize('background-color', tokens['--admin-field-surface']));
        markTokenDiagnostic('play:token-math:before', context);
        expect(field.contrast).toEqual({
            foreground: observed.color,
            background: observed.backgroundColor,
            status: 'measured',
            ratio: contrastRatio(
                colorOver(observed.color, colorOver(observed.backgroundColor)),
                colorOver(observed.backgroundColor),
            ),
        });
        markTokenDiagnostic('play:token-math:after', context);
        const canonical = antdTheme.getDesignToken(
            buildAdminAntdTheme({ seeds: { accentDark: context.primaryColor }, scheme: context.scheme }),
        );
        [
            ['font-size', canonical.fontSize, 'typography'],
            ['border-radius', canonical.borderRadius, 'radius'],
            ['height', canonical.controlHeight, 'size'],
        ].forEach(([property, value, kind]) => {
            const observation = findObservation(report, `component:field-input:${property}`);
            expect(observation).toMatchObject({ expected: `${value}px`, kind, status: 'match' });
            expect(observation.actual).toBe(observed.getPropertyValue(String(property)));
        });
        const spacing = findObservation(report, 'component:field-workspace:gap');
        expect(spacing).toMatchObject({ expected: `${canonical.sizeXXL}px`, kind: 'spacing', status: 'match' });
        expect(spacing.target).toMatchObject({ selector: expect.any(String), property: 'gap' });
        const workspace = spacing.target ? container.querySelector(spacing.target.selector) : null;
        if (!(workspace instanceof HTMLElement)) throw new Error('Spacing must name an actual workspace element');
        expect(workspace.contains(input)).toBe(true);
        expect(spacing.actual).toBe(getComputedStyle(workspace).gap);

        markTokenDiagnostic('play:accessibility:before', context);
        expect(i18n.resolvedLanguage).toBe(context.locale);
        expect(document.documentElement.lang).toBe(context.locale);
        expect(input).toHaveAccessibleName(i18n.t('search'));
        const disabledSelect = screen.getByRole('combobox', {
            name: i18n.t('tokenInspection.disabledTopic'),
        });
        expect(disabledSelect).toBeDisabled();
        expect(disabledSelect.closest('.ant-select')).toHaveAttribute('aria-disabled', 'true');
        markTokenDiagnostic('play:after', context);
    },
});

export const RedLightGerman = fieldContract(contexts[0]);
export const RedLightEnglish = fieldContract(contexts[1]);
export const RedInvertedGerman = fieldContract(contexts[2]);
export const RedInvertedEnglish = fieldContract(contexts[3]);
export const BlueLightGerman = fieldContract(contexts[4]);
export const BlueLightEnglish = fieldContract(contexts[5]);
export const BlueInvertedGerman = fieldContract(contexts[6]);
export const BlueInvertedEnglish = fieldContract(contexts[7]);

export const ComponentOverrideAndRestore: Story = {
    render: (_, storyContext) => reference(contexts[0], storyContext),
    beforeEach: prepareContext(contexts[0], true),
    play: async ({ canvasElement }) => {
        const input = canvasElement.querySelector('input.ant-input:not([disabled])');
        if (!(input instanceof HTMLElement)) throw new Error('The real Antd Input must render');
        const expected = computeOrisoPalette({ accentDark: contexts[0].primaryColor }, 'light').tokens[
            '--admin-field-surface'
        ];
        const observation = () => findObservation(readReport(canvasElement), 'component:field-input:background-color');
        expect(observation().status).toBe('match');
        await withDeclaration(input, 'background-color', '#00ff00', async () => {
            await waitFor(() => {
                expect(getComputedStyle(input).backgroundColor).toBe(serialize('background-color', '#00ff00'));
                expect(observation()).toMatchObject({
                    expected,
                    actual: getComputedStyle(input).backgroundColor,
                    status: 'mismatch',
                });
                expect(
                    within(canvasElement).getByRole('row', { name: /field-input.*background-color/ }),
                ).toHaveTextContent('mismatch');
            });
        });
        await waitFor(() => expect(observation().status).toBe('match'));
    },
};

export const MissingEffectiveRootAndRestore: Story = {
    render: (_, storyContext) => reference(contexts[0], storyContext),
    beforeEach: prepareContext(contexts[0]),
    play: async ({ canvasElement }) => {
        const root = document.documentElement;
        const name = '--admin-field-surface';
        const expected = computeOrisoPalette({ accentDark: contexts[0].primaryColor }, 'light').tokens[name];
        // Removing an inline value leaves app.css:236's real stylesheet fallback.
        // Assert that fact, then reset the effective unregistered property to its
        // guaranteed-invalid initial value; never pretend the fallback is absent.
        const previous = root.style.getPropertyValue(name);
        const priority = root.style.getPropertyPriority(name);
        try {
            root.style.removeProperty(name);
            expect(getComputedStyle(root).getPropertyValue(name).trim()).not.toBe('');
        } finally {
            if (previous) root.style.setProperty(name, previous, priority);
            else root.style.removeProperty(name);
        }
        await withDeclaration(root, name, 'initial', async () => {
            expect(getComputedStyle(root).getPropertyValue(name).trim()).toBe('');
            await waitFor(() => {
                expect(findObservation(readReport(canvasElement), `palette:${name}`)).toMatchObject({
                    expected,
                    actual: null,
                    status: 'missing',
                });
                expect(within(canvasElement).getByRole('rowheader', { name }).closest('tr')).toHaveTextContent(
                    'missing',
                );
            });
        });
        await waitFor(() => expect(findObservation(readReport(canvasElement), `palette:${name}`).status).toBe('match'));
    },
};

export const UnresolvedAuthoredRootAndRestore: Story = {
    render: (_, storyContext) => reference(contexts[0], storyContext),
    beforeEach: prepareContext(contexts[0]),
    play: async ({ canvasElement }) => {
        const root = document.documentElement;
        const name = '--admin-field-surface';
        const absent = '--token-inspection-deliberately-absent';
        expect(getComputedStyle(root).getPropertyValue(absent).trim()).toBe('');
        const expected = computeOrisoPalette({ accentDark: contexts[0].primaryColor }, 'light').tokens[name];
        await withDeclaration(root, name, `var(${absent})`, async () => {
            // Real CSS resolves an undefined var to an empty computed value;
            // the inspector must retain the authored expression to distinguish it.
            expect(root.style.getPropertyValue(name)).toBe(`var(${absent})`);
            expect(getComputedStyle(root).getPropertyValue(name).trim()).toBe('');
            await waitFor(() => {
                expect(findObservation(readReport(canvasElement), `palette:${name}`)).toMatchObject({
                    expected,
                    actual: null,
                    status: 'unresolved',
                });
                expect(within(canvasElement).getByRole('rowheader', { name }).closest('tr')).toHaveTextContent(
                    'unresolved',
                );
            });
        });
        await waitFor(() => expect(findObservation(readReport(canvasElement), `palette:${name}`).status).toBe('match'));
    },
};

export const ThemeBridgeBlueInvertedEnglish: Story = {
    render: (_, storyContext) => reference(contexts[7], storyContext, true),
    beforeEach: prepareContext(contexts[7]),
    play: async ({ canvasElement }) => {
        const context = contexts[7];
        expect(readReport(canvasElement).context).toMatchObject(context);
        const button = findObservation(readReport(canvasElement), 'component:bridge-primary-button:background-color');
        expect(button).toMatchObject({
            expected: computeOrisoPalette({ accentDark: context.primaryColor }, context.scheme).tokens['--m3-primary'],
            status: 'match',
        });
        expect(button.target).toMatchObject({ selector: expect.any(String), property: 'background-color' });
        const target = button.target ? canvasElement.querySelector(button.target.selector) : null;
        if (!(target instanceof HTMLButtonElement)) throw new Error('The observation must name the real M3 button');
        expect(target).toHaveAccessibleName(i18n.t('save'));
        expect(button.actual).toBe(getComputedStyle(target).backgroundColor);
        expect(button.actual).toBe(serialize('background-color', button.expected));
    },
};
