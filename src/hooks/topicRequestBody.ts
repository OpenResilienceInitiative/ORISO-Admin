import merge from 'lodash.merge';
import { TopicAdminData } from '../types/TopicAdmin';

/**
 * The body a topic create/update sends, built from the stored record and whatever
 * the submitted card actually collected.
 *
 * The status handling is the reason this is a function with tests rather than an
 * expression inside the mutation. The topic page is split into cards, and antd
 * hands `onFinish` only the fields that card registered -- `initialValues` alone
 * does not put a key in there. The "name and description" card registers neither
 * `status` nor `internalIdentifier`, so a plain `formData.status ? 'ACTIVE' :
 * 'INACTIVE'` turned every typo fix on that card into a deactivation, and lodash
 * `merge` wrote that over the ACTIVE the record already had.
 *
 * A field the form did not submit means "leave it alone", never "false".
 * `updateAgencyData.ts` already guards its own flags this way.
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
