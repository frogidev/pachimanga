export interface ReaderState {
  controlsVisible: boolean;
  autoScrollPlaying: boolean;
  currentPageIndex: number;
}

export type ReaderAction =
  | { type: "toggle-play" }
  | { type: "pause" }
  | { type: "show-controls" }
  | { type: "hide-controls" }
  | { type: "page"; index: number };

export const initialReaderState: ReaderState = {
  controlsVisible: true,
  autoScrollPlaying: false,
  currentPageIndex: 0,
};

export function readerReducer(state: ReaderState, action: ReaderAction): ReaderState {
  switch (action.type) {
    case "toggle-play":
      return { ...state, autoScrollPlaying: !state.autoScrollPlaying, controlsVisible: true };
    case "pause":
      return { ...state, autoScrollPlaying: false, controlsVisible: true };
    case "show-controls":
      return { ...state, controlsVisible: true };
    case "hide-controls":
      return { ...state, controlsVisible: false };
    case "page":
      return { ...state, currentPageIndex: Math.max(0, action.index) };
    default:
      return state;
  }
}

/**
 * Resolve a saved reader position after the chapter layout exists.
 * Local IndexedDB progress has an exact pixel offset; cross-device Supabase
 * progress only has a percentage, so percentage is the fallback.
 */
export function readerResumeScrollTop(
  progress: { scrollPosition?: number; percentage?: number } | null | undefined,
  scrollHeight: number,
  viewportHeight: number,
) {
  if (!progress) return 0;
  const maxScroll = Math.max(0, scrollHeight - viewportHeight);
  const percentage = Number(progress.percentage);
  // Completed chapters reopen from the top for an intentional reread while
  // preserving their completed state in storage.
  if (Number.isFinite(percentage) && percentage >= 99) return 0;
  const pixels = Number(progress.scrollPosition);
  if (Number.isFinite(pixels) && pixels > 0) {
    return Math.min(maxScroll, Math.max(0, pixels));
  }

  if (!Number.isFinite(percentage)) return 0;
  const clamped = Math.max(0, Math.min(100, percentage));
  return (clamped / 100) * maxScroll;
}
