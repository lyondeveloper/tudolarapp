import type { CursorPage } from '../../../../common/pagination/cursor-pagination';
import type { Report, ReportReason } from '../../../domain/report';

/**
 * The HTTP shapes of a report. It exposes the reporter-visible fields and uses
 * the one shared cursor-page shape for the collection; it never exposes the
 * reported user's private data.
 */
export interface ReportDto {
  id: string;
  reason: ReportReason;
  createdAt: string;
}

export type ReportListDto = CursorPage<ReportDto>;

/** Maps the domain report to its transport shape. */
export function toReportDto(report: Report): ReportDto {
  return {
    id: report.id,
    reason: report.reason,
    createdAt: report.createdAt.toISOString(),
  };
}
