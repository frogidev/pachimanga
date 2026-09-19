import type { ReaderSettings } from '@/types/models';
export type ReaderPresetName='manga'|'webtoon';
export type ReaderPresetShape=Pick<ReaderSettings,'fitMode'|'preloadPages'>;
export const READER_PRESETS:Record<ReaderPresetName,ReaderPresetShape>={manga:{fitMode:'screen',preloadPages:1},webtoon:{fitMode:'width',preloadPages:3}};
export function normalizeReaderPreset(value:unknown):ReaderPresetName{return value==='manga'?'manga':'webtoon'}
export function readerPresetForTitle(settings:ReaderSettings,mangaId:string):ReaderPresetName{return normalizeReaderPreset(settings.titlePresets?.[mangaId]||settings.defaultPreset)}
export function effectiveReaderSettings(settings:ReaderSettings,mangaId:string):ReaderSettings{return{...settings,...READER_PRESETS[readerPresetForTitle(settings,mangaId)]}}
export function setTitleReaderPreset(settings:ReaderSettings,mangaId:string,preset:ReaderPresetName|null):ReaderSettings{const entries=Object.entries(settings.titlePresets||{}).filter(([id])=>id!==mangaId).slice(-199);if(preset)entries.push([mangaId,preset]);return{...settings,titlePresets:Object.fromEntries(entries)}}
