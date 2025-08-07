export interface SetActiveOrganizationRequest {
  activeOrganizationUuid: string;
}

export interface SetNameRequest {
  firstName: string;
  lastName: string;
}

export interface HandleFacebookLoginRequest {
  code: string;
  redirectUri: string;
}

export interface HandleSlackLoginRequest {
  code: string;
  redirectUri: string;
  organizationClientId: string;
}

export interface ChangeEmailRequest {
  email: string;
  password: string;
}

export interface VerifyEmailChangeRequest {
  token: string;
}

export interface ChangePasswordRequest {
  password: string;
  newPassword: string;
}

export interface SendPasswordRecoveryEmailRequest {
  email: string;
}

export interface VerifyPasswordRecoveryRequest {
  token: string;
  newPassword: string;
}
