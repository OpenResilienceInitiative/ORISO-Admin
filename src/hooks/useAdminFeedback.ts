import { App, message, Modal, notification } from 'antd';

// App.useApp returns empty handles when used standalone. Keep that compatibility
// explicit; production and Storybook install App inside their themed ConfigProvider.
const standaloneFeedback = {
    get message() {
        return message;
    },
    get notification() {
        return notification;
    },
    get modal() {
        return Modal;
    },
};

export const useAdminFeedback = () => {
    const contextual = App.useApp();
    return typeof contextual.message.success === 'function' ? contextual : standaloneFeedback;
};
