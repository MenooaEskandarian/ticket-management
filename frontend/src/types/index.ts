export type UserRole = "CUSTOMER" | "SUPPORT";

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone: string;
  role: UserRole;
  last_seen_at: string | null;
}

export type OrderStatus =
  | "AWAITING_PAYMENT"
  | "PAID"
  | "IN_PREPARATION"
  | "SHIPPED"
  | "DELIVERED";

export interface Driver {
  id: number;
  full_name: string;
  phone: string;
  vehicle_plate: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: string;
  image: string | null;
  category: Category;
}

export interface OrderItem {
  id: number;
  product: Product;
  quantity: number;
  unit_price: string;
  line_total: string;
}

export interface Order {
  id: number;
  number: string;
  status: OrderStatus;
  status_display: string;
  total_amount: string;
  placed_at: string;
  shipped_at: string | null;
  delivered_at: string | null;
  item_count: number;
}

export interface OrderDetail extends Order {
  items: OrderItem[];
  driver: Driver | null;
  tracking_code: string;
  customer_name: string;
}

export type TicketKind = "DELIVERY_ISSUE" | "SHIPMENT_REQUEST" | "GENERAL";
export type TicketStatus = "OPEN" | "PENDING" | "CLOSED";
export type SlaLevel = "ANSWERED" | "WAITING" | "WARNING" | "CRITICAL";

export interface Attachment {
  id: number;
  file: string;
  original_name: string;
  content_type: string;
  size_bytes: number;
  uploaded_at: string;
}

export interface TicketMessage {
  id: number;
  body: string;
  author_name: string;
  author_role: UserRole;
  created_at: string;
  attachments: Attachment[];
}

export interface Ticket {
  id: number;
  subject: string;
  kind: TicketKind;
  status: TicketStatus;
  order: number;
  order_number: string;
  order_status: OrderStatus;
  customer_name: string;
  created_at: string;
  last_message_at: string | null;
  sla_level: SlaLevel;
  unanswered_count: number;
  message_count: number;
}

export interface TicketDetail extends Ticket {
  messages: TicketMessage[];
  driver: Driver | null;
  customer_last_seen_at: string | null;
  closed_at: string | null;
  reopened_at: string | null;
  can_reopen: boolean;
  reopen_deadline: string | null;
}

export interface NotificationLog {
  id: number;
  channel: "EMAIL" | "SMS";
  recipient: string;
  subject: string;
  body: string;
  status: "SENT" | "FAILED";
  error: string;
  ticket: number | null;
  ticket_subject: string;
  message: number | null;
  created_at: string;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiError {
  detail: string;
  code: string;
  fields?: Record<string, unknown>;
  ticket_id?: number;
}
