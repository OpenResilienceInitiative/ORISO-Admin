export interface AgencyEditData {
    id: number;
    name: string;
    description: string;
    url: string;
    duration: number;
    advisor: AdvisorInterface[];
    locations: Array<{ type: string }>;
    status?: string | undefined;
}

interface AdvisorInterface {
    name: string;
    id: string;
}

export interface ConsultantInterface {
    consultantId: string;
    consultantName: string;
}

export interface AgencyEventTypes {
    id: number;
    title: string;
    slug: string;
    length: number;
    hidden: boolean;
    position: number;
    userId?: any;
    teamId: number;
    eventName: string;
    timeZone?: any;
    periodType: string;
    periodStartDate?: string;
    periodEndDate?: string;
    periodDays?: number;
    periodCountCalendarDays?: boolean;
    requiresConfirmation: boolean;
    recurringEvent?: any;
    disableGuests: boolean;
    hideCalendarNotes: boolean;
    minimumBookingNotice: number;
    beforeEventBuffer: number;
    afterEventBuffer: number;
    schedulingType: string;
    price: number;
    currency: string;
    slotInterval?: any;
    successRedirectUrl: string;
    description: string;
    locations: any[];
    metadata: any;
    type?: any;
    consultantIds?: any;
    consultants?: ConsultantInterface[];
    isDefaultEvent?: boolean;
}

export interface AgencyEventTypeUpdate {
    title?: string;
    slug?: string;
    length?: number;
    minimumBookingNotice?: number;
    beforeEventBuffer?: number;
    afterEventBuffer?: number;
    description?: string;
    consultants: { consultantId: string }[];
}
