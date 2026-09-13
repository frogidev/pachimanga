import type { Metadata } from "next";
import { BrowseView } from "@/features/browse/browse-view";

export const metadata: Metadata = { title: "Browse" };

export default function BrowsePage() {
  return <BrowseView />;
}
