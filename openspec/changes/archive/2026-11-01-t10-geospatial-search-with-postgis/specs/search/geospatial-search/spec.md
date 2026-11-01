# Spec Delta

## Purpose

Enables deterministic geospatial proximity search for active cash and currency exchange offers within a geographic market using PostGIS spatial indexing, bounded radius, catalog filtering, and cursor pagination.

## ADDED Requirements

### Requirement: Proximity search filters active offers within market boundary and maximum radius
The system MUST evaluate proximity filters over PostGIS geography, ensuring that candidate offers belong to the active market scope, have an `active` status, and fall within the requested radius up to a system maximum of 50 kilometers.

#### Scenario: Matching offers are within the requested radius
- **WHEN** a user searches for offers around a coordinate with a 5 km radius
- **THEN** only active offers located within 5000 meters from the coordinates are returned with their calculated distance

#### Scenario: Distant offers outside the radius are excluded
- **WHEN** an offer is located beyond the requested search radius
- **THEN** it is excluded from the search results

#### Scenario: Inactive or other-market offers are excluded
- **WHEN** an offer is paused, exhausted, or belongs to a different market scope
- **THEN** it is excluded from the search results even if within geographic range

### Requirement: Geospatial search results enforce deterministic ordering and cursor pagination
The system MUST order proximity search results deterministically by ascending distance in meters, using the offer identifier as a stable tie-breaker, and return results formatted as a cursor-paginated page.

#### Scenario: Results are ordered by ascending distance
- **WHEN** multiple offers match the search criteria
- **THEN** the offers are returned sorted from nearest to farthest, with equal distances broken by offer ID

#### Scenario: Pagination returns the next page using the cursor
- **WHEN** a search matches more items than the page limit and the client requests the next cursor
- **THEN** the subsequent page resumes exactly after the last returned item without omissions or duplicates

### Requirement: Search criteria strictly validates allowed catalog pairs and coordinates
The system MUST validate that any requested pair belongs to the five approved MVP catalog pairs, that coordinates are valid finite numbers within bounds, and that radius is a positive number within the allowed ceiling.

#### Scenario: Invalid coordinates or unapproved pairs are rejected
- **WHEN** a client provides coordinates outside valid latitude/longitude ranges or an unsupported pair id
- **THEN** the search request is rejected before executing any database query

#### Scenario: Search without optional pair filter matches all active pairs in scope
- **WHEN** a user executes a proximity search without specifying a pair filter
- **THEN** active offers matching the geographic criteria across all approved MVP catalog pairs are returned
