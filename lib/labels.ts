import type { AccountStatus, AppRole, BorrowStatus, Feedback } from "@/lib/types";

export const roleLabel: Record<AppRole, string> = {
  user: "ผู้ใช้ทั่วไป",
  admin: "ผู้ดูแล",
  owner: "เจ้าของระบบ"
};

export const accountStatusLabel: Record<AccountStatus, string> = {
  active: "ใช้งานอยู่",
  suspended: "ถูกระงับ"
};

export const borrowStatusLabel: Record<BorrowStatus, string> = {
  active: "กำลังยืม",
  returned: "คืนแล้ว",
  admin_closed: "ปิดโดยผู้ดูแล"
};

export const feedbackStatusLabel: Record<Feedback["status"], string> = {
  new: "ใหม่",
  reviewed: "อ่านแล้ว",
  archived: "เก็บถาวร"
};
