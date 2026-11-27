import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { DPIA_CHAPTERS } from './DpiaChapters';
import type { AdditionalChapterId } from './DpiaChapters';
import type { CompliancePreset } from './dpiaContent';
import { populatedMasterData } from './__fixtures__/masterData';
import { DpiaEvidenceProvider } from './DpiaEvidenceDialog';
import styles from './styles.module.scss';

const ChapterPreview = ({
    chapter,
    preset,
    showInternalNotes,
}: {
    chapter: AdditionalChapterId;
    preset: CompliancePreset;
    showInternalNotes: boolean;
}) => {
    const [activePreset, setPreset] = useState(preset);
    const Chapter = DPIA_CHAPTERS[chapter];
    return (
        <DpiaEvidenceProvider>
            <div className={styles.page}>
                <main className={styles.body}>
                    <Chapter
                        preset={activePreset}
                        onPresetChange={setPreset}
                        showInternalNotes={showInternalNotes}
                        masterData={populatedMasterData}
                    />
                </main>
            </div>
        </DpiaEvidenceProvider>
    );
};

const meta = {
    title: 'Dpia/Chapters',
    component: ChapterPreview,
    parameters: { layout: 'fullscreen' },
    args: { chapter: 'kap1', preset: 'kdg', showInternalNotes: false },
} satisfies Meta<typeof ChapterPreview>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Chapter1: Story = {};
export const Chapter2: Story = { args: { chapter: 'kap2' } };
export const Chapter6: Story = { args: { chapter: 'kap6' } };
export const Chapter7: Story = { args: { chapter: 'kap7' } };
export const Chapter8: Story = { args: { chapter: 'kap8' } };
export const Chapter9: Story = { args: { chapter: 'kap9' } };
export const Chapter10: Story = { args: { chapter: 'kap10' } };
export const Chapter11: Story = { args: { chapter: 'kap11' } };
export const Dsgvo: Story = { args: { chapter: 'kap8', preset: 'dsgvo' } };
export const InternalNotes: Story = { args: { chapter: 'kap10', showInternalNotes: true } };
