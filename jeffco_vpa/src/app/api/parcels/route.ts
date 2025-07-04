import { NextResponse } from 'next/server';
import { Client } from 'pg';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '0', 10);
  const limit = parseInt(searchParams.get('limit') || '10000', 10);
  const offset = page * limit;

  const minLng = parseFloat(searchParams.get('minLng') || '-180');
  const minLat = parseFloat(searchParams.get('minLat') || '-90');
  const maxLng = parseFloat(searchParams.get('maxLng') || '180');
  const maxLat = parseFloat(searchParams.get('maxLat') || '90');

  const client = new Client({
    host: 'localhost',
    port: 5433,
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
      FROM (
        SELECT * FROM parcels
        WHERE geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)
        ORDER BY gid
        LIMIT $5 OFFSET $6
      ) AS t
    `, [minLng, minLat, maxLng, maxLat, limit, offset]);

    await client.end();
    return NextResponse.json(result.rows[0].geojson);
  } catch (err) {
    console.error(err);
    return new NextResponse('Failed to fetch GeoJSON', { status: 500 });
  }
}
