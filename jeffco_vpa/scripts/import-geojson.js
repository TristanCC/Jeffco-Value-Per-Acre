// scripts/import-geojson.js
import fs from 'fs';
import { Pool } from 'pg';
import path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

async function main() {
  const pool = new Pool({
    host: 'localhost',
    port: 5433,
    user: 'postgres',
    password: process.env.PASSWORD,
    database: 'parcels_db',
  });

  const client = await pool.connect();

  try {
    console.log('Reading GeoJSON…');
    const raw = fs.readFileSync('./data_clean_extended.geojson', 'utf8');
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
        prevparceltotal NUMERIC,
        ownername TEXT,
        prop_mail TEXT,
        addr_apr TEXT,
        nbhname TEXT,
        zip_mail TEXT,
        city TEXT,
        district TEXT,
        zoning_boe TEXT,
        bldg_ind TEXT,
        cls TEXT,
        geom GEOMETRY(MULTIPOLYGONZ, 4326)
      );
    `);

    console.log(`Importing ${geojson.features.length} features…`);
    for (const feature of geojson.features) {
      const {
        PARCELID,
        AssdValue,
        GIS_ACRES,
        ValuePerAcre,
        PrevParcelTotal,
        OWNERNAME,
        PROP_MAIL,
        ADDR_APR,
        NbhName,
        ZIP_MAIL,
        CITY,
        DISTRICT,
        ZONING_BOE,
        BLDG_IND,
        Cls
      } = feature.properties;

      const geom = JSON.stringify(feature.geometry);

      await client.query(
        `INSERT INTO parcels (
          parcelid, assdvalue, gis_acres, valueperacre, prevparceltotal,
          ownername, prop_mail, addr_apr, nbhname, zip_mail,
          city, district, zoning_boe, bldg_ind, cls, geom
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15,
          ST_SetSRID(ST_Multi(ST_GeomFromGeoJSON($16)), 4326)
        );`,
        [
          PARCELID,
          AssdValue,
          GIS_ACRES,
          ValuePerAcre,
          PrevParcelTotal,
          OWNERNAME,
          PROP_MAIL,
          ADDR_APR,
          NbhName,
          ZIP_MAIL,
          CITY,
          DISTRICT,
          ZONING_BOE,
          BLDG_IND,
          Cls,
          geom
        ]
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
