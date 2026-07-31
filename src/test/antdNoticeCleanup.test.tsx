// Guards the antd notice cleanup in ./setup.ts. The assertions live in the test
// that FOLLOWS the one raising a notice, because the leak this prevents is
// cross-test: antd's static message/notification singleton portals into
// document.body, which RTL's cleanup() never touches.
import '@ant-design/v5-patch-for-react-19';
import { message, notification } from 'antd';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('antd static notice cleanup between tests', () => {
    it('raises a message and a notification', async () => {
        message.error('LEAKY MESSAGE');
        notification.success({ message: 'LEAKY NOTIFICATION' });

        expect(await screen.findByText('LEAKY MESSAGE')).toBeInTheDocument();
        expect(await screen.findByText('LEAKY NOTIFICATION')).toBeInTheDocument();
    });

    it('starts with a body free of the previous test notices', () => {
        expect(document.querySelectorAll('.ant-message')).toHaveLength(0);
        expect(document.querySelectorAll('.ant-notification')).toHaveLength(0);
        expect(screen.queryByText('LEAKY MESSAGE')).not.toBeInTheDocument();
        expect(screen.queryByText('LEAKY NOTIFICATION')).not.toBeInTheDocument();
    });

    it('can still raise its own message after the cleanup ran', async () => {
        // Removing the container instead of destroying the singleton would leave
        // antd rendering off-document, and this findByText would time out.
        message.error('MESSAGE AFTER CLEANUP');

        expect(await screen.findByText('MESSAGE AFTER CLEANUP')).toBeInTheDocument();
    });

    it('cleans up a notice that was raised without being awaited', () => {
        message.error('FIRE AND FORGET');
    });

    it('starts clean after a fire-and-forget notice', () => {
        expect(screen.queryByText('FIRE AND FORGET')).not.toBeInTheDocument();
        expect(document.querySelectorAll('.ant-message')).toHaveLength(0);
    });

    it('leaves a notice on screen with fake timers still installed', async () => {
        message.error('FAKE TIMER NOTICE');
        expect(await screen.findByText('FAKE TIMER NOTICE')).toBeInTheDocument();

        // Left installed on purpose: the cleanup hook must not depend on the
        // test's clock to flush antd's unmount.
        vi.useFakeTimers();
    });

    it('starts clean after a test that ended under fake timers', () => {
        expect(screen.queryByText('FAKE TIMER NOTICE')).not.toBeInTheDocument();
        expect(document.querySelectorAll('.ant-message')).toHaveLength(0);
    });
});
