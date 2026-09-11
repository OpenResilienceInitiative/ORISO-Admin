import 'react-app-polyfill/stable';
// React 19 removed ReactDOM.render/unmountComponentAtNode, which antd v5's static
// message/notification/Modal APIs rely on. Without this official patch those static
// calls silently no-op (toasts/alerts never appear). Must run before any antd usage.
import '@ant-design/v5-patch-for-react-19';
import { message } from 'antd';
import { createRoot, type Root } from 'react-dom/client';
import { AdminApp } from './AdminApp';
import { initObservability } from './observability/initObservability';

// OBS-P8 (ORISO-Helm#62): start Real User Monitoring (Core Web Vitals) export
// to SigNoz as early as possible, before the app renders.
initObservability();

declare global {
    interface Window {
        orisoAdminRoot?: Root;
    }
}

/**
 * ant design message config
 * @see {@link https://ant.design/components/message/#API}
 */
message.config({
    duration: 3,
    maxCount: 3,
    top: 100,
});

const container = document.getElementById('root');
if (!container) {
    throw new Error('Application root element not found');
}

const root = window.orisoAdminRoot ?? createRoot(container);
window.orisoAdminRoot = root;
root.render(<AdminApp />);
