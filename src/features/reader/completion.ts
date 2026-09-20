export function preserveCompletedPercentage(savedPercentage: unknown, observedPercentage: unknown) {
  const saved = Number(savedPercentage);
  const observed = Number(observedPercentage);
  if (Number.isFinite(saved) && saved >= 99) return 100;
  if (!Number.isFinite(observed)) return 0;
  return Math.max(0, Math.min(100, observed));
}

export function shouldCloseReaderAfterCompletion(input: {
  wasCompleteOnOpen: boolean;
  isLastAvailableChapter: boolean;
  observedPercentage: number;
  alreadyClosing: boolean;
}) {
  return !input.wasCompleteOnOpen
    && input.isLastAvailableChapter
    && input.observedPercentage >= 99
    && !input.alreadyClosing;
}
