import { useTranslation } from 'react-i18next';
import { MuiSwitchField } from '../mui/MuiSwitchField';
import { TEAM_FUNCTIONS, type TeamFunctionId } from './teamFunctions';

interface TeamFunctionSwitchProps {
    fn: TeamFunctionId;
    className?: string;
    disabled?: boolean;
}

/**
 * The one setting row for a team function: switch, shared name, shared description.
 * Mounted wherever a team function can be set, so the same thing reads and looks the same
 * whichever way someone reaches it. Must sit inside an antd `Form`.
 */
export const TeamFunctionSwitch = ({ fn, className, disabled }: TeamFunctionSwitchProps) => {
    const { t } = useTranslation();
    const definition = TEAM_FUNCTIONS[fn];
    return (
        <MuiSwitchField
            name={definition.field}
            label={t(definition.nameKey)}
            helpText={t(definition.descriptionKey)}
            className={className}
            disabled={disabled}
        />
    );
};
