'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'

interface GooglePlacesAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onPlaceSelect?: (place: {
    addressLine1: string
    postcode: string
    city: string
    fullAddress: string
  }) => void
  placeholder?: string
  required?: boolean
  id?: string
  name?: string
  className?: string
}

declare global {
  interface Window {
    google: any
    initGooglePlaces: () => void
  }
}

export function GooglePlacesAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Start typing your address...",
  required = false,
  id = "address-autocomplete",
  name,
  className = "w-full pl-10 pr-4 h-11 rounded-xl border border-neutral-200/70 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
}: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Load Google Places API script only if API key is available
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
    if (!apiKey) {
      // No API key - use regular input (graceful fallback)
      setIsLoaded(false)
      return
    }

    if (typeof window !== 'undefined' && !window.google) {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
      script.async = true
      script.defer = true
      script.onload = () => {
        setIsLoaded(true)
      }
      script.onerror = () => {
        // If script fails to load, just use regular input
        setIsLoaded(false)
      }
      document.head.appendChild(script)
    } else if (window.google) {
      setIsLoaded(true)
    }

    return () => {
      // Cleanup
      if (autocompleteRef.current) {
        if (window.google && window.google.maps && window.google.maps.event) {
          window.google.maps.event.clearInstanceListeners(autocompleteRef.current)
        }
      }
    }
  }, [])

  useEffect(() => {
    if (isLoaded && inputRef.current && window.google && window.google.maps && window.google.maps.places) {
      // Initialize autocomplete
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: 'gb' }, // UK only
        fields: ['address_components', 'formatted_address'],
        types: ['address']
      })

      autocompleteRef.current = autocomplete

      // Handle place selection
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()
        
        if (!place.address_components) {
          return
        }

        // Extract address components
        let addressLine1 = ''
        let postcode = ''
        let city = ''

        place.address_components.forEach((component: any) => {
          const types = component.types

          if (types.includes('street_number') || types.includes('route')) {
            addressLine1 = addressLine1 
              ? `${addressLine1} ${component.long_name}`
              : component.long_name
          }

          if (types.includes('postal_code')) {
            postcode = component.long_name
          }

          if (types.includes('postal_town') || types.includes('locality')) {
            city = component.long_name
          }
        })

        // Update the input value
        onChange(place.formatted_address || value)

        // Call the callback with structured data
        if (onPlaceSelect) {
          onPlaceSelect({
            addressLine1: addressLine1 || place.formatted_address || '',
            postcode,
            city,
            fullAddress: place.formatted_address || ''
          })
        }
      })
    }
  }, [isLoaded, onChange, onPlaceSelect, value])

  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 z-10" />
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className}
        placeholder={placeholder}
        autoComplete="off"
      />
    </div>
  )
}

