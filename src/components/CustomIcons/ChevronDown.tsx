import React from 'react';
import Icon from '@ant-design/icons';
import { ReactComponent as ChevronDown } from '../../resources/img/svg/chevron-down.svg';

const CustomChevronDownIcon = (props: any) => {
    // eslint-disable-next-line react/jsx-props-no-spreading
    return <Icon component={ChevronDown} {...props} />;
};

export default CustomChevronDownIcon;
