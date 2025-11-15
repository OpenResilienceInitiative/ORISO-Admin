import React from 'react';
import Icon from '@ant-design/icons';
import { ReactComponent as Lock } from '../../resources/img/svg/lock.svg';

const CustomLockIcon = (props: any) => {
    // eslint-disable-next-line react/jsx-props-no-spreading
    return <Icon component={Lock} {...props} />;
};

export default CustomLockIcon;
