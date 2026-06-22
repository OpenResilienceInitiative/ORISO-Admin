import { Spin } from 'antd';

export const PageLoader = () => (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
        <Spin size="large" />
    </div>
);
