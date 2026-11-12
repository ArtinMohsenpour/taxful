import type { CSSProperties } from 'react'
import Image from 'next/image'
import type { FlowProvider } from '@/lib/home/types'
import styles from './provider-tile.module.css'

export function ProviderTile({ provider, index }: { provider: FlowProvider; index: number }) {
  return (
    <li
      className={styles.provider}
      data-provider={provider.builtin || 'custom'}
      style={{ '--tile-index': index } as CSSProperties}
    >
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
