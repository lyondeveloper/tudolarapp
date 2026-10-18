import type { Report } from '../domain/report';

/**
 * The port the reports module owns. It consumes the `sellers` eligibility
 * contract (moderation can change eligibility) and the `offers` and
 * `conversations` contracts.
 *
 * The concrete adapter lands with T14; this change freezes the port only.
 */
export const REPORT_REPOSITORY = Symbol('REPORT_REPOSITORY');

export interface ReportRepositoryPort {
  save(report: Report): Promise<void>;
}
