# database/spatial-queries Specification

## Purpose

Ensures PostGIS proximity filters are constructed through a single parameterized infrastructure layer with explicit SRID/unit handling and an identifier allowlist.

## Requirements

### Requirement: Spatial queries are parameterized and allowlisted
Spatial queries SHALL be built only through the database spatial layer. Values SHALL be bound as parameters, and table and column identifiers SHALL come from an explicit allowlist; untrusted input SHALL never be interpolated into SQL.

#### Scenario: Values are bound, never interpolated
- **WHEN** a proximity filter is built from a longitude, a latitude, and a radius
- **THEN** the resulting statement carries each value as a bound parameter and contains none of them in the SQL text

#### Scenario: An identifier outside the allowlist is rejected
- **WHEN** a spatial query is requested for a table or column that is not allowlisted
- **THEN** the layer throws before any SQL is built or sent

### Requirement: Proximity filters declare their reference system and unit
A proximity filter SHALL use `ST_DWithin` over `geography` with a radius in meters, and SHALL reject a radius that is non-finite, non-positive, or above a maximum the caller must supply (the layer defines no product maximum), and coordinates outside valid longitude and latitude ranges.

#### Scenario: A kilometre value is converted explicitly
- **WHEN** a caller supplies a radius of 5 kilometres
- **THEN** the filter binds 5000 meters

#### Scenario: Invalid distance or coordinates are rejected
- **WHEN** the radius is zero, negative, `NaN`, or above the maximum, or the latitude is outside -90 to 90
- **THEN** the layer rejects the request with a validation error and builds no SQL
