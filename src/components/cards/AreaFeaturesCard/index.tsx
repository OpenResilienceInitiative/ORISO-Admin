import classNames from 'classnames';
import { Card } from '../../Card';
import { Typography } from '../../Typography';
import { PostalCodeRangeRow } from '../../PostalCodeRangeRow';
import { FilterChip } from '../../FilterChip';
import { FloatingLabelSelect } from '../../FloatingLabelSelect';
import { M3Button } from '../../M3Button';
import { ReactComponent as AddIcon } from '../../../resources/img/svg/add.svg';
import styles from './styles.module.scss';

// Placeholder header glyph until the exact Figma house-pin icon is exported.
const HomePinIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden width="40" height="40">
        <path d="M4 11l8-6 8 6v9a1 1 0 01-1 1H5a1 1 0 01-1-1v-9z" stroke="currentColor" strokeWidth="1.6" fill="none" />
        <circle cx="12" cy="12" r="2.2" fill="currentColor" />
    </svg>
);

export interface PostalRange {
    id: string;
    from: string;
    until: string;
    error?: boolean;
}

export interface FeatureOption {
    key: string;
    label: string;
    disabled?: boolean;
}

export interface AreaFeaturesCardProps {
    topics: Array<{ value: string; label: string }>;
    topic: string;
    onTopicChange: (value: string) => void;
    ranges: PostalRange[];
    onRangeChange: (id: string, key: 'from' | 'until', value: string) => void;
    onRemoveRange: (id: string) => void;
    onAddRange: () => void;
    features: FeatureOption[];
    selectedFeatures: string[];
    onToggleFeature: (key: string) => void;
    onBack?: () => void;
    onComplete?: () => void;
    className?: string;
}

/**
 * "Configure area and additional features" wizard card (Figma Admin.ORISO 1-34785).
 * Assembled from FloatingLabelSelect + PostalCodeRangeRow (which itself reuses
 * FloatingLabelInput + IconButton) + FilterChip, all inside the shared Card skeleton.
 */
export const AreaFeaturesCard = ({
    topics,
    topic,
    onTopicChange,
    ranges,
    onRangeChange,
    onRemoveRange,
    onAddRange,
    features,
    selectedFeatures,
    onToggleFeature,
    onBack,
    onComplete,
    className,
}: AreaFeaturesCardProps) => (
    <Card
        className={classNames(styles.card, className)}
        headerIcon={<HomePinIcon />}
        titleKey="Configure area and additional features"
        subTitle="Customize your consultation catchment area and optional additional features like voice messages separately for each topic area."
        footer={
            <>
                <M3Button variant="text" onClick={onBack}>
                    Back
                </M3Button>
                <M3Button variant="text" onClick={onComplete}>
                    Complete registration
                </M3Button>
            </>
        }
    >
        <div className={styles.body}>
            <FloatingLabelSelect
                label="Topic area"
                value={topic}
                onChange={onTopicChange}
                options={topics}
                showSearch
            />

            <div className={styles.ranges}>
                {ranges.map((r) => (
                    <PostalCodeRangeRow
                        key={r.id}
                        from={r.from}
                        until={r.until}
                        error={r.error}
                        onFromChange={(v) => onRangeChange(r.id, 'from', v)}
                        onUntilChange={(v) => onRangeChange(r.id, 'until', v)}
                        onRemove={() => onRemoveRange(r.id)}
                    />
                ))}
            </div>

            <M3Button variant="outlined" icon={<AddIcon />} onClick={onAddRange} className={styles.addRangeButton}>
                additional postal code
            </M3Button>

            <div className={styles.features}>
                <Typography variant="title-small" as="h4">
                    Additional features
                </Typography>
                <Typography variant="body-small" color="var(--m3-on-surface-variant, #444748)">
                    Select which optional additional functions can be used by those seeking advice and others.
                </Typography>
                <div className={styles.chips}>
                    {features.map((f) => (
                        <FilterChip
                            key={f.key}
                            label={f.label}
                            disabled={f.disabled}
                            selected={selectedFeatures.includes(f.key)}
                            onChange={() => onToggleFeature(f.key)}
                        />
                    ))}
                </div>
            </div>
        </div>
    </Card>
);
