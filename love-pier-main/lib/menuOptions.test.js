import { describe, expect, it } from 'vitest'
import { TAB_SECTION_CATS } from '../components/menu/menuData'
import {
  COFFEE_BEAN_OPTIONS,
  PROTEIN_OPTIONS,
  SWEETNESS_OPTIONS,
  OPTION_GROUPS,
  categoryOfCartItem,
  normalizeItemOptions,
  optionGroupsFor,
} from './menuOptions'

describe('categoryOfCartItem', () => {
  it('reads the category out of the id built by MenuSectionPanel', () => {
    // `${section.cat}-${item.num}` — the category itself contains hyphens
    // AND, for the imported categories, a trailing number of its own.
    expect(categoryOfCartItem('chicken-rice-1-01')).toBe('chicken-rice-1')
    expect(categoryOfCartItem('coffee-drinks-12')).toBe('coffee-drinks')
  })

  it('returns nothing for a promotion line or a missing id', () => {
    expect(categoryOfCartItem('promo-7')).toBe('promo')
    expect(categoryOfCartItem('')).toBe('')
    expect(categoryOfCartItem(undefined)).toBe('')
  })
})

describe('optionGroupsFor', () => {
  it('offers the cut on both generations of the chicken-rice menu', () => {
    expect(optionGroupsFor('chicken-rice-1-01').map((g) => g.field)).toEqual(['sweetness', 'coffeeBean', 'protein'])
    expect(optionGroupsFor('chickenRice-01').map((g) => g.field)).toEqual(['sweetness', 'coffeeBean', 'protein'])
  })

  it('never offers the cut on a drink', () => {
    const fields = optionGroupsFor('coffee-drinks-03').map((g) => g.field)
    expect(fields).toEqual(['sweetness', 'coffeeBean'])
  })

  // The scoped group names categories literally (menuOptions.js cannot import
  // from components/), so this is what stops the two drifting apart — e.g. a
  // future import renaming 'chicken-rice-1' and silently taking the cut
  // picker off every ข้าวมันไก่ with no test failing.
  it('names categories that actually exist in the menu', () => {
    const scoped = OPTION_GROUPS.filter((g) => g.cats).flatMap((g) => g.cats)
    const real = Object.values(TAB_SECTION_CATS).flat()
    for (const cat of scoped) expect(real).toContain(cat)
  })

  it('scopes the cut to exactly the chicken-rice tab', () => {
    const protein = OPTION_GROUPS.find((g) => g.field === 'protein')
    expect(protein.cats).toEqual(TAB_SECTION_CATS['chicken-rice'])
  })

  it('gives an unknown or promotion line only the ungated groups', () => {
    expect(optionGroupsFor('promo-7').map((g) => g.field)).toEqual(['sweetness', 'coffeeBean'])
    expect(optionGroupsFor('').map((g) => g.field)).toEqual(['sweetness', 'coffeeBean'])
  })
})

describe('normalizeItemOptions', () => {
  it('defaults every applicable group to its first choice', () => {
    expect(normalizeItemOptions({ id: 'chicken-rice-1-01' })).toEqual({
      sweetness: SWEETNESS_OPTIONS[0],
      coffeeBean: COFFEE_BEAN_OPTIONS[0],
      protein: PROTEIN_OPTIONS[0],
    })
  })

  it('keeps the values the customer actually picked', () => {
    expect(
      normalizeItemOptions({ id: 'chicken-rice-1-01', sweetness: 'ไม่หวาน', protein: 'อก' })
    ).toMatchObject({ sweetness: 'ไม่หวาน', protein: 'อก' })
  })

  it('rejects a value that is not on the list', () => {
    // The whole point of re-running this server-side: a hand-crafted POST
    // must not put free text on a kitchen ticket.
    expect(normalizeItemOptions({ id: 'chicken-rice-1-01', protein: '<script>' }).protein).toBe(
      PROTEIN_OPTIONS[0]
    )
  })

  it('drops a field the line is not allowed to carry', () => {
    const normalized = normalizeItemOptions({ id: 'coffee-drinks-03', protein: 'อก' })
    expect(normalized).not.toHaveProperty('protein')
  })
})
