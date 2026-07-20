import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ConfigProvider } from 'antd';
import { buildAdminAntdTheme } from '../../theme/antdM3Theme';
import { PostalCodeRangeRow } from './index';

const meta: Meta<typeof PostalCodeRangeRow> = {
    title: 'Molecules/PostalCodeRangeRow',
    component: PostalCodeRangeRow,
    parameters: {
        layout: 'padded',
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/QfsgojtHQzBjbzU3Im9Cet/Admin.ORISO?node-id=1-34785',
        },
    },
};

export default meta;

interface Range {
    id: number;
    from: string;
    until: string;
    error?: boolean;
}

const RangesExample = () => {
    const [ranges, setRanges] = useState<Range[]>([
        { id: 1, from: '10117', until: '', error: true },
        { id: 2, from: '10117', until: '10130' },
    ]);
    const patch = (id: number, key: 'from' | 'until', v: string) =>
        setRanges((rs) => rs.map((r) => (r.id === id ? { ...r, [key]: v } : r)));
    return (
        <ConfigProvider theme={buildAdminAntdTheme()}>
            <div style={{ maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {ranges.map((r) => (
                    <PostalCodeRangeRow
                        key={r.id}
                        from={r.from}
                        until={r.until}
                        error={r.error}
                        onFromChange={(v) => patch(r.id, 'from', v)}
                        onUntilChange={(v) => patch(r.id, 'until', v)}
                        onRemove={() => setRanges((rs) => rs.filter((x) => x.id !== r.id))}
                    />
                ))}
            </div>
        </ConfigProvider>
    );
};

/** Two ranges as in Figma 1-34785 — the first in the error state. */
export const Ranges: StoryObj = {
    render: () => <RangesExample />,
};
