export interface CreateClientRequest {
  name: string;
  facebookAdAccounts: {adAccountId: string, adAccountName: string, businessId: string}[];
  emails: string[];
  phoneNumbers: string[];
}

export interface UpdateClientRequest {
  name?: string;
  emails?: string[];
  phoneNumbers?: string[];
  facebookAdAccounts?: string[];
}

export interface CreateClientFacebookAdAccountRequest {
  adAccountId: string;
}

export interface SetSlackConversationIdRequest {
  conversationId: string;
}

export interface SendMessageToSlackRequest {
  message: string;
}

export interface SetSlackWorkspaceTokenRequest {
  tokenId: string;
}

export interface SendMessageWithFileToSlackRequest {
  message: string;
  pdfBuffer: Buffer;
  fileName: string;
}
