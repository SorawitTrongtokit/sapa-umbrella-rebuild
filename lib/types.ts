export type AppRole = "user" | "admin" | "owner";
export type AccountStatus = "active" | "suspended";
export type UmbrellaStatus = "available" | "borrowed" | "disabled";
export type BorrowStatus = "active" | "returned" | "admin_closed";

export type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  class_level: string | null;
  student_number: number | null;
  role: AppRole;
  status: AccountStatus;
  onboarding_completed: boolean;
  legacy_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Location = {
  id: string;
  name_th: string;
  sort_order: number;
};

export type Umbrella = {
  id: number;
  location_id: string;
  label: string;
  status: UmbrellaStatus;
  borrowed_by: string | null;
  borrowed_transaction_id: string | null;
  disabled_reason: string | null;
  version: number;
  updated_at: string;
};

export type BorrowTransaction = {
  id: string;
  umbrella_id: number;
  borrower_id: string;
  borrow_location_id: string;
  return_location_id: string | null;
  status: BorrowStatus;
  borrowed_at: string;
  returned_at: string | null;
  close_reason: string | null;
};

export type Feedback = {
  id: string;
  user_id: string;
  message: string;
  status: "new" | "reviewed" | "archived";
  admin_note: string | null;
  created_at: string;
};

export type AuditLog = {
  id: string;
  actor_id: string | null;
  target_user_id: string | null;
  entity_type: string;
  entity_id: string | null;
  action: string;
  details: Record<string, unknown>;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
};

export type PasswordVaultRow = {
  user_id: string;
  ciphertext: string;
  iv: string;
  auth_tag: string;
  key_version: string;
  source: "app" | "legacy_migration";
  changed_by: string | null;
  changed_at: string;
};
