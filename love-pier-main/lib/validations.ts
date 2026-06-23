import { z } from 'zod'

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const categorySchema = z.object({
  nameTh: z.string().trim().min(1, 'กรุณากรอกชื่อภาษาไทย'),
  nameEn: z.string().trim().min(1, 'Please enter the English name'),
  nameZh: z.string().trim().min(1, '请输入中文名称'),
  slug: z
    .string()
    .trim()
    .min(1, 'กรุณากรอก slug')
    .regex(slugRegex, 'slug ใช้ได้เฉพาะ a-z, 0-9 และ - เท่านั้น'),
  isActive: z.boolean(),
})

export type CategoryInput = z.infer<typeof categorySchema>

const priceField = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, 'ราคาไม่ถูกต้อง')

export const menuItemSchema = z
  .object({
    categoryId: z.string().uuid('กรุณาเลือกหมวด'),
    nameTh: z.string().trim().min(1, 'กรุณากรอกชื่อภาษาไทย'),
    nameEn: z.string().trim().min(1, 'Please enter the English name'),
    nameZh: z.string().trim().min(1, '请输入中文名称'),
    descriptionTh: z.string().trim(),
    descriptionEn: z.string().trim(),
    descriptionZh: z.string().trim(),
    imageUrl: z.string().trim(),
    imageAlt: z.string().trim(),
    price: priceField,
    priceMax: priceField.or(z.literal('')),
    badge: z.string().trim(),
    isFeatured: z.boolean(),
    isAvailable: z.boolean(),
  })
  .refine((v) => !v.priceMax || Number(v.priceMax) >= Number(v.price), {
    message: 'ราคาสูงสุดต้องไม่น้อยกว่าราคาเริ่มต้น',
    path: ['priceMax'],
  })

export type MenuItemInput = z.infer<typeof menuItemSchema>

export const reorderSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
})
