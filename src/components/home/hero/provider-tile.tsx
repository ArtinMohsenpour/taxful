import Image from 'next/image'
import type { FlowProvider } from '@/lib/home/types'
import styles from './provider-tile.module.css'

export function ProviderTile({ provider }: { provider: FlowProvider }) {
  return (
    <li className={styles.provider} data-provider={provider.builtin || 'custom'}>
      <Image
        src={provider.src}
        alt={provider.name}
        width={provider.width}
        height={provider.height}
        unoptimized
        className={styles.providerLogo}
      />
      {provider.builtin === 'lexware' && <span className={styles.providerSuffix}>Office</span>}
    </li>
  )
}
