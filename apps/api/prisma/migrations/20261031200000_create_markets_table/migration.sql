-- CreateTable
CREATE TABLE "markets" (
    "id" VARCHAR(64) NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "description" TEXT,
    "boundary" geometry(Polygon, 4326) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "attribution" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "markets_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "markets_boundary_srid_check" CHECK (ST_SRID("boundary") = 4326)
);

-- CreateIndex
CREATE INDEX "markets_boundary_gist_idx" ON "markets" USING GIST ("boundary");

-- Seed initial pilot market: Ciudad Ojeda (Municipio Lagunillas, Zulia)
-- Bounded by authoritative service polygon in WGS84 with OpenStreetMap attribution.
INSERT INTO "markets" ("id", "name", "description", "boundary", "is_active", "attribution")
VALUES (
    'ciudad-ojeda',
    'Ciudad Ojeda',
    'Mercado piloto Ciudad Ojeda (Municipio Lagunillas, Zulia)',
    ST_GeomFromText('POLYGON((-71.36 10.16, -71.33 10.26, -71.22 10.26, -71.18 10.16, -71.28 10.10, -71.36 10.16))', 4326),
    true,
    '© OpenStreetMap contributors'
) ON CONFLICT ("id") DO NOTHING;
