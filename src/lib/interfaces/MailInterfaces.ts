export interface SendEmailOptions {
  to: string | string[];
  subject?: string | undefined;
  html?: string | undefined;
  text?: string | undefined;
  from?: string | undefined;
  replyTo?: string | undefined;
  cc?: string[] | undefined;
  bcc?: string[] | undefined;
  attachments?: {
    content: string;
    filename: string;
    type?: string;
    disposition?: "attachment" | "inline";
  }[] | undefined;
}
