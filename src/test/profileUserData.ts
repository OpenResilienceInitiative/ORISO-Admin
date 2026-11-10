import { http, HttpResponse } from 'msw';

const profileUserData = {
    userId: 'a1b2c3',
    firstName: 'Erika',
    lastName: 'Beispiel',
    email: 'erika.beispiel@example.org',
    twoFactorAuth: { isEnabled: true, isActive: false, type: 'EMAIL' },
};

/** The tour overview tile reads its progress; no tour has been started in these stories. */
export const tutorialProgressHandler = http.get('*/service/users/tutorials/progress', () => HttpResponse.json([]));

/** Answers the user-data call every Mein Account tile reads. */
export const profileUserDataHandlers = [
    http.get('*/service/users/data', () =>
        HttpResponse.json({ ...profileUserData, firstname: 'Erika', lastname: 'Beispiel' }),
    ),
    tutorialProgressHandler,
];
