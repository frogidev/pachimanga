const ORIGIN = "https://weebcentral.com";

export const weebCentralEndpoints = {
  origin: ORIGIN,
  search(query: string, offset = 0) {
    const params = new URLSearchParams({
      adult: "False",
      display_mode: "Full Display",
      official: "Any",
      offset: String(Math.max(0, offset)),
      order: "Descending",
      sort: "Best Match",
      text: query.trim(),
    });
    return `${ORIGIN}/search/data?${params.toString()}`;
  },
  series(seriesId: string) {
    return `${ORIGIN}/series/${encodeURIComponent(seriesId)}`;
  },
  chapters(seriesId: string) {
    return `${ORIGIN}/series/${encodeURIComponent(seriesId)}/full-chapter-list`;
  },
  chapter(chapterId: string) {
    return `${ORIGIN}/chapters/${encodeURIComponent(chapterId)}`;
  },
  chapterImages(chapterId: string) {
    return `${ORIGIN}/chapters/${encodeURIComponent(chapterId)}/images?reading_style=long_strip`;
  },
};
