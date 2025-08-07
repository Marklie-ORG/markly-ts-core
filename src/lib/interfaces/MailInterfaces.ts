export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: {
    content: string;
    filename: string;
    type?: string;
    disposition?: "attachment" | "inline";
  }[];
}
