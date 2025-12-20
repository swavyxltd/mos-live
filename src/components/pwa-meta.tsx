'use client'

import { useEffect } from 'react'

export function PWAMeta() {
  useEffect(() => {
    // Add PWA meta tags dynamically
    const addMetaTag = (name: string, content: string, attribute: string = 'name') => {
      const existing = document.querySelector(`meta[${attribute}="${name}"]`)
      if (!existing) {
        const meta = document.createElement('meta')
        meta.setAttribute(attribute, name)
        meta.setAttribute('content', content)
        document.head.appendChild(meta)
      }
    }

    // Add manifest link if not exists
    if (!document.querySelector('link[rel="manifest"]')) {
      const link = document.createElement('link')
      link.rel = 'manifest'
      link.href = '/manifest.json'
      document.head.appendChild(link)
    }

    // Add PWA meta tags
    addMetaTag('theme-color', '#000000')
    addMetaTag('apple-mobile-web-app-capable', 'yes')
    addMetaTag('apple-mobile-web-app-status-bar-style', 'black-translucent')
    addMetaTag('apple-mobile-web-app-title', 'Madrasah OS')
  }, [])

  return null
}

