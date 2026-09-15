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
  const maxPages = Math.max(1, Math.min(options.maxPages ?? 5, 10));
  const all: T[] = [];

  for (let page = 0; page < maxPages; page += 1) {
    const offset = page * pageSize;
    const result = await loadPage(page, offset, pageSize);
    const batch = result.items || [];
    if (!batch.length) break;

    all.push(...batch);

    if (typeof result.total === 'number' && Number.isFinite(result.total) && all.length >= result.total) break;
    if (batch.length < pageSize) break;
  }

  return all;
}
