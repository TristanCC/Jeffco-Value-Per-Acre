import { NextResponse } from 'next/server';
import { Client } from 'pg';

export async function GET() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: process.env.PASSWORD,
    database: 'parcels_db',
  });

  try {
    await client.connect();

    const result = await client.query(`
      SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features', jsonb_agg(
          jsonb_build_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(geom)::jsonb,
            'properties', to_jsonb(t) - 'geom'
          )
        )
      ) AS geojson
      FROM parcels AS t;
    `);

    await client.end();

    return NextResponse.json(result.rows[0].geojson);
  } catch (err) {
    console.error(err);
    return new NextResponse('Failed to fetch GeoJSON', { status: 500 });
  }
}
