import {
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select'
import { useAtom, useAtomValue } from 'jotai'
import { FirefoxSelect } from '@/components/firefox-select'
import ProviderIcon from '@/components/provider-icon'
import { configFieldsAtomMap } from '@/utils/atoms/config'
import { filterEnabledProvidersConfig, getReadProvidersConfig } from '@/utils/config/helpers'
import { PROVIDER_ITEMS } from '@/utils/constants/providers'
import { getFirefoxSelectContentProps } from '@/utils/firefox-compat'
import { isDarkMode } from '@/utils/tailwind'

export default function ReadProviderSelector({ className, hideChevron = false, customTrigger, container }: { className?: string, hideChevron?: boolean, customTrigger?: React.ReactNode, container?: HTMLElement | null }) {
  const [readConfig, setReadConfig] = useAtom(configFieldsAtomMap.read)
  const providersConfig = useAtomValue(configFieldsAtomMap.providersConfig)
  const filteredProvidersConfig = filterEnabledProvidersConfig(providersConfig)
  const firefoxProps = getFirefoxSelectContentProps()

  // If a custom container is provided, use it; otherwise use Firefox props
  const finalContainer = container

  return (
    <FirefoxSelect
      value={readConfig.providerId}
      onValueChange={(value: string) => {
        void setReadConfig({
          providerId: value,
        })
      }}
    >
      <SelectTrigger className={className} hideChevron={hideChevron}>
        {customTrigger || <SelectValue />}
      </SelectTrigger>
      <SelectContent
        {...firefoxProps}
        container={finalContainer}
      >
        {getReadProvidersConfig(filteredProvidersConfig).map(({ id, name, provider }) => (
          <SelectItem key={id} value={id}>
            <ProviderIcon logo={PROVIDER_ITEMS[provider].logo(isDarkMode())} name={name} size="sm" />
          </SelectItem>
        ))}
      </SelectContent>
    </FirefoxSelect>
  )
}
