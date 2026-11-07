import { App, Modal } from 'antd';
import { snackbar } from '../components/Snackbar/snackbarStore';

// Transient messages go through the one snackbar channel (src/components/Snackbar). `message` and
// `notification` keep their antd-shaped call signatures so existing call sites read the same; only
// `modal` still comes from antd. App.useApp returns empty handles when used standalone, which is
// why the fallback to the static Modal stays explicit.
export const useAdminFeedback = () => {
    const contextual = App.useApp();
    const modal = typeof contextual.modal.confirm === 'function' ? contextual.modal : Modal;
    return { message: snackbar, notification: snackbar, modal };
};
