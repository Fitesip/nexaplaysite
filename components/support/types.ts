/** Shared shapes for the user-facing support ticket widget (components/support/*). */

export type TicketSummary = {
  id: number;
  subject: string;
  status: "open" | "closed";
  created_at: string;
  closed_at: string | null;
  message_count: number;
  unread: number;
};

export type Attachment = { url: string; name: string; mime: string; size: number };

export type Message = {
  id: number;
  ticket_id: number;
  sender_role: "user" | "admin";
  body: string;
  created_at: string;
  attachments: Attachment[];
};

export type TicketDetail = {
  id: number;
  subject: string;
  status: "open" | "closed";
  created_at: string;
  closed_at: string | null;
};
