'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { menuItemSchema, type MenuItemInput } from '@/lib/validations'
import type { MenuItem } from '@/lib/db/schema'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ImageUpload } from './image-upload'

export type CategoryOption = { id: string; nameTh: string }

const empty: MenuItemInput = {
  categoryId: '',
  nameTh: '',
  nameEn: '',
  nameZh: '',
  descriptionTh: '',
  descriptionEn: '',
  descriptionZh: '',
  imageUrl: '',
  imageAlt: '',
  price: '',
  priceMax: '',
  badge: '',
  isFeatured: false,
  isAvailable: true,
}

function toForm(item: MenuItem): MenuItemInput {
  return {
    categoryId: item.categoryId,
    nameTh: item.nameTh,
    nameEn: item.nameEn,
    nameZh: item.nameZh,
    descriptionTh: item.descriptionTh ?? '',
    descriptionEn: item.descriptionEn ?? '',
    descriptionZh: item.descriptionZh ?? '',
    imageUrl: item.imageUrl ?? '',
    imageAlt: item.imageAlt ?? '',
    price: item.price,
    priceMax: item.priceMax ?? '',
    badge: item.badge ?? '',
    isFeatured: item.isFeatured,
    isAvailable: item.isAvailable,
  }
}

export function MenuItemDialog({
  open,
  item,
  categories,
  defaultCategoryId,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  item: MenuItem | null
  categories: CategoryOption[]
  defaultCategoryId?: string
  onOpenChange: (open: boolean) => void
  onSubmit: (values: MenuItemInput) => Promise<boolean>
}) {
  const form = useForm<MenuItemInput>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: empty,
  })

  useEffect(() => {
    if (open) {
      form.reset(item ? toForm(item) : { ...empty, categoryId: defaultCategoryId ?? '' })
    }
  }, [open, item, defaultCategoryId, form])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? 'แก้ไขเมนู' : 'เพิ่มเมนู'}</DialogTitle>
          <DialogDescription>กรอกชื่อและคำอธิบายให้ครบทั้ง 3 ภาษา</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="grid gap-4"
            onSubmit={form.handleSubmit(async (values) => {
              const ok = await onSubmit(values)
              if (ok) form.reset(empty)
            })}
          >
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>หมวด</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกหมวด" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nameTh}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Tabs defaultValue="th">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="th">ไทย</TabsTrigger>
                <TabsTrigger value="en">EN</TabsTrigger>
                <TabsTrigger value="zh">中文</TabsTrigger>
              </TabsList>
              {(['th', 'en', 'zh'] as const).map((lang) => (
                <TabsContent key={lang} value={lang} className="space-y-3">
                  <FormField
                    control={form.control}
                    name={`name${lang === 'th' ? 'Th' : lang === 'en' ? 'En' : 'Zh'}` as const}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ชื่อเมนู</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={
                      `description${lang === 'th' ? 'Th' : lang === 'en' ? 'En' : 'Zh'}` as const
                    }
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>คำอธิบาย</FormLabel>
                        <FormControl>
                          <Textarea rows={3} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              ))}
            </Tabs>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ราคา (฿)</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" placeholder="120" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="priceMax"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ราคาสูงสุด (ถ้าเป็นช่วง)</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" placeholder="670" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="badge"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ป้าย (Badge)</FormLabel>
                  <FormControl>
                    <Input placeholder="Signature / Limited / New" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>รูปเมนู</FormLabel>
                  <FormControl>
                    <ImageUpload value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="imageAlt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>คำบรรยายรูป (alt — สำหรับ SEO)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-2">
              <FormField
                control={form.control}
                name="isFeatured"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <FormLabel className="m-0">แนะนำ (Recommended Specials)</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isAvailable"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <FormLabel className="m-0">เปิดขาย (แสดงบนเว็บ)</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'กำลังบันทึก…' : 'บันทึก'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
