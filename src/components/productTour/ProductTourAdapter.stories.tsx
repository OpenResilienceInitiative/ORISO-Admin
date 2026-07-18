import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { ProductTourAdapter } from './ProductTourAdapter';
import { ProductTourTooltip } from './ProductTourTooltip';
import { adminDemoTour } from './tourDefinitions';
import type { TourDefinition, TourEvent, TourPlacement, TourStep } from './types';

const demoTour = (steps: TourStep[]): TourDefinition => ({
    id: 'storybook-demo-tour',
    version: 1,
    surface: 'admin',
    audiences: ['tenant_admin'],
    titleKey: 'productTour.adminTour.title',
    summaryKey: 'productTour.adminTour.summary',
    steps,
});

const anchoredStep = (placement: TourPlacement): TourStep => ({
    id: `demo-${placement}`,
    target: 'storybook-demo-anchor',
    placement,
    titleKey: 'productTour.adminTour.navigation.title',
    contentKey: 'productTour.adminTour.navigation.content',
});

const DemoAnchor = () => (
    <div
        data-tour-target="storybook-demo-anchor"
        style={{
            margin: '40vh auto',
            width: 280,
            padding: 16,
            textAlign: 'center',
            border: '1px dashed var(--m3-outline, #747878)',
            borderRadius: 8,
        }}
    >
        Demo target element
    </div>
);

const EventLog = ({ events }: { events: { event: TourEvent; stepId?: string }[] }) => (
    <section
        aria-label="Tour event log"
        style={{
            position: 'fixed',
            right: 8,
            bottom: 8,
            maxWidth: 320,
            padding: 8,
            fontSize: 12,
            background: 'var(--m3-surface, #fff)',
            border: '1px solid var(--m3-outline, #747878)',
            borderRadius: 8,
            zIndex: 100,
        }}
    >
        <strong>Events</strong>
        <ol style={{ margin: 4, paddingLeft: 18 }}>
            {events.map((entry, i) => (
                <li key={i}>
                    {entry.event}
                    {entry.stepId ? ` (${entry.stepId})` : ''}
                </li>
            ))}
        </ol>
    </section>
);

const TourPlayground = ({
    tour,
    paused = false,
    targetTimeoutMs = 2500,
    children,
}: React.PropsWithChildren<{
    tour: TourDefinition;
    paused?: boolean;
    targetTimeoutMs?: number;
}>) => {
    const [events, setEvents] = useState<{ event: TourEvent; stepId?: string }[]>([]);
    return (
        <div style={{ minHeight: '100vh' }}>
            {children}
            <EventLog events={events} />
            <ProductTourAdapter
                tour={tour}
                active
                paused={paused}
                targetTimeoutMs={targetTimeoutMs}
                tooltipComponent={ProductTourTooltip}
                onEvent={(event, step) => setEvents((prev) => [...prev, { event, stepId: step?.id }])}
                onTerminalStatus={() => {}}
            />
        </div>
    );
};

const meta = {
    title: 'Organisms/ProductTour',
    component: ProductTourAdapter,
    tags: ['autodocs'],
    parameters: {
        layout: 'fullscreen',
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/QfsgojtHQzBjbzU3Im9Cet/Admin.ORISO?node-id=899-26642',
        },
        docs: {
            description: {
                component:
                    'Controlled React Joyride adapter for the ORISO product-tour contract in the admin console: bounded target waiting, domain events and the Admin/M3 tooltip. No production tour is enabled in this package — the protected-layout story is a review surface only.',
            },
        },
        // The Joyride overlay intentionally dims the page, so contrast is
        // only meaningful inside the tooltip surface itself.
        a11y: {
            config: {
                rules: [
                    {
                        id: 'color-contrast',
                        selector: '.productTourTooltip, .productTourTooltip *',
                    },
                ],
            },
        },
    },
    // Every story renders through TourPlayground; these args only satisfy the
    // component's required props for Storybook's type-level args contract.
    args: {
        tour: adminDemoTour,
        active: true,
    },
} satisfies Meta<typeof ProductTourAdapter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CenteredIntroduction: Story = {
    render: () => (
        <TourPlayground
            tour={demoTour([
                {
                    id: 'welcome',
                    target: '',
                    placement: 'center',
                    titleKey: 'productTour.adminTour.welcome.title',
                    contentKey: 'productTour.adminTour.welcome.content',
                },
            ])}
        />
    ),
};

export const PlacementTop: Story = {
    render: () => (
        <TourPlayground tour={demoTour([anchoredStep('top')])}>
            <DemoAnchor />
        </TourPlayground>
    ),
};

export const PlacementBottom: Story = {
    render: () => (
        <TourPlayground tour={demoTour([anchoredStep('bottom')])}>
            <DemoAnchor />
        </TourPlayground>
    ),
};

export const PlacementLeft: Story = {
    render: () => (
        <TourPlayground tour={demoTour([anchoredStep('left')])}>
            <DemoAnchor />
        </TourPlayground>
    ),
};

export const PlacementRight: Story = {
    render: () => (
        <TourPlayground tour={demoTour([anchoredStep('right')])}>
            <DemoAnchor />
        </TourPlayground>
    ),
};

export const MissingTarget: Story = {
    render: () => (
        <TourPlayground
            targetTimeoutMs={800}
            tour={demoTour([
                {
                    id: 'welcome',
                    target: '',
                    placement: 'center',
                    titleKey: 'productTour.adminTour.welcome.title',
                    contentKey: 'productTour.adminTour.welcome.content',
                },
                {
                    id: 'ghost',
                    target: 'does-not-exist',
                    titleKey: 'productTour.adminTour.navigation.title',
                    contentKey: 'productTour.adminTour.navigation.content',
                },
                anchoredStep('bottom'),
            ])}
        >
            <DemoAnchor />
        </TourPlayground>
    ),
    parameters: {
        docs: {
            description: {
                story: "Click next on the intro: the second step's target never appears, so after the bounded wait a target_missing event is logged and the tour continues safely on the third step.",
            },
        },
    },
};

const LateAnchor = () => {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const timer = setTimeout(() => setVisible(true), 1500);
        return () => clearTimeout(timer);
    }, []);
    return visible ? <DemoAnchor /> : null;
};

export const PendingNavigation: Story = {
    render: function PendingNavigationStory() {
        return (
            <TourPlayground
                tour={demoTour([
                    {
                        id: 'welcome',
                        target: '',
                        placement: 'center',
                        titleKey: 'productTour.adminTour.welcome.title',
                        contentKey: 'productTour.adminTour.welcome.content',
                    },
                    anchoredStep('bottom'),
                ])}
            >
                <LateAnchor />
            </TourPlayground>
        );
    },
    parameters: {
        docs: {
            description: {
                story: "The second step's target mounts 1.5s late (simulating navigation): after next, the tour stays on the intro until the target is ready — the adapter never positions against a missing element.",
            },
        },
    },
};

export const PausedByBlockingDialog: Story = {
    render: () => (
        <TourPlayground paused tour={demoTour([anchoredStep('bottom')])}>
            <DemoAnchor />
            <div
                role="dialog"
                aria-label="Blocking dialog placeholder"
                style={{
                    position: 'fixed',
                    inset: '30% 25%',
                    background: 'var(--m3-surface, #fff)',
                    border: '2px solid var(--m3-primary, #a5000a)',
                    borderRadius: 8,
                    display: 'grid',
                    placeItems: 'center',
                    zIndex: 60,
                }}
            >
                A higher-priority dialog pauses the tour.
            </div>
        </TourPlayground>
    ),
};

export const ProtectedLayoutTour: Story = {
    render: () => (
        <TourPlayground tour={adminDemoTour} targetTimeoutMs={4000}>
            <div style={{ display: 'flex', minHeight: '100vh' }}>
                <nav
                    data-tour-target="admin-navigation"
                    aria-label="Admin navigation mock"
                    style={{
                        width: 220,
                        padding: 16,
                        borderRight: '1px solid var(--m3-outline, #747878)',
                    }}
                >
                    <p>Mandanten</p>
                    <p>Beratungsstellen</p>
                    <p>Berater:innen</p>
                    <p>Einstellungen</p>
                </nav>
                <main style={{ flex: 1, padding: 24 }}>Mock admin content area</main>
            </div>
        </TourPlayground>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Representative protected-layout tour (the adminDemoTour definition) against a mocked admin shell. Not enabled in production — adminTours stays empty in this package.',
            },
        },
    },
};
