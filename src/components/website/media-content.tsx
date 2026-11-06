import Image from 'next/image'
import type { ContentItem } from '@/lib/website/types'
import type { WebsiteLocale } from '@/lib/website/catalog'
import { publicMediaURL } from '@/lib/website/urls'
import { WebsiteRichText } from './rich-text'

export function MediaContent({
  item,
  locale,
  columns,
}: {
  item: ContentItem
  locale: WebsiteLocale
  columns: number
}) {
  const media = item.type === 'image' ? item.image : item.video
  if (!media || typeof media !== 'object') return null
  const src = publicMediaURL(media.url)
  if (!src) return null
  if (item.type === 'image' && !media.mimeType?.startsWith('image/')) return null
  if (item.type === 'video' && !['video/mp4', 'video/webm'].includes(media.mimeType || ''))
    return null
  const fit = item.imageFit
  const poster =
    typeof item.poster === 'object' && item.poster ? publicMediaURL(item.poster.url) : undefined
  const captions =
    typeof item.captions === 'object' && item.captions?.mimeType === 'text/vtt'
      ? publicMediaURL(item.captions.url)
      : undefined
  return (
    <figure className="min-w-0">
      {item.type === 'image' ? (
        <Image
          src={src}
          alt={item.imageAlt?.trim() || media.alt}
          width={media.width || 1200}
          height={media.height || 800}
          sizes={
            columns === 1
              ? '(max-width: 1200px) 100vw, 1104px'
              : columns === 2
                ? '(max-width: 767px) 100vw, 552px'
                : '(max-width: 1023px) 100vw, 368px'
          }
          className={`w-full rounded-3xl border border-border ${fit === 'square' ? 'aspect-square object-cover' : fit === 'landscape' ? 'aspect-[4/3] object-cover' : 'h-auto'}`}
        />
      ) : (
        <video
          controls
          playsInline
          preload="metadata"
          poster={poster}
          aria-label={item.videoTitle || undefined}
          className="aspect-video w-full rounded-3xl border border-border bg-accent"
        >
          <source src={src} type={media.mimeType || undefined} />
          {captions && (
            <track
              kind="captions"
              src={captions}
              srcLang={locale}
              label={locale === 'de' ? 'Deutsch' : 'English'}
              default
            />
          )}
          <a href={src}>{item.videoTitle}</a>
        </video>
      )}
      {item.caption?.trim() && (
        <figcaption className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {item.caption}
        </figcaption>
      )}
      {item.type === 'video' && item.transcript && (
        <details className="mt-4 rounded-2xl border border-border p-4">
          <summary className="cursor-pointer text-sm font-medium text-brand-ink">
            {locale === 'de' ? 'Transkript / Beschreibung' : 'Transcript / description'}
          </summary>
          <div className="mt-4">
            <WebsiteRichText data={item.transcript} locale={locale} />
          </div>
        </details>
      )}
    </figure>
  )
}
