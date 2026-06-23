'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { categorySchema, type CategoryInput } from '@/lib/validations'
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
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import type { CategoryRow } from './categories-manager'

const empty: CategoryInput = {
  nameTh: '',
  nameEn: '',
  nameZh: '',
  slug: '',
  isActive: true,
}

export function CategoryDialog({
  open,
  category,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  category: CategoryRow | null
  onOpenChange: (open: boolean) => void
  onSubmit: (values: CategoryInput) => Promise<boolean>
}) {
  const form = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: empty,
  })

  useEffect(() => {
    if (open) {
      form.reset(
        category
          ? {
              nameTh: category.nameTh,
              nameEn: category.nameEn,
              nameZh: category.nameZh,
              slug: category.slug,
              isActive: category.isActive,
            }
          : empty
      )
    }
  }, [open, category, form])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? 'แก้ไขหมวด' : 'เพิ่มหมวด'}</DialogTitle>
          <DialogDescription>กรอกชื่อหมวดให้ครบทั้ง 3 ภาษา</DialogDescription>
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
              name="nameTh"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ชื่อ (ไทย)</FormLabel>
                  <FormControl>
                    <Input placeholder="เช่น กาแฟ" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nameEn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ชื่อ (EN)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Coffee" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nameZh"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ชื่อ (中文)</FormLabel>
                  <FormControl>
                    <Input placeholder="例如 咖啡" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input placeholder="coffee" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="m-0">แสดงหมวดนี้บนเว็บ</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
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
