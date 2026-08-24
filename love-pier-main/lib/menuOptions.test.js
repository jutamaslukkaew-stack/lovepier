import { describe, expect, it } from 'vitest'
import {
  COFFEE_BEAN_OPTIONS,
  PROTEIN_OPTIONS,
  SWEETNESS_OPTIONS,
  categoryOfCartItem,
  normalizeItemOptions,
  optionGroupsFor,
} from './menuOptions'

describe('categoryOfCartItem', () => {
  it('reads the category out of the id built by MenuSectionPanel', () => {
    // `${section.cat}-${item.num}` — the category itself contains hyphens.
    expect(categoryOfCartItem('chicken-rice-01')).toBe('chicken-rice')
    expect(categoryOfCartItem('drinks-12')).toBe('drinks')
  })

  it('returns nothing for a promotion line or a missing id', () => {
    expect(categoryOfCartItem('promo-7')).toBe('promo')
    expect(categoryOfCartItem('')).toBe('')
    expect(categoryOfCartItem(undefined)).toBe('')
  })
})

describe('optionGroupsFor', () => {
  it('offers the cut only on chicken rice', () => {
    const fields = optionGroupsFor('chicken-rice-01').map((g) => g.field)
    expect(fields).toEqual(['sweetness', 'coffeeBean', 'protein'])
  })

  it('never offers the cut on a drink', () => {
    const fields = optionGroupsFor('drinks-03').map((g) => g.field)
    expect(fields).toEqual(['sweetness', 'coffeeBean'])
  })

  it('gives an unknown or promotion line only the ungated groups', () => {
    expect(optionGroupsFor('promo-7').map((g) => g.field)).toEqual(['sweetness', 'coffeeBean'])
    expect(optionGroupsFor('').map((g) => g.field)).toEqual(['sweetness', 'coffeeBean'])
  })
})

describe('normalizeItemOptions', () => {
  it('defaults every applicable group to its first choice', () => {
    expect(normalizeItemOptions({ id: 'chicken-rice-01' })).toEqual({
      sweetness: SWEETNESS_OPTIONS[0],
      coffeeBean: COFFEE_BEAN_OPTIONS[0],
      protein: PROTEIN_OPTIONS[0],
    })
  })

  it('keeps the values the customer actually picked', () => {
    expect(
      normalizeItemOptions({ id: 'chicken-rice-01', sweetness: 'ไม่หวาน', protein: 'อก' })
    ).toMatchObject({ sweetness: 'ไม่หวาน', protein: 'อก' })
  })

  it('rejects a value that is not on the list', () => {
    // The whole point of re-running this server-side: a hand-crafted POST
    // must not put free text on a kitchen ticket.
    expect(normalizeItemOptions({ id: 'chicken-rice-01', protein: '<script>' }).protein).toBe(
      PROTEIN_OPTIONS[0]
    )
  })

  it('drops a field the line is not allowed to carry', () => {
    const normalized = normalizeItemOptions({ id: 'drinks-03', protein: 'อก' })
    expect(normalized).not.toHaveProperty('protein')
  })
})
