import { useEffect, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- exports-map subpath resolves for TypeScript and Vite
import { expect, waitFor } from 'storybook/test';
import i18n from 'i18next';
import { ProductTourTooltip } from '../ProductTourTooltip';
import { adminIntroductionTour } from './adminIntroductionTour';

const WithLanguage = ({ language, children }: { language: string; children: ReactNode }) => {
    useEffect(() => {
        const previous = i18n.language;
        i18n.changeLanguage(language);
        return () => {
            i18n.changeLanguage(previous);
        };
    }, [language]);
    return children;
};

const noop = () => {};

/**
 * Every step of `admin-introduction` as the tooltip renders it, in tour order,
 * so the copy of the whole tour is reviewable at once. Positioning against the
 * real sidebar is covered by the ProductTourAdapter stories.
 */
const StepGallery = () => {
    const { steps } = adminIntroductionTour;
    return (
        <ol style={{ display: 'grid', gap: 24, padding: 0, margin: 0, listStyle: 'none', maxWidth: 420 }}>
            {steps.map((step, index) => (
                <li key={step.id} data-step-id={step.id}>
                    <ProductTourTooltip
                        {...({
                            index,
                            size: steps.length,
                            isLastStep: index === steps.length - 1,
                            continuous: true,
                            step: { title: step.titleKey, content: step.contentKey },
                            backProps: { onClick: noop },
                            closeProps: { onClick: noop },
                            primaryProps: { onClick: noop },
                            skipProps: { onClick: noop },
                            tooltipProps: {},
                            controls: { next: noop, prev: noop, skip: noop, close: noop },
                        } as never)}
                    />
                </li>
            ))}
        </ol>
    );
};

const meta = {
    title: 'Molecules/ProductTour/AdminIntroductionTour',
    component: StepGallery,
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component:
                    'The Admin introduction tour (`admin-introduction`, v1): welcome on Home, the sidebar areas (each optional, desktop only, role-dependent), My account and a closing step. Watch-only.',
            },
        },
    },
} satisfies Meta<typeof StepGallery>;

export default meta;
type Story = StoryObj<typeof meta>;

const expectStepsInOrder = async (canvasElement: HTMLElement, titles: string[]) => {
    await waitFor(() => {
        const rendered = Array.from(canvasElement.querySelectorAll('.productTourTooltip__title')).map(
            (title) => title.textContent,
        );
        expect(rendered).toEqual(titles);
    });
};

export const German: Story = {
    decorators: [
        (StoryComponent) => (
            <WithLanguage language="de">
                <StoryComponent />
            </WithLanguage>
        ),
    ],
    play: async ({ canvasElement, canvas }) => {
        await expectStepsInOrder(canvasElement, [
            'Willkommen in der Verwaltung',
            'Die Navigation',
            'Einstellungen',
            'Träger',
            'Beratungsstellen',
            'Konten',
            'Einladen, Statistiken und Logs',
            'Mein Account',
            'Geschafft',
        ]);
        await expect(canvas.getByText('Schritt 9 von 9')).toBeVisible();
        await expect(canvas.getAllByRole('button', { name: 'Fertig' })).toHaveLength(1);
    },
};

export const English: Story = {
    decorators: [
        (StoryComponent) => (
            <WithLanguage language="en">
                <StoryComponent />
            </WithLanguage>
        ),
    ],
    play: async ({ canvasElement, canvas }) => {
        await expectStepsInOrder(canvasElement, [
            'Welcome to the admin area',
            'The navigation',
            'Settings',
            'Providers',
            'Counselling centres',
            'Accounts',
            'Invite, statistics and logs',
            'My account',
            'All done',
        ]);
        await expect(canvas.getByText(/tour button \(\?\) at the bottom right/)).toBeVisible();
    },
};
