'use client'

import { useState } from 'react'
import { useLivePreview } from '@payloadcms/live-preview-react'

type RequestHandler = NonNullable<Parameters<typeof useLivePreview>[0]['requestHandler']>

// Payload fetches every editor message independently. When two arrive together, an
// older response can finish last and overwrite newer edits until the next keystroke.
// Running the requests one after another (bodies included) keeps the latest edit last.
export function orderedRequestHandler(): RequestHandler {
  let queue: Promise<unknown> = Promise.resolve()
  return ({ apiPath, data, endpoint, serverURL }) => {
    const request = queue.then(async () => {
      const response = await fetch(`${serverURL}${apiPath}/${endpoint}`, {
        body: JSON.stringify(data),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-Payload-HTTP-Method-Override': 'GET' },
        method: 'POST',
      })
      return new Response(await response.text(), {
        status: response.status,
        headers: response.headers,
      })
    })
    queue = request.catch(() => undefined)
    return request
  }
}

// Same-origin Live Preview with ordered updates, shared by every preview component.
export function useOrderedLivePreview<T extends object>(initialData: T): T {
  const [requestHandler] = useState(orderedRequestHandler)
  // Payload's generated interfaces lack an index signature, which the hook requires.
  const { data } = useLivePreview({
    initialData: initialData as unknown as Record<string, unknown>,
    depth: 1,
    requestHandler,
    serverURL: typeof window === 'undefined' ? '' : window.location.origin,
  })
  return data as unknown as T
}
