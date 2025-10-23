import { i18n } from '#imports'
import {
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select'
import { useAtom, useAtomValue } from 'jotai'
import { FirefoxSelect } from '@/components/firefox-select'
import ProviderIcon from '@/components/provider-icon'
import { configFieldsAtomMap } from '@/utils/atoms/config'
import { filterEnabledProvidersConfig, getLLMTranslateProvidersConfig, getNonAPIProvidersConfig, getPureAPIProvidersConfig } from '@/utils/config/helpers'
import { PROVIDER_ITEMS } from '@/utils/constants/providers'
import { getFirefoxSelectContentProps } from '@/utils/firefox-compat'
import { isDarkMode } from '@/utils/tailwind'

export default function TranslateProviderSelector({ className }: { className?: string }) {
  const [translateConfig, setTranslateConfig] = useAtom(configFieldsAtomMap.translate)
  const providersConfig = useAtomValue(configFieldsAtomMap.providersConfig)
  const filteredProvidersConfig = filterEnabledProvidersConfig(providersConfig)
  const firefoxProps = getFirefoxSelectContentProps()

  const isTranslationOnlyMode = translateConfig.mode === 'translationOnly'
  const nonAPIProviders = getNonAPIProvidersConfig(filteredProvidersConfig)
  const filteredNonAPIProviders = isTranslationOnlyMode
    ? nonAPIProviders.filter(p => p.provider !== 'google')
    : nonAPIProviders

  return (
    <FirefoxSelect
      value={translateConfig.providerId}
      onValueChange={(value: string) => {
        void setTranslateConfig({
          providerId: value,
        })
      }}
    >
      <SelectTrigger className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent {...firefoxProps}>
        <SelectGroup>
          <SelectLabel>{i18n.t('translateService.aiTranslator')}</SelectLabel>
          {getLLMTranslateProvidersConfig(filteredProvidersConfig).map(({ id, name, provider }) => (
            <SelectItem key={id} value={id}>
              <ProviderIcon logo={PROVIDER_ITEMS[provider].logo(isDarkMode())} name={name} size="sm" />
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel>{i18n.t('translateService.normalTranslator')}</SelectLabel>
          {filteredNonAPIProviders.map(({ id, name, provider }) => (
            <SelectItem key={id} value={id}>
              <ProviderIcon logo={PROVIDER_ITEMS[provider].logo(isDarkMode())} name={name} size="sm" />
            </SelectItem>
          ))}
          {getPureAPIProvidersConfig(filteredProvidersConfig).map(({ id, name, provider }) => (
            <SelectItem key={id} value={id}>
              <ProviderIcon logo={PROVIDER_ITEMS[provider].logo(isDarkMode())} name={name} size="sm" />
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </FirefoxSelect>
  )
}
