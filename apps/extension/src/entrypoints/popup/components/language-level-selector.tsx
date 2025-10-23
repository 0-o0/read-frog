import type { LangLevel } from '@repo/definitions'

import { i18n } from '#imports'
import {
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select'
import { useAtom } from 'jotai'
import { FirefoxSelect } from '@/components/firefox-select'
import { configFieldsAtomMap } from '@/utils/atoms/config'
import { getFirefoxSelectContentProps } from '@/utils/firefox-compat'

export default function LanguageLevelSelector() {
  const [language, setLanguage] = useAtom(configFieldsAtomMap.language)
  const firefoxProps = getFirefoxSelectContentProps()

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[13px] font-medium">{i18n.t('languageLevel')}</span>
      <FirefoxSelect
        value={language.level}
        onValueChange={(value: LangLevel) => setLanguage({ level: value })}
      >
        <SelectTrigger
          size="sm"
          className="!h-7 w-29 pr-1.5 pl-2.5"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent {...firefoxProps}>
          <SelectItem value="beginner">
            {i18n.t('languageLevels.beginner')}
          </SelectItem>
          <SelectItem value="intermediate">
            {i18n.t('languageLevels.intermediate')}
          </SelectItem>
          <SelectItem value="advanced">
            {i18n.t('languageLevels.advanced')}
          </SelectItem>
        </SelectContent>
      </FirefoxSelect>
    </div>
  )
}
