export type ImportManga={title:string;sourceUrl?:string;coverUrl?:string;favorite?:boolean;lastChapterRead?:number;lastPageRead?:number;totalChapters?:number;categories?:string[]};
export type ImportResult={format:'image'|'tachiyomi'|'tachimanga'|'json';manga:ImportManga[];warnings:string[]};
