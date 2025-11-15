import React from 'react';
import Icon from '@ant-design/icons';
import { ReactComponent as PersonIcon } from '../../resources/img/svg/person.svg';

const CustomPersonIcon = (props: any) => {
    // eslint-disable-next-line react/jsx-props-no-spreading
    return <Icon component={PersonIcon} {...props} />;
};

export default CustomPersonIcon;
