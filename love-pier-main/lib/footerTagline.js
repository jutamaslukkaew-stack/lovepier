/** Footer hero line is always English, regardless of site language. */
export const FOOTER_TAGLINE_DEFAULT = 'THE SEA IS <em>ALWAYS OPEN</em>'

export const FOOTER_TAGLINES = {
  gallery: 'A PLACE <em>WORTH REMEMBERING</em>',
  about: 'STILL <em>WIDE OPEN</em>',
  contact: "WE'LL <em>ANSWER SOON</em>",
  menu: 'EAT WELL, <em>STAY LONGER</em>',
  promotion: 'A LITTLE EXTRA, <em>EVERY DAY</em>',
  events: 'MOMENTS, <em>NOT MINUTES</em>',
  location: 'ALWAYS <em>EASY TO FIND</em>',
  reservation: 'A SEAT, <em>WAITING FOR YOU</em>',
}

export function stripTaglineHtml(text) {
  return text.replace(/<[^>]*>/g, '')
}

/** Longer taglines need a smaller clamp so they fit mobile widths. */
export function footerTaglineSizeClass(text) {
  const len = stripTaglineHtml(text).trim().length
  return len > 20 ? 'footer-tagline footer-tagline--long' : 'footer-tagline'
}
