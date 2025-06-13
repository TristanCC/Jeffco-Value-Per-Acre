"use client";

import React from 'react';
import { useState } from 'react';
import { DeckGL } from '@deck.gl/react';
import { GeoJsonLayer } from '@deck.gl/layers';
import maplibregl from 'maplibre-gl';
import { Map } from 'react-map-gl'; // ✅ correct component

const MAX_VPA = 18270386.920980927 / 25
const MIN_VPA = 0

function interpolateColor(value, min, max) {
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));

  let r, g, b;

  if (t < 0.33) {
    // Green → Yellow
    r = Math.floor(255 * (t / 0.33));
    g = 255;
    b = 0;
  } else if (t < 0.66) {
    // Yellow → Red
    r = 255;
    g = Math.floor(255 * (1 - (t - 0.33) / 0.33));
    b = 0;
  } else {
    // Red → Purple
    r = 255;
    g = 0;
    b = Math.floor(255 * ((t - 0.66) / 0.34)); // smoothly increase blue
  }

  return [r, g, b, 255];
}


export default function Home() {

  const [is3D, setIs3D] = useState(true)


  const layer = new GeoJsonLayer({
    id: 'GeoJsonLayer',
    data: '/merged_data_clean_bham.geojson',
    stroked: true,
    filled: true,
    onClick: (evt) => {console.log(evt.object)},
    getFillColor: (feature) => interpolateColor(feature.properties.ValuePerAcre, MIN_VPA, MAX_VPA),
    getLineColor: [0, 0, 0, 255],
    lineWidthMinPixels: 1,
    pickable: true,
    getElevation: is3D ? (feature) => feature.properties.ValuePerAcre * 0.00055 : undefined,
    extruded: is3D ? true : false,
  });

  return (
    <div onContextMenu={evt => evt.preventDefault()}>
      <input type="checkbox" name="3d" id="3d" className='fixed z-50 right-0 scale-200' onChange={() => setIs3D(!is3D)} />
      <DeckGL
        initialViewState={{
          longitude: -86.8025,
          latitude: 33.5207,
          zoom: 11,
          pitch: 50
      
        }}
        controller
        layers={[layer]}
        
      >
        <Map
          reuseMaps
          mapLib={maplibregl} // ✅ REQUIRED for MapLibre support
          mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
          
        />
      </DeckGL>
    </div>
  );
}
