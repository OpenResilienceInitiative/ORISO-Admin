import React from 'react';
import Icon from '@ant-design/icons';
import { ReactComponent as ChevronUp } from '../../resources/img/svg/chevron-up.svg';

const CustomChevronUpIcon = (props: any) => {
    // eslint-disable-next-line react/jsx-props-no-spreading
    return <Icon component={ChevronUp} {...props} />;
};

export default CustomChevronUpIcon;
