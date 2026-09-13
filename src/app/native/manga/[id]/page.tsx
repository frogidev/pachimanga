import type { Metadata } from "next";
import { NativeMangaView } from "@/features/native/native-manga-view";

export const metadata: Metadata = { title: "Native WeebCentral" };

export default async function NativeMangaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <NativeMangaView id={id} />;
}
