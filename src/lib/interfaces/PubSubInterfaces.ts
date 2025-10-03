export interface NotificationDataMessage {
  reportUrl: string;
  clientUuid: string;
}

export interface NotifyReportToClientMessage extends NotificationDataMessage {
  organizationUuid: string;
  reportUuid: string;
  messages: {
    whatsapp: string;
    slack: string;
    email: string;
  };
}

export interface NotifyReportReadyMessage extends NotificationDataMessage {
  organizationUuid: string;
  reportUuid: string;
}

export interface NotifyChangeEmailMessage extends NotificationDataMessage {
  email: string;
  token: string;
}

export interface NotifyPasswordRecoveryMessage extends NotificationDataMessage {
  email: string;
  token: string;
}

export interface NotifyClientAccessTokenMessage {
  email: string;
  token: string;
}