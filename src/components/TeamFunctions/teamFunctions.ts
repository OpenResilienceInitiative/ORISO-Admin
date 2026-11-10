/**
 * The two team functions of the platform, defined ONCE.
 *
 * They are different features and must never share a name:
 *
 * - `counselling` (Teamberatung / Team counselling) is an agency setting (`teamAgency`): all counsellors
 *   of the counselling centre see all chats and may join at any time.
 * - `chat` (Team-Chat / Team chat) is a provider switch (`featureTeamDiscussionEnabled`): counsellors
 *   coordinate on an OPEN enquiry in a team-only room; it closes when the enquiry is accepted.
 *
 * Name and description live in the locale files under `teamFunctions.*`. Every place that sets or
 * mentions a team function reads them through this module (`TeamFunctionSwitch` for the form-card row;
 * the provider tile uses the same entry with its own row layout), so the wording cannot drift between
 * the provider tab, the agency master data and the agency list.
 * The saved data keys (`field`) are unchanged API contract: only labels and rendering are shared.
 */
export type TeamFunctionId = 'counselling' | 'chat';

export interface TeamFunctionDefinition {
    nameKey: string;
    descriptionKey: string;
    /** Form path of the persisted value. Unchanged since before the rename. */
    field: string | string[];
}

export const TEAM_FUNCTIONS: Record<TeamFunctionId, TeamFunctionDefinition> = {
    counselling: {
        nameKey: 'teamFunctions.counselling.name',
        descriptionKey: 'teamFunctions.counselling.description',
        field: 'teamAgency',
    },
    chat: {
        nameKey: 'teamFunctions.chat.name',
        descriptionKey: 'teamFunctions.chat.description',
        field: ['settings', 'featureTeamDiscussionEnabled'],
    },
};
