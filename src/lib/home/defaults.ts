import de from '../../../messages/de.json'
import en from '../../../messages/en.json'

export const homeDefaults = { de: de.Home, en: en.Home }
export type HomeLocale = keyof typeof homeDefaults
