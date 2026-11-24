/**
 * The two team functions of the platform, defined ONCE.
 *
 * They are different features and must never share a name:
 *
 * - `counselling` (Teamberatung / Team counselling) is an agency setting (`teamAgency`): all counsellors
 *   of the counselling centre see all chats and may join at any time.
 * - `chat` (Team-Chat / Team chat) is a permission policy (featureTeamDiscussionEnabled), set on the
 *   platform, per Träger and per Beratungsstelle like supervision (ORISO-Frontend#2491): counsellors
 *   coordinate on an OPEN enquiry in a team-only room; it closes when the enquiry is accepted, unless the
 *   policy featureTeamDiscussionAfterAcceptEnabled keeps it open (Frank, 2026-11-23).
 *
 * Name and description live in the locale files under `teamFunctions.*`. Every place that sets or
 * mentions a team function reads them through this module (`TeamFunctionSwitch` for the form-card row;
 * the provider tile uses the same entry with its own row layout), so the wording cannot drift between
 * the provider tab, the agency master data and the agency list.
 * The saved data keys (`field`) are unchanged API contract: only labels and rendering are shared. The
 * Team-Chat has no form field: it is written only as a permission policy by Funktionszugriff
 * (`TeamChatTile`, master `TEAM_CHAT_MASTER`).
 */
export type TeamFunctionId = 'counselling' | 'chat';

export interface TeamFunctionDefinition {
    nameKey: string;
    descriptionKey: string;
    /** Form path of the persisted value. Unchanged since before the rename; none for a policy. */
    field?: string | string[];
}

export const TEAM_FUNCTIONS = {
    counselling: {
        nameKey: 'teamFunctions.counselling.name',
        descriptionKey: 'teamFunctions.counselling.description',
        field: 'teamAgency',
    },
    chat: {
        nameKey: 'teamFunctions.chat.name',
        descriptionKey: 'teamFunctions.chat.description',
    },
} satisfies Record<TeamFunctionId, TeamFunctionDefinition>;
