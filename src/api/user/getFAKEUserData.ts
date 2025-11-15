import { CancelTokenSource } from 'axios';

/**
 * FAKE all needed user data and store them
 * this function mimics a default response to fail gracefully
 * and do not hinder the user
 * @param cancelTokenSource {CancelTokenSource}
 */
const getFAKEUserData = (cancelTokenSource: CancelTokenSource) => {
    // retrieve customer

    const customerResponse = {
        firstname: 'John',
        id: 1,
        tenantId: 10,
        lastname: 'Doe',
        email: 'js@mail.com',
        gender: 'male',
        salutation: 'Herr',
        phone: '01775593259',
    };

    // eslint-disable-next-line no-console
    console.log('4 FAKE UserDta', customerResponse, cancelTokenSource);
    return customerResponse;
};

export default getFAKEUserData;
