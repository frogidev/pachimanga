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
