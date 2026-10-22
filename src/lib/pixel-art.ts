export type Palette = Record<string, string>;
export type PixelRect = { x: number; y: number; w: number; fill: string };

/** Turns an ASCII sprite ("." is transparent) into horizontally merged 1px-tall rects. */
export function spriteRects(rows: readonly string[], palette: Palette): PixelRect[] {
  const rects: PixelRect[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const key = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === key) end += 1;
      const fill = palette[key];
      if (key !== '.' && fill) rects.push({ x, y, w: end - x, fill });
      x = end;
    }
  });
  return rects;
}
