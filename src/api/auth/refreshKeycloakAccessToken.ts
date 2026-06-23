import { refreshAuthTokensViaBff } from './authBffClient';
import { LoginData } from '../../types/loginData';

const refreshKeycloakAccessToken = (): Promise<LoginData> => refreshAuthTokensViaBff();

export default refreshKeycloakAccessToken;
