/**
 * Legal page configuration for uni.voktera.com.
 * {{websiteUrl}} stays canonical (voktera.com) so cross-links in markdown are correct.
 */
export const legalSiteConfig = {
  serviceName: 'Voktera',
  serviceFullName: 'Voktera',
  operatorLegalName: 'Omar Rihani',
  operatorAddress: '29 Sara Dr., Welland, Ontario, Canada',
  websiteUrl: 'https://voktera.com',
  appUrl: 'https://app.voktera.com',
  uniUrl: 'https://uni.voktera.com',
  uniServiceName: 'UoG Degree Planner',
  uniServiceFullName: 'UoG Degree Planner',
  mirrorUrl: 'https://uni.voktera.com',
  contactEmail: 'support@voktera.com',
  privacyEmail: 'privacy@voktera.com',
  effectiveDate: 'June 30, 2026',
  supabaseProjectRegion: 'East US (Ohio), United States',
  governingLaw: 'the Province of Ontario and the federal laws of Canada',
} as const

export type LegalSiteConfig = typeof legalSiteConfig

export function applyLegalTemplate(text: string): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = legalSiteConfig[key as keyof LegalSiteConfig]
    return value != null ? String(value) : `{{${key}}}`
  })
}
