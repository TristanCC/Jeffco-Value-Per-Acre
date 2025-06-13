"use client";

import React from 'react';
import { DeckGL } from '@deck.gl/react';
import { GeoJsonLayer } from '@deck.gl/layers';
import maplibregl from 'maplibre-gl';
import { Map } from 'react-map-gl'; // ✅ correct component

export default function Home() {
  const layer = new GeoJsonLayer({
    id: 'GeoJsonLayer',
    data: '/merged_data_clean_bham.geojson',
    stroked: true,
    filled: true,
    getFillColor: [160, 160, 180, 200],
    getLineColor: [0, 0, 0, 255],
    lineWidthMinPixels: 1,
    pickable: true,
  });

  return (
    <DeckGL
      initialViewState={{
        longitude: -86.8025,
        latitude: 33.5207,
        zoom: 11,
      }}
      controller
      layers={[layer]}
      style={{ width: '100vw', height: '100vh' }}
    >
      <Map
        reuseMaps
        mapLib={maplibregl} // ✅ REQUIRED for MapLibre support
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        style={{ width: '100%', height: '100%' }}
      />
    </DeckGL>
  );
}
