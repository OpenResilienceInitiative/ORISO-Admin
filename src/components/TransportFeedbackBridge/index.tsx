import { useLayoutEffect } from 'react';
import { App } from 'antd';
import { registerTransportFeedbackOwner } from '../../api/transportFeedback';

/** One canonical request-feedback owner inside the already themed App. */
export const TransportFeedbackBridge = () => {
    const { message } = App.useApp();
    useLayoutEffect(() => {
        if (typeof message.error !== 'function') throw new Error('Transport feedback bridge requires an App holder');
        return registerTransportFeedbackOwner(message);
    }, [message]);
    return null;
};
