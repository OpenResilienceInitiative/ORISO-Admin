import { useRef, useState } from 'react';
import type { StoryObj } from '@storybook/react-vite';
import { ConfigProvider } from 'antd';
import { buildAdminAntdTheme } from '../../../theme/antdM3Theme';
import { AreaFeaturesCard, type PostalRange } from './index';

const TOPICS = [
    { value: 'crime', label: 'Criminal Offenses' },
    { value: 'addiction', label: 'Addiction' },
    { value: 'family', label: 'Parents and Family' },
];

const FEATURES = [
    { key: 'video', label: 'Video calls' },
    { key: 'audio', label: 'Audio calls' },
    { key: 'voice', label: 'Voice messages' },
    { key: 'takeover', label: 'Take over case', disabled: true },
];

export default {
    title: 'Organisms/Cards/AreaFeatures',
    component: AreaFeaturesCard,
    parameters: {
        layout: 'fullscreen',
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/QfsgojtHQzBjbzU3Im9Cet/Admin.ORISO?node-id=1-34785',
        },
    },
};

const AreaFeaturesExample = () => {
    const nextId = useRef(3);
    const [topic, setTopic] = useState('crime');
    const [ranges, setRanges] = useState<PostalRange[]>([
        { id: 'r1', from: '10117', until: '', error: true },
        { id: 'r2', from: '10117', until: '10130' },
    ]);
    const [features, setFeatures] = useState<string[]>(['video', 'takeover']);

    const changeRange = (id: string, key: 'from' | 'until', value: string) =>
        setRanges((rs) => rs.map((r) => (r.id === id ? { ...r, [key]: value } : r)));

    const addRange = () => {
        const id = `r${nextId.current}`;
        nextId.current += 1;
        setRanges((rs) => [...rs, { id, from: '', until: '' }]);
    };

    const toggleFeature = (key: string) =>
        setFeatures((f) => (f.includes(key) ? f.filter((k) => k !== key) : [...f, key]));

    return (
        <ConfigProvider theme={buildAdminAntdTheme()}>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    padding: 40,
                    minHeight: '100vh',
                    background: 'var(--admin-workspace-background, #e4e2e2)',
                }}
            >
                <AreaFeaturesCard
                    topics={TOPICS}
                    topic={topic}
                    onTopicChange={setTopic}
                    ranges={ranges}
                    onRangeChange={changeRange}
                    onRemoveRange={(id) => setRanges((rs) => rs.filter((r) => r.id !== id))}
                    onAddRange={addRange}
                    features={FEATURES}
                    selectedFeatures={features}
                    onToggleFeature={toggleFeature}
                    onBack={() => undefined}
                    onComplete={() => undefined}
                />
            </div>
        </ConfigProvider>
    );
};

export const Default: StoryObj = {
    render: () => <AreaFeaturesExample />,
};
