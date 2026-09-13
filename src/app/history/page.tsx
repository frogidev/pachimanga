import type { Metadata } from "next";
import { HistoryView } from "@/features/history/history-view";

export const metadata: Metadata = { title: "History" };

export default function HistoryPage() {
  return <HistoryView />;
}
