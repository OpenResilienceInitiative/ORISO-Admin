import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect } from 'react';
import i18n from 'i18next';
import { ProductTourTooltip } from './ProductTourTooltip';

/**
 * Fake Joyride render props so every tooltip state is reviewable in
 * isolation; positioning is covered by the ProductTour stories.
 */
const tooltipProps = (over: Record<string, unknown> = {}) =>
    ({
        index: 1,
        size: 4,
        isLastStep: false,
        continuous: true,
        step: {
            title: 'productTour.adminTour.navigation.title',
            content: 'productTour.adminTour.navigation.content',
        },
        backProps: { onClick: () => {}, 'aria-label': 'back' },
        closeProps: { onClick: () => {}, 'aria-label': 'close' },
        primaryProps: { onClick: () => {}, 'aria-label': 'next' },
        skipProps: { onClick: () => {}, 'aria-label': 'skip' },
        tooltipProps: {},
        controls: {
            next: () => {},
            prev: () => {},
            skip: () => {},
            close: () => {},
        },
        ...over,
    } as never);

const WithLanguage = ({ language, children }: { language: string; children: React.ReactNode }) => {
    useEffect(() => {
        const previous = i18n.language;
        i18n.changeLanguage(language);
        return () => {
            i18n.changeLanguage(previous);
        };
    }, [language]);
    return children as React.ReactElement;
};

const meta = {
    title: 'Molecules/ProductTourTooltip',
    component: ProductTourTooltip,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/QfsgojtHQzBjbzU3Im9Cet/Admin.ORISO?node-id=899-26642',
        },
        docs: {
            description: {
                component:
                    'Admin/M3-styled tooltip for React Joyride product tours. Renders translated step copy, progress, bullets and the admin button styles; all colors come from the --m3-* token variables (app.css).',
            },
        },
    },
} satisfies Meta<typeof ProductTourTooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FirstStep: Story = {
    args: tooltipProps({
        index: 0,
        step: {
            title: 'productTour.adminTour.welcome.title',
            content: 'productTour.adminTour.welcome.content',
        },
    }),
};

export const MiddleStep: Story = {
    args: tooltipProps({ index: 2 }),
};

export const FinalStep: Story = {
    args: tooltipProps({ index: 3, isLastStep: true }),
};

export const LongTranslatedCopy: Story = {
    args: tooltipProps({
        step: {
            title: 'productTour.adminTour.welcome.title',
            content: 'productTour.adminTour.welcome.content',
        },
    }),
    parameters: {
        docs: {
            description: {
                story: 'Long translated copy wraps without hiding the navigation actions.',
            },
        },
    },
};

export const German: Story = {
    args: tooltipProps({ index: 0 }),
    decorators: [
        (StoryComponent) => (
            <WithLanguage language="de">
                <StoryComponent />
            </WithLanguage>
        ),
    ],
};

export const English: Story = {
    args: tooltipProps({ index: 0 }),
    decorators: [
        (StoryComponent) => (
            <WithLanguage language="en">
                <StoryComponent />
            </WithLanguage>
        ),
    ],
};

export const MobileViewport: Story = {
    args: tooltipProps(),
    globals: { viewport: { value: 'mobile1', isRotated: false } },
};

export const TenantThemeTokenProof: Story = {
    args: tooltipProps(),
    decorators: [
        (StoryComponent) => (
            <div
                style={
                    {
                        '--m3-primary': '#1d4ed8',
                        '--m3-surface': '#f8fafc',
                        '--m3-on-surface': '#0f172a',
                        '--m3-on-surface-variant': '#475569',
                    } as React.CSSProperties
                }
            >
                <StoryComponent />
            </div>
        ),
    ],
    parameters: {
        docs: {
            description: {
                story: 'Overriding the --m3-* custom properties restyles the tooltip completely — proof that the component consumes theme tokens instead of hardcoded colors.',
            },
        },
    },
};
