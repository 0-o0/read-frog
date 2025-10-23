import { i18n } from '#imports'
import {
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@repo/ui/components/select'
import { Switch } from '@repo/ui/components/switch'
import { deepmerge } from 'deepmerge-ts'
import { useAtom } from 'jotai'
import { FirefoxSelect } from '@/components/firefox-select'
import { configFieldsAtomMap } from '@/utils/atoms/config'
import { HOTKEY_ITEMS, HOTKEYS } from '@/utils/constants/hotkeys'
import { getFirefoxSelectContentProps } from '@/utils/firefox-compat'

export default function NodeTranslationHotkeySelector() {
  const [translateConfig, setTranslateConfig] = useAtom(
    configFieldsAtomMap.translate,
  )
  const firefoxProps = getFirefoxSelectContentProps()

  return (
    <div className="flex items-center justify-between gap-2">
      <FirefoxSelect
        value={translateConfig.node.hotkey}
        onValueChange={(value: typeof HOTKEYS[number]) => setTranslateConfig(deepmerge(translateConfig, { node: { hotkey: value } }))}
      >
        <SelectTrigger
          size="sm"
          className="pt-3.5 -mt-3.5 pb-4 -mb-4 px-2 -ml-2 h-5! ring-none cursor-pointer truncate border-none text-[13px] font-medium shadow-none focus-visible:border-none focus-visible:ring-0 bg-transparent rounded-md"
        >
          <div className="truncate">
            {i18n.t('popup.hover')}
            {' '}
            +
            {' '}
            {HOTKEY_ITEMS[translateConfig.node.hotkey].icon}
            {' '}
            {HOTKEY_ITEMS[translateConfig.node.hotkey].label}
            {' '}
            {i18n.t('popup.translateParagraph')}
          </div>
        </SelectTrigger>
        <SelectContent {...firefoxProps}>
          {HOTKEYS.map(item => (
            <SelectItem key={item} value={item}>
              {i18n.t('popup.hover')}
              {' '}
              +
              {' '}
              {HOTKEY_ITEMS[item].icon}
              {' '}
              {HOTKEY_ITEMS[item].label}
              {' '}
              {i18n.t('popup.translateParagraph')}
            </SelectItem>
          ))}
        </SelectContent>
      </FirefoxSelect>
      <Switch
        checked={translateConfig.node.enabled}
        onCheckedChange={checked => setTranslateConfig(deepmerge(translateConfig, { node: { enabled: checked } }))}
      />
    </div>
  )
}
