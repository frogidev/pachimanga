import { createClient } from '@/lib/supabase/client';
import { bindCurrentUserCache } from '@/lib/storage/reader-storage';

export type LibraryCollection = {
  id: string;
  name: string;
  createdAt: string;
};

export type LibraryCollectionMembership = {
  collectionId: string;
  sourceId: string;
  mangaId: string;
};

function cleanCollectionName(value: string) {
  const name = value.trim().replace(/\s+/g, ' ');
  if (!name) throw new Error('Collection name is required.');
  if (name.length > 50) throw new Error('Collection names can contain at most 50 characters.');
  return name;
}

function missingCollectionsSchema(error: { code?: string; message?: string } | null | undefined) {
  return error?.code === '42P01'
    || error?.code === 'PGRST205'
    || Boolean(error?.message?.includes('library_collections'))
    || Boolean(error?.message?.includes('library_collection_items'));
}

export async function getLibraryCollectionState(): Promise<{
  collections: LibraryCollection[];
  memberships: LibraryCollectionMembership[];
}> {
  const user = await bindCurrentUserCache();
  const sb = createClient();
  const [collectionsResult, membershipsResult] = await Promise.all([
    sb
      .from('library_collections')
      .select('id,name,created_at')
      .eq('user_id', user.id)
      .order('name', { ascending: true }),
    sb
      .from('library_collection_items')
      .select('collection_id,source_id,manga_id')
      .eq('user_id', user.id),
  ]);
  if (missingCollectionsSchema(collectionsResult.error) || missingCollectionsSchema(membershipsResult.error)) {
    return { collections: [], memberships: [] };
  }
  if (collectionsResult.error) throw collectionsResult.error;
  if (membershipsResult.error) throw membershipsResult.error;

  return {
    collections: (collectionsResult.data || []).map((row) => ({
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
    })),
    memberships: (membershipsResult.data || []).map((row) => ({
      collectionId: row.collection_id,
      sourceId: row.source_id,
      mangaId: row.manga_id,
    })),
  };
}

export async function createLibraryCollection(name: string): Promise<LibraryCollection> {
  const user = await bindCurrentUserCache();
  const sb = createClient();
  const cleaned = cleanCollectionName(name);
  const { data, error } = await sb
    .from('library_collections')
    .insert({ user_id: user.id, name: cleaned })
    .select('id,name,created_at')
    .single();
  if (error) {
    if (missingCollectionsSchema(error)) throw new Error('Collections are not enabled on this environment yet.');
    if (error.code === '23505') throw new Error('A collection with that name already exists.');
    throw error;
  }
  return { id: data.id, name: data.name, createdAt: data.created_at };
}

export async function deleteLibraryCollection(collectionId: string) {
  const user = await bindCurrentUserCache();
  const sb = createClient();
  const { error } = await sb
    .from('library_collections')
    .delete()
    .eq('user_id', user.id)
    .eq('id', collectionId);
  if (error) throw error;
}

export async function setLibraryCollectionMembership(input: {
  collectionId: string;
  sourceId: string;
  mangaId: string;
  member: boolean;
}) {
  const user = await bindCurrentUserCache();
  const sb = createClient();

  if (input.member) {
    const { error } = await sb.from('library_collection_items').upsert({
      user_id: user.id,
      collection_id: input.collectionId,
      source_id: input.sourceId,
      manga_id: input.mangaId,
    }, { onConflict: 'user_id,collection_id,source_id,manga_id' });
    if (error) throw error;
    return;
  }

  const { error } = await sb
    .from('library_collection_items')
    .delete()
    .eq('user_id', user.id)
    .eq('collection_id', input.collectionId)
    .eq('source_id', input.sourceId)
    .eq('manga_id', input.mangaId);
  if (error) throw error;
}
