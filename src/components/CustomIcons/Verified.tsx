import React from 'react';
import Icon from '@ant-design/icons';
import { ReactComponent as Verified } from '../../resources/img/svg/verified.svg';

const CustomVerifiedIcon = (props: any) => {
    // eslint-disable-next-line react/jsx-props-no-spreading
    return <Icon component={Verified} {...props} />;
};

export default CustomVerifiedIcon;
