import merge from 'lodash.merge';
import { TopicAdminData } from '../types/TopicAdmin';

/**
 * The body a topic create/update sends, built from the stored record and what the submitted card
 * actually collected.
 *
 * antd hands `onFinish` only the fields that card registered, and the name/description card
 * registers no `status`. A field the form did not submit means "leave it alone", never "false" —
 * coercing it turned a typo fix into a deactivation.
 */
export const buildTopicRequestBody = (
    topicData: TopicAdminData | undefined,
    formData: Record<string, any>,
): Record<string, unknown> =>
    merge({}, topicData, {
        ...formData,
        name: {
            ...(formData?.name || {}),
            translate: undefined,
        },
        description: {
            ...(formData?.description || {}),
            translate: undefined,
        },
        external: false,
        ...('status' in formData ? { status: formData.status ? 'ACTIVE' : 'INACTIVE' } : {}),
    });
