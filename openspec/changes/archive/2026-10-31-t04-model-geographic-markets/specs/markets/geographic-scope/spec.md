# Spec Delta

## Purpose

Defines persistent geographic markets with authoritative WGS84 boundary polygons, PostGIS spatial indexing, point-in-polygon containment verification, and pilot market data for Ciudad Ojeda.

## ADDED Requirements

### Requirement: Geographic market entity with boundary polygon
The system SHALL persist geographic markets with an identifier, display name, description, active status, attribution text, and a WGS84 boundary polygon stored in PostGIS.

#### Scenario: Market entity exposes geographic attributes
- **WHEN** a market is retrieved by identifier
- **THEN** the system returns its identifier, name, active status, and polygon boundary in WGS84

#### Scenario: Inactive markets are identified
- **WHEN** a market has its active status set to false
- **THEN** operations requiring an active market reject that market identifier

### Requirement: Boundary containment predicate via PostGIS
The system SHALL verify whether geographic coordinates fall within a market's boundary polygon using boundary-inclusive spatial containment (`ST_Covers`).

#### Scenario: Coordinate inside the market polygon is accepted
- **WHEN** a location within the market boundary is checked for containment
- **THEN** the system confirms the coordinate is contained within the market

#### Scenario: Coordinate outside the market polygon is rejected
- **WHEN** a location outside the market boundary is checked for containment
- **THEN** the system reports the coordinate is not contained within the market

#### Scenario: Coordinate on the boundary edge is accepted
- **WHEN** a location lies exactly on the market polygon edge
- **THEN** the system confirms containment because the predicate is boundary-inclusive

### Requirement: Authoritative Ciudad Ojeda pilot market seed
The system SHALL provide seed data for the Ciudad Ojeda pilot market bounded by the authoritative polygon with OpenStreetMap contributor attribution.

#### Scenario: Ciudad Ojeda market exists upon seed execution
- **WHEN** the database migrations and seed scripts are applied
- **THEN** the Ciudad Ojeda market exists with identifier `ciudad-ojeda` and carries the required attribution notice
