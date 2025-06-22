"use client";

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { DeckGL } from '@deck.gl/react';
import { GeoJsonLayer } from '@deck.gl/layers';
import maplibregl from 'maplibre-gl';
import { Map, ViewStateChangeEvent, MapViewState } from 'react-map-gl';

// Value bounds
const MAX_VPA = 18270386.920980927;
const MIN_VPA = 0;

// View bounds
const MIN_LAT = 33.3;
const MAX_LAT = 33.8;
const MIN_LNG = -87.1;
const MAX_LNG = -86.5;

// Clamp helper
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

// Color scale function (heatmap)
function interpolateColor(value: number, min: number, max: number): [number, number, number, number] {
  const logMin = Math.log10(min + 1);
  const logMax = Math.log10(max + 1);
  const logValue = Math.log10(value + 1);

  const t = Math.max(0, Math.min(1, (logValue - logMin) / (logMax - logMin)));

  let r, g, b;
  if (t < 0.65) {
    r = Math.floor(255 * (t / 0.65));
    g = 255;
    b = 0;
  } else if (t < 0.985) {
    r = 255;
    g = Math.floor(255 * (1 - (t - 0.65) / (0.985 - 0.65)));
    b = 0;
  } else {
    r = 255;
    g = 0;
    b = Math.floor(255 * ((t - 0.985) / (1.0 - 0.985)));
  }

  return [r, g, b, 200];
}

// HSL to RGB
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return [f(0), f(8), f(4)];
}

const MyMap = () => {
  const [data, setData] = useState<any>(null);
  const [is3D, setIs3D] = useState(true);
  const [selection, setSelection] = useState<string>();
  const [categoryColorMap, setCategoryColorMap] = useState<Record<string, number[]>>({});
  const [selectedMapProperty, setSelectedMapProperty] = useState<String>('valueperacre');

  const [viewState, setViewState] = useState<MapViewState>({
    longitude: -86.8025,
    latitude: 33.5207,
    zoom: 11,
    pitch: 50,
    bearing: 0,
    minZoom: 8
  });

  useEffect(() => {
    const fetchAllChunks = async () => {
      let allFeatures = [];
      let page = 0;
      const limit = 10000;

      while (true) {
        const res = await fetch(`/api/parcels?page=${page}&limit=${limit}`);
        if (!res.ok) {
          console.error(`Failed to fetch page ${page}`);
          break;
        }

        const json = await res.json();
        const features = json.features;

        if (!features || !features.length) break;

        allFeatures.push(...features);
        page++;
      }

      setData({
        type: 'FeatureCollection',
        features: allFeatures,
      });

      console.log('Loaded features:', allFeatures.length);
    };

    fetchAllChunks().catch(console.error);
  }, []);

  const handleViewStateChange = useCallback((e: ViewStateChangeEvent) => {
    const v = e.viewState;
    setViewState({
      ...v,
      latitude: clamp(v.latitude, MIN_LAT, MAX_LAT),
      longitude: clamp(v.longitude, MIN_LNG, MAX_LNG)
    });
  }, []);

  // Generate color map when switching to a categorical view
  useEffect(() => {
    if (!data || selectedMapProperty === 'valueperacre') return;

    const categories = new Set<string>();

    data.features.forEach(f => categories.add(f.properties[selectedMapProperty]));

    const unique = Array.from(categories);
    const colors = unique.map((_, i) => {
      const hue = (i * 137.5) % 360;
      return hslToRgb(hue, 70, 50);
    });

    const map: Record<string, number[]> = {};
    unique.forEach((cat, i) => {
      map[cat] = [...colors[i], 200];
    });

    setCategoryColorMap(map);
  }, [data, selectedMapProperty]);

  const layer = useMemo(() => new GeoJsonLayer({
    id: 'GeoJsonLayer',
    data: data || "",
    stroked: true,
    filled: true,
    onClick: (evt: any) => {
      console.log(evt.object.properties)
      setSelection(String(evt.object.properties.parcelid));
    },
    updateTriggers: {
      getFillColor: [selection, selectedMapProperty, categoryColorMap]
    },
    getFillColor: (feature: any) => {
      const isSelected = selection === String(feature.properties.parcelid);
      if (isSelected) return [255, 255, 255, 255];

      if (selectedMapProperty === 'valueperacre') {
        return interpolateColor(feature.properties.valueperacre, MIN_VPA, MAX_VPA);
      }

      else {
        const category = feature.properties[selectedMapProperty];
        return categoryColorMap[category] || [150, 150, 150, 150];
      }

      return [100, 100, 100, 150];
    },
    getLineColor: [0, 0, 0, 255],
    lineWidthMinPixels: 1,
    pickable: true,
    highlightColor: [200, 200, 255, 255],
    autoHighlight: true,
    getElevation: is3D
      ? (feature: any) => feature.properties.valueperacre * 0.00055
      : undefined,
    extruded: is3D,
  }), [data, selection, selectedMapProperty, categoryColorMap, is3D]);

  return (
    <div onContextMenu={(evt) => evt.preventDefault()}>
      {/* UI Controls */}
      <div className='fixed top-4 right-4 z-50 bg-white p-3 rounded shadow-md text-black'>
        <div className="mb-2">
          <label className="mr-2">Map Mode:</label>
          <select
            value={selectedMapProperty}
            onChange={(e) => {setSelectedMapProperty(e.target.value)}}
          >
            <option value="valueperacre">Value per Acre</option>
            <option value="nbhname">Neighborhood</option>
            <option value="cls">Zoning Class</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label>3D</label>
          <input
            type='checkbox'
            checked={is3D}
            onChange={() => setIs3D(!is3D)}
          />
        </div>
      </div>

      {data && (
        <DeckGL
          viewState={viewState}
          onViewStateChange={handleViewStateChange}
          controller={{
            touchRotate: true,
            doubleClickZoom: false,
            dragPan: true
          }}
          layers={[layer]}
        >
          <Map
            reuseMaps
            mapLib={maplibregl}
            mapStyle='https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
          />
        </DeckGL>
      )}
    </div>
  );
};

export default MyMap;
