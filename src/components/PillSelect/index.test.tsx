import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { hasPillSelection, PillSelect } from './index';
import { PillFilterRow, type PillFilterConfig } from './PillFilterRow';
import styles from './styles.module.scss';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
    }),
}));

beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });
});

const topicOptions = [
    { value: 'legal', label: 'Rechtshilfe und Beratung' },
    { value: 'family', label: 'Familienberatung' },
    { value: 'debt', label: 'Schuldnerberatung' },
];

const SingleHarness = () => {
    const [value, setValue] = useState<string | null>(null);
    return <PillSelect label="Topic" options={topicOptions} value={value} onChange={setValue} />;
};

const MultiHarness = () => {
    const [value, setValue] = useState<string[]>([]);
    return <PillSelect mode="multiple" label="Topic" options={topicOptions} value={value} onChange={setValue} />;
};

const getPill = (name: string | RegExp) => screen.getByRole('button', { name });

describe('PillSelect', () => {
    it('renders outlined with the filter label while nothing is selected', () => {
        render(<SingleHarness />);
        const pill = getPill('Topic');
        expect(pill.parentElement).toHaveClass(styles.pill);
        expect(pill.parentElement).not.toHaveClass(styles.pillSelected);
    });

    it('updates the pill label and tonal class when an option is selected', async () => {
        const user = userEvent.setup();
        render(<SingleHarness />);

        await user.click(getPill('Topic'));
        await user.click(await screen.findByText('Rechtshilfe und Beratung'));

        const pill = getPill('Rechtshilfe und Beratung');
        expect(pill).toBeInTheDocument();
        expect(pill.parentElement).toHaveClass(styles.pillSelected);
    });

    it('reports the selection via onChange', async () => {
        const onChange = vi.fn();
        const user = userEvent.setup();
        render(<PillSelect label="Topic" options={topicOptions} value={null} onChange={onChange} />);

        await user.click(getPill('Topic'));
        await user.click(await screen.findByText('Familienberatung'));

        expect(onChange).toHaveBeenCalledWith('family');
    });

    it('summarizes multiple selections as "Label (n)"', async () => {
        const user = userEvent.setup();
        render(<MultiHarness />);

        await user.click(getPill('Topic'));
        await user.click(await screen.findByText('Rechtshilfe und Beratung'));
        await user.click(await screen.findByText('Familienberatung'));

        expect(getPill('Topic (2)')).toBeInTheDocument();
        expect(getPill('Topic (2)').parentElement).toHaveClass(styles.pillSelected);
    });

    it('shows the single selected label in multi mode before summarizing', async () => {
        const user = userEvent.setup();
        render(<MultiHarness />);

        await user.click(getPill('Topic'));
        await user.click(await screen.findByText('Schuldnerberatung'));

        expect(getPill('Schuldnerberatung')).toBeInTheDocument();
    });

    it('does not open the dropdown when disabled', async () => {
        const user = userEvent.setup();
        render(<PillSelect label="Topic" options={topicOptions} disabled />);

        await user.click(getPill('Topic'), { pointerEventsCheck: 0 });

        expect(screen.queryByText('Rechtshilfe und Beratung')).not.toBeInTheDocument();
        expect(getPill('Topic')).toBeDisabled();
    });
});

describe('hasPillSelection', () => {
    it('detects selections for both modes', () => {
        expect(hasPillSelection({ label: 'x', options: [], value: null })).toBe(false);
        expect(hasPillSelection({ label: 'x', options: [], value: 'a' })).toBe(true);
        expect(hasPillSelection({ mode: 'multiple', label: 'x', options: [], value: [] })).toBe(false);
        expect(hasPillSelection({ mode: 'multiple', label: 'x', options: [], value: ['a'] })).toBe(true);
    });
});

describe('PillFilterRow', () => {
    const GatedHarness = ({ onAction }: { onAction?: () => void }) => {
        const [topic, setTopic] = useState<string | null>(null);
        const [types, setTypes] = useState<string[]>([]);

        const filters: PillFilterConfig[] = [
            { key: 'topic', label: 'Topic', options: topicOptions, value: topic, onChange: setTopic },
            {
                key: 'types',
                mode: 'multiple',
                label: 'Conversation Type',
                options: [
                    { value: 'chat', label: 'Chat' },
                    { value: 'video', label: 'Video' },
                ],
                value: types,
                onChange: setTypes,
            },
        ];

        return <PillFilterRow filters={filters} action={{ label: 'New', onClick: onAction }} />;
    };

    it('flips the action button from disabled to primary exactly when all required pills are selected', async () => {
        const user = userEvent.setup();
        render(<GatedHarness />);

        const actionButton = () => screen.getByRole('button', { name: 'New' });
        expect(actionButton()).toBeDisabled();
        expect(actionButton()).not.toHaveClass('ant-btn-primary');

        // First filter selected — still gated by the second one.
        await user.click(getPill('Topic'));
        await user.click(await screen.findByText('Rechtshilfe und Beratung'));
        expect(actionButton()).toBeDisabled();

        // Second (multi) filter selected — the action becomes primary.
        await user.click(getPill('Conversation Type'));
        await user.click(await screen.findByText('Chat'));
        expect(actionButton()).toBeEnabled();
        expect(actionButton()).toHaveClass('ant-btn-primary');
    });

    it('ignores pills opted out via required={false}', () => {
        const filters: PillFilterConfig[] = [
            { key: 'topic', label: 'Topic', options: topicOptions, value: 'legal' },
            { key: 'optional', label: 'Optional', options: topicOptions, value: null, required: false },
        ];
        render(<PillFilterRow filters={filters} action={{ label: 'New' }} />);

        expect(screen.getByRole('button', { name: 'New' })).toBeEnabled();
    });
});
