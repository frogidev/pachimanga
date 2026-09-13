import type { Metadata } from "next";
import { NativeReaderLoader } from "@/features/native/native-reader-loader";

export const metadata: Metadata = { title: "Native Reader" };

export default async function NativeReaderPage({ params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await params;
  return <NativeReaderLoader chapterId={chapterId} />;
}
