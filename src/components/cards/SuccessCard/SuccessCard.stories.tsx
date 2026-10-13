import { useMemo, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ConfigProvider } from 'antd';
import { createInstance } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
// eslint-disable-next-line import/no-unresolved -- Storybook's subpath export
import { expect, fn, waitFor, within } from 'storybook/test';
import translationDe from '../../../locales/de/translation.json';
import translationEn from '../../../locales/en/translation.json';
import { buildAdminAntdTheme } from '../../../theme/antdM3Theme';
import { SuccessCard } from './index';

type Language = 'de' | 'en';

/** Public fixture: no auth providers, invite API or notes channel. Locale stays isolated from other stories. */
const PublicCompletionExample = ({ language, children }: { language: Language; children: ReactNode }) => {
    const locale = useMemo(() => {
        const instance = createInstance();
        instance.use(initReactI18next).init({
            lng: language,
            fallbackLng: 'de',
            initImmediate: false,
            keySeparator: false,
            interpolation: { escapeValue: false },
            resources: { de: { translation: translationDe }, en: { translation: translationEn } },
        });
        return instance;
    }, [language]);
    return (
        <I18nextProvider i18n={locale}>
            <ConfigProvider theme={buildAdminAntdTheme()}>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        padding: 'clamp(16px, 4vw, 40px)',
                        minHeight: '100vh',
                        background: 'var(--admin-workspace-background, #e4e2e2)',
                    }}
                >
                    {children}
                </div>
            </ConfigProvider>
        </I18nextProvider>
    );
};

const meta = {
    title: 'Organisms/Cards/Success',
    component: SuccessCard,
    parameters: { layout: 'fullscreen', language: 'de' },
    args: { onFinish: fn() },
    render: (args, { parameters }) => (
        <PublicCompletionExample language={parameters.language}>
            <SuccessCard {...args} />
        </PublicCompletionExample>
    ),
} satisfies Meta<typeof SuccessCard>;
export default meta;
type Story = StoryObj<typeof meta>;

const completionPlay: Story['play'] = async ({ canvasElement, args, parameters, userEvent }) => {
    const canvas = within(canvasElement);
    const resource: Record<string, string> = parameters.language === 'en' ? translationEn : translationDe;
    const audience = args.audience ?? 'counsellor';
    const login = canvas.getByRole('button', { name: resource[args.finishKey ?? 'cards.success.finish'] });
    const guideTitle = canvas.getByRole('heading', { name: resource['registrationGuide.title'] });
    await expect(canvas.getByTestId('registration-success-icon')).toBeVisible();
    // The immediate next action precedes the optional reading material in keyboard/document order.
    await expect(login.compareDocumentPosition(guideTitle)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    await expect(canvas.getByText(resource[`registrationGuide.${audience}.features.1`])).toBeVisible();
    await expect(canvas.getByText(resource[`registrationGuide.${audience}.features.2`])).toBeVisible();
    await expect(canvas.getByText(resource[`registrationGuide.${audience}.features.3`])).toBeVisible();
    const summary = canvas.getByText(resource['registrationGuide.quickStart']);
    const details = summary.closest('details')!;
    summary.focus();
    await expect(summary).toHaveFocus();
    // Testing-library keyboard events do not invoke the browser's native summary activation.
    // Actual Enter/Space activation is checked with the isolated Playwright fixture.
    await userEvent.click(summary);
    await waitFor(() => expect(details).toHaveAttribute('open'));
    await expect(within(details).getAllByRole('listitem')).toHaveLength(3);
    await expect(canvas.getByText(resource[`registrationGuide.${audience}.tutorials`])).toBeVisible();
    await userEvent.click(summary);
    await waitFor(() => expect(details).not.toHaveAttribute('open'));
    await expect(canvas.queryByRole('textbox')).toBeNull();
    await expect(canvas.queryByRole('link')).toBeNull();
    const root = canvasElement.ownerDocument.documentElement;
    await expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth);
    await expect(login.scrollWidth).toBeLessThanOrEqual(login.clientWidth);
    login.focus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onFinish).toHaveBeenCalledTimes(1);
};

const completion = (language: Language, viewport: string, agencyAdmin = false): Story => ({
    parameters: {
        language,
        viewport: {
            options: { completionTablet820: { name: 'Tablet 820', styles: { width: '820px', height: '1180px' } } },
        },
    },
    globals: { viewport: { value: viewport, isRotated: false } },
    args: agencyAdmin
        ? {
              audience: 'agencyAdmin',
              titleKey: 'counsellorOnboarding.agencySetup.title',
              subtitleKey: 'counsellorOnboarding.agencySetup.subtitle',
              finishKey: 'counsellorOnboarding.agencySetup.finish',
          }
        : {},
    play: completionPlay,
});

/** Public completion examples retain their role-specific information without requiring login. */
export const Default: Story = completion('de', 'desktop');
export const CounsellorGermanPhone390: Story = completion('de', 'phone');
export const CounsellorGermanTablet820: Story = completion('de', 'completionTablet820');
export const CounsellorEnglishDesktop1440: Story = completion('en', 'desktop');
export const CounsellorEnglishPhone390: Story = completion('en', 'phone');
export const CounsellorEnglishTablet820: Story = completion('en', 'completionTablet820');
export const AgencyAdminGermanDesktop1440: Story = completion('de', 'desktop', true);
export const AgencyAdminGermanPhone390: Story = completion('de', 'phone', true);
export const AgencyAdminGermanTablet820: Story = completion('de', 'completionTablet820', true);
export const AgencyAdminEnglishDesktop1440: Story = completion('en', 'desktop', true);
export const AgencyAdminEnglishPhone390: Story = completion('en', 'phone', true);
export const AgencyAdminEnglishTablet820: Story = completion('en', 'completionTablet820', true);
