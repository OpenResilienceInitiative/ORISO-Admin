import { Form } from 'antd';
import { TimeslotField } from './index';
import { parseOpeningHours, serializeOpeningHours, type OpeningHoursSlot } from '../../utils/openingHours';
import styles from './styles.module.scss';

interface OpeningHoursFormFieldProps {
    /** antd form path; the agency master data keeps its existing `openingHours` string. */
    name?: string | Array<string | number>;
    label: string;
    disabled?: boolean;
}

/** Injected `value`/`onChange` by Form.Item — kept separate so the adapter stays declarative. */
const OpeningHoursControl = ({
    value,
    onChange,
    disabled,
}: {
    value?: string;
    onChange?: (next: string) => void;
    disabled?: boolean;
}) => {
    const { slots, legacyText } = parseOpeningHours(value);

    return (
        <TimeslotField
            value={slots}
            legacyText={legacyText}
            disabled={disabled}
            onChange={(next: OpeningHoursSlot[]) => onChange?.(serializeOpeningHours(next))}
        />
    );
};

/**
 * antd `Form.Item` adapter around {@link TimeslotField}. The stored value stays
 * the `openingHours` STRING the API already has (decision "Option A"): this
 * adapter parses it into slots for editing and serializes back on every change,
 * so no contract or migration is involved. Legacy free text is handed to the
 * editor read-only instead of being overwritten.
 */
export const OpeningHoursFormField = ({ name = 'openingHours', label, disabled }: OpeningHoursFormFieldProps) => (
    <Form.Item name={name} label={label} className={styles.formItem} colon={false}>
        <OpeningHoursControl disabled={disabled} />
    </Form.Item>
);

export default OpeningHoursFormField;
