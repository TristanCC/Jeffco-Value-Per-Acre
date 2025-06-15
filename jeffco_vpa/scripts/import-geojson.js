// scripts/import-geojson.js
import fs from 'fs';
import { Pool } from 'pg';

async function main() {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '183234',
    database: 'parcels_db',
  });

  const client = await pool.connect();

  try {
    console.log('Reading GeoJSON…');
    const raw = fs.readFileSync('./public/output.geojson', 'utf8');
    const geojson = JSON.parse(raw);

    console.log('Dropping & recreating parcels table…');
    await client.query(`
      DROP TABLE IF EXISTS parcels;
      CREATE TABLE parcels (
        gid SERIAL PRIMARY KEY,
        parcelid TEXT,
        assdvalue NUMERIC,
        gis_acres NUMERIC,
        valueperacre NUMERIC,
        geom GEOMETRY(MULTIPOLYGON, 4326)
      );
    `);

    console.log(`Importing ${geojson.features.length} features…`);
    for (const feature of geojson.features) {
      const { PARCELID, AssdValue, GIS_ACRES, ValuePerAcre } = feature.properties;
      const geom = JSON.stringify(feature.geometry);

    await client.query(
      `INSERT INTO parcels
          (parcelid, assdvalue, gis_acres, valueperacre, geom)
         VALUES ($1, $2, $3, $4,
           ST_SetSRID(
             ST_Multi(
               ST_GeomFromGeoJSON($5)
             ),
           4326)
         );`,
      [PARCELID, AssdValue, GIS_ACRES, ValuePerAcre, geom]
    );
    }

    console.log('Creating spatial index…');
    await client.query(`CREATE INDEX idx_parcels_geom ON parcels USING GIST (geom);`);

    console.log('Done!');
  } catch (err) {
    console.error('ERROR during import:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
