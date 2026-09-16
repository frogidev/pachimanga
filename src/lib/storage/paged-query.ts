export type PagedQueryResult<T> = {
  data: T[] | null;
  error: unknown | null;
};

export async function collectPagedRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PagedQueryResult<T>>,
  options: { pageSize?: number; maxPages?: number } = {},
): Promise<T[]> {
  const pageSize = options.pageSize ?? 1000;
  const maxPages = options.maxPages ?? 50;
  if (!Number.isInteger(pageSize) || pageSize <= 0) throw new Error('pageSize must be a positive integer.');
  if (!Number.isInteger(maxPages) || maxPages <= 0) throw new Error('maxPages must be a positive integer.');

  const rows: T[] = [];
  for (let page = 0; page < maxPages; page += 1) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const result = await fetchPage(from, to);
    if (result.error) {
      throw result.error instanceof Error ? result.error : new Error('Paged query failed.');
    }

    const chunk = result.data || [];
    rows.push(...chunk);
    if (chunk.length < pageSize) return rows;
  }

  throw new Error(`Paged query exceeded the ${pageSize * maxPages} row safety limit.`);
}
