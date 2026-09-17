export type SourcePage<T> = {
  items: T[];
  total?: number;
};

type PaginationOptions = {
  pageSize?: number;
  maxPages?: number;
};

/** Collects bounded provider pages without assuming a provider always reports total. */
export async function collectSourcePages<T>(
  loadPage: (page: number, offset: number, limit: number) => Promise<SourcePage<T>>,
  options: PaginationOptions = {},
): Promise<T[]> {
  const pageSize = Math.max(1, Math.min(options.pageSize ?? 100, 500));
  const maxPages = Math.max(1, Math.min(options.maxPages ?? 5, 50));
  const all: T[] = [];

  for (let page = 0; page < maxPages; page += 1) {
    const offset = page * pageSize;
    const result = await loadPage(page, offset, pageSize);
    const batch = result.items || [];
    if (!batch.length) break;

    all.push(...batch);

    const reportedTotal = typeof result.total === 'number' && Number.isFinite(result.total) ? result.total : null;
    if (reportedTotal != null && all.length >= reportedTotal) return all;
    if (batch.length < pageSize) return all;

    if (page === maxPages - 1) {
      const detail = reportedTotal != null ? ` before the reported total of ${reportedTotal}` : '';
      throw new Error(`Provider chapter pagination reached the ${pageSize * maxPages} item safety limit${detail}; refusing a partial chapter snapshot.`);
    }
  }

  return all;
}
