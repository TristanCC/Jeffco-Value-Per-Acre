"use client";

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { DeckGL } from '@deck.gl/react';
import { GeoJsonLayer } from '@deck.gl/layers';
import maplibregl, { Feature } from 'maplibre-gl';
import { Map, ViewStateChangeEvent, MapViewState } from 'react-map-gl';

// Value bounds
const MAX_VPA = 18270386.920980927;
const MIN_VPA = 0;

// View bounds (example: restrict to Birmingham-ish area)
const MIN_LAT = 33.3;
const MAX_LAT = 33.8;
const MIN_LNG = -87.1;
const MAX_LNG = -86.5;

// Clamp helper
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

// Color scale function
function interpolateColor(value, min, max) {
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

export default function Home() {

  const [data, setData] = useState(null)
  const [is3D, setIs3D] = useState(true);
  const [viewState, setViewState] = useState<MapViewState>({
    longitude: -86.8025,
    latitude: 33.5207,
    zoom: 11,
    pitch: 50,
    bearing: 0,
    minZoom: 8
  });
  const [selection, setSelection] = useState<String>()

  useEffect(() => {
    fetch('/api/parcels')
    .then(res => res.json())
    .then(json => {setData(json)
      console.log(json)
    })
  },[])

  const handleViewStateChange = useCallback((e: ViewStateChangeEvent) => {
    const v = e.viewState;
    setViewState({
      ...v,
      latitude: clamp(v.latitude, MIN_LAT, MAX_LAT),
      longitude: clamp(v.longitude, MIN_LNG, MAX_LNG)
    });
  }, []);

  useEffect(() => {
    console.log(selection)
  }, [selection])
  
  // Memoize the layer to recreate it when dependencies change
const layer = useMemo(() => new GeoJsonLayer({
  id: 'GeoJsonLayer',
  data: data || "",
  stroked: true,
  filled: true,
  onClick: (evt) => {
    console.log(evt.object)
    setSelection(String(evt.object.properties.parcelid))
  },
  updateTriggers: {
    getFillColor: [selection] // This ensures getFillColor recalculates when selection changes
  },
  getFillColor: (feature) => {
    // This logic is necessary for persistent selection highlighting
    return selection === String(feature.properties.parcelid)
      ? [255, 255, 255, 255] // White for selected
      : interpolateColor(feature.properties.valueperacre, MIN_VPA, MAX_VPA);
  },
  getLineColor: [0, 0, 0, 255],
  lineWidthMinPixels: 1,
  pickable: true,
  highlightColor: [200, 200, 255, 255], // Light blue for hover (optional)
  autoHighlight: true,
  getElevation: is3D
    ? (feature) => feature.properties.valueperacre * 0.00055
    : undefined,
  extruded: is3D,    
}), [data, selection, is3D]);

  return (
    <div onContextMenu={(evt) => evt.preventDefault()}>
      <div className='flex fixed z-50 right-0 scale-200 m-8 gap-2 text-black'>
        <h1>3D</h1>
        <input
          type='checkbox'
          checked={is3D}
          onChange={() => setIs3D(!is3D)}
        />
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
}