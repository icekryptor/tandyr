'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Search, Loader2 } from 'lucide-react';

interface MapPickerValue {
  address: string;
  latitude: number;
  longitude: number;
}

interface YandexMapPickerProps {
  defaultValue?: Partial<MapPickerValue>;
  onChange?: (value: MapPickerValue) => void;
}

const DEFAULT_LAT = 55.751244;
const DEFAULT_LNG = 37.618423;

async function geocodeForward(query: string): Promise<Array<{ address: string; lon: number; lat: number }>> {
  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  } catch {
    return [];
  }
}

async function geocodeReverse(lon: number, lat: number): Promise<string> {
  try {
    const res = await fetch(`/api/geocode?lon=${lon}&lat=${lat}`);
    if (!res.ok) return '';
    const data = await res.json();
    return data.results?.[0]?.address || '';
  } catch {
    return '';
  }
}

export function YandexMapPicker({ defaultValue, onChange }: YandexMapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const leafletRef = useRef<typeof import('leaflet') | null>(null);

  const [searchQuery, setSearchQuery] = useState(defaultValue?.address || '');
  const [suggestions, setSuggestions] = useState<Array<{ address: string; lon: number; lat: number }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const [address, setAddress] = useState(defaultValue?.address || '');
  const [latitude, setLatitude] = useState(defaultValue?.latitude ?? DEFAULT_LAT);
  const [longitude, setLongitude] = useState(defaultValue?.longitude ?? DEFAULT_LNG);
  const [mapReady, setMapReady] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const updateValue = useCallback(
    (addr: string, lat: number, lon: number) => {
      setAddress(addr);
      setLatitude(lat);
      setLongitude(lon);
      onChange?.({ address: addr, latitude: lat, longitude: lon });
    },
    [onChange],
  );

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!mapContainerRef.current) return;

      const L = await import('leaflet');
      leafletRef.current = L;
      if (cancelled) return;

      const hasDefault = defaultValue?.latitude && defaultValue?.longitude;
      const lat = hasDefault ? defaultValue.latitude! : DEFAULT_LAT;
      const lng = hasDefault ? defaultValue.longitude! : DEFAULT_LNG;

      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: hasDefault ? 15 : 11,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      const icon = L.divIcon({
        html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40" fill="none">
          <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24C32 7.163 24.837 0 16 0z" fill="#E53935"/>
          <circle cx="16" cy="16" r="6" fill="white"/>
        </svg>`,
        className: '',
        iconSize: [32, 40],
        iconAnchor: [16, 40],
      });

      const marker = L.marker([lat, lng], { icon, draggable: true }).addTo(map);
      markerRef.current = marker;

      marker.on('dragend', async () => {
        const pos = marker.getLatLng();
        const addr = await geocodeReverse(pos.lng, pos.lat);
        if (!cancelled) {
          updateValue(addr, pos.lat, pos.lng);
          setSearchQuery(addr);
        }
      });

      map.on('click', async (e: any) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        marker.setLatLng([clickLat, clickLng]);
        const addr = await geocodeReverse(clickLng, clickLat);
        if (!cancelled) {
          updateValue(addr, clickLat, clickLng);
          setSearchQuery(addr);
        }
      });

      mapRef.current = map;

      setTimeout(() => map.invalidateSize(), 100);

      if (!cancelled) setMapReady(true);
    }

    init();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch {}
        mapRef.current = null;
      }
    };
  }, []);

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const results = await geocodeForward(value);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setSearching(false);
    }, 400);
  };

  const handleSuggestionClick = (item: { address: string; lon: number; lat: number }) => {
    setSearchQuery(item.address);
    setShowSuggestions(false);
    updateValue(item.address, item.lat, item.lon);
    if (markerRef.current && mapRef.current) {
      markerRef.current.setLatLng([item.lat, item.lon]);
      mapRef.current.setView([item.lat, item.lon], 16, { animate: true });
    }
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="space-y-3 min-w-0">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

      <div className="space-y-1.5">
        <Label>Адрес</Label>
        <div className="relative z-[60]" ref={suggestionsRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder="Введите адрес для поиска..."
              className="pl-9 pr-9"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
            )}
          </div>

          {showSuggestions && (
            <div className="absolute z-50 top-full mt-1 w-full bg-popover border border-border rounded-lg shadow-lg overflow-hidden max-h-60 overflow-y-auto">
              {suggestions.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  className="flex items-start gap-2 w-full text-left px-3 py-2.5 hover:bg-accent transition-colors text-sm"
                  onClick={() => handleSuggestionClick(item)}
                >
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="break-words">{item.address}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Расположение на карте</Label>
        <div
          ref={mapContainerRef}
          className="w-full h-[300px] rounded-lg border border-border overflow-hidden bg-muted"
          style={{ zIndex: 0 }}
        />
        {!mapReady && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Загрузка карты...
          </div>
        )}
      </div>

      {address && (
        <div className="rounded-lg bg-muted/50 border border-border p-3 space-y-1">
          <p className="text-sm font-medium break-words">{address}</p>
          <p className="text-xs text-muted-foreground font-mono">
            {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </p>
        </div>
      )}

      <input type="hidden" name="address" value={address} />
      <input type="hidden" name="latitude" value={latitude} />
      <input type="hidden" name="longitude" value={longitude} />
    </div>
  );
}
