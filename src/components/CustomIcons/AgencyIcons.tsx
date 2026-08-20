import type { ComponentProps } from 'react';
import Icon from '@ant-design/icons';
import { ReactComponent as AgencyCounselling } from '../../resources/img/svg/agency-counselling.svg';
import { ReactComponent as AllUsers } from '../../resources/img/svg/all-users.svg';

/* eslint-disable react/jsx-props-no-spreading */

/**
 * ORISO icon set for the Beratungsstelle master-data cards (Icons Master File,
 * 24px grid). Wrapped like every other admin icon so they inherit `currentColor`
 * and antd sizing instead of carrying their own fill.
 */
type AgencyIconProps = ComponentProps<typeof Icon>;

/** Beratungsstelle / advice center — the "who and where" card. */
export const AgencyCounsellingIcon = (props: AgencyIconProps) => <Icon component={AgencyCounselling} {...props} />;

/** The team of an advice center (consultants). */
export const AllUsersIcon = (props: AgencyIconProps) => <Icon component={AllUsers} {...props} />;
