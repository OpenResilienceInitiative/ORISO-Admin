import { MuiSelectField, Option } from '../../../components/mui/MuiSelectField';
import { centreLabel, centreTopicOptions, CentreWithTopics, findCentre } from './topicsByCentre';

interface CentreTopicPickersProps {
    selectedCentres: Option[];
    centres: CentreWithTopics[];
    className?: string;
}

/** One topic picker per selected centre, offering only that centre's topics (#1264). */
export const CentreTopicPickers = ({ selectedCentres, centres, className }: CentreTopicPickersProps) => (
    <>
        {selectedCentres.map(({ value, label }) => {
            const centre = findCentre(centres, value);
            const options = centreTopicOptions(centre);
            return (
                <MuiSelectField
                    key={value}
                    name={['topicsByAgency', String(value)]}
                    label="counselor.topicsAtAgency"
                    labelValues={{ agency: centre ? centreLabel(centre) : label }}
                    labelInValue
                    isMulti
                    allowClear
                    placeholder="plsSelect"
                    help={options.length === 0 ? 'counselor.topicsAtAgency.none' : undefined}
                    // Disabled, not hidden: the admin sees the centre offers nothing to pick.
                    disabled={options.length === 0 || undefined}
                    options={options}
                    className={className}
                />
            );
        })}
    </>
);
