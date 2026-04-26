import { z } from "zod";

export const classLevelSchema = z
  .string()
  .trim()
  .min(1, "กรุณากรอกชั้น")
  .max(20, "ชั้นยาวเกินไป");

export const studentNumberSchema = z.coerce
  .number()
  .int("เลขที่ต้องเป็นตัวเลข")
  .min(1, "เลขที่ต้องมากกว่า 0")
  .max(99, "เลขที่ต้องไม่เกิน 99");

export const registerSchema = z.object({
  email: z.string().trim().email("อีเมลไม่ถูกต้อง").max(320),
  classLevel: classLevelSchema,
  studentNumber: studentNumberSchema,
  password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร")
});

export const profileSchema = z.object({
  displayName: z.string().trim().max(120).optional().nullable(),
  classLevel: classLevelSchema,
  studentNumber: studentNumberSchema
});

export const feedbackSchema = z.object({
  message: z.string().trim().min(3, "กรุณาเขียนคำติชมอย่างน้อย 3 ตัวอักษร").max(1200)
});

export const passwordSchema = z.object({
  password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร")
});

export const auditReasonSchema = z.object({
  reason: z.string().trim().min(3, "กรุณาระบุเหตุผล").max(500)
});
