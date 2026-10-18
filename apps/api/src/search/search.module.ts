import { Module } from '@nestjs/common';

/**
 * The search module. It owns `SearchCriteria` and the query (design.md, module
 * table) and the natural-language parser port (ADR-0015).
 *
 * This change freezes its contracts and registers the module. It provides
 * nothing: the deterministic query adapter lands with T10, and the parser port
 * is deliberately left unimplemented and **wired nowhere** (ADR-0015), so there
 * is no adapter to bind and no route exposes it.
 */
@Module({})
export class SearchModule {}
