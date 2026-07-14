import type { Meta, StoryObj } from '@storybook/react-vite';
import ChevronDown from './ChevronDown';
import ChevronUp from './ChevronUp';
import Info from './Info';
import Lock from './Lock';
import Person from './Person';
import Verified from './Verified';

const ICONS = [
    { name: 'ChevronDown', Component: ChevronDown },
    { name: 'ChevronUp', Component: ChevronUp },
    { name: 'Info', Component: Info },
    { name: 'Lock', Component: Lock },
    { name: 'Person', Component: Person },
    { name: 'Verified', Component: Verified },
];

/**
 * The admin's custom SVG icon set, wrapped as antd `<Icon>` components so they inherit
 * `color`, `fontSize`, and the antd icon API (spread props). Use these instead of
 * inlining raw SVGs.
 */
const meta = {
    title: 'Atoms/CustomIcons',
    component: Info,
    parameters: { layout: 'padded' },
} satisfies Meta<typeof Info>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every icon in the set at a shared size. */
export const Gallery: Story = {
    render: () => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
            {ICONS.map(({ name, Component }) => (
                <div key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <Component style={{ fontSize: 28 }} />
                    <span style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>{name}</span>
                </div>
            ))}
        </div>
    ),
};

/** Icons inherit `color` and `fontSize` from props like any antd icon. */
export const Colored: Story = {
    render: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <Info style={{ fontSize: 20, color: 'var(--primary)' }} />
            <Info style={{ fontSize: 28, color: 'var(--error)' }} />
            <Info style={{ fontSize: 36, color: 'var(--on-surface-variant)' }} />
        </div>
    ),
};
