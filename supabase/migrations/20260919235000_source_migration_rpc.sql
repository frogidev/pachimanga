create or replace function public.migrate_my_library_source(
  p_from_source_id text,p_from_manga_id text,p_to_source_id text,p_to_manga_id text,p_to_title text,p_to_cover_url text,p_to_publication_status text,p_chapter_map jsonb default '{}'::jsonb
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare uid uuid:=(select auth.uid()); source_row public.library_entries%rowtype; target_exists boolean:=false; migrated_progress integer:=0; total_progress integer:=0; mapped_progress integer:=0; history_chapter text; map_entry record;
begin
 if uid is null then raise exception 'authentication required'; end if;
 if p_from_source_id=p_to_source_id and p_from_manga_id=p_to_manga_id then raise exception 'source and target are identical'; end if;
 if char_length(p_from_source_id)>40 or char_length(p_to_source_id)>40 or char_length(p_from_manga_id)>160 or char_length(p_to_manga_id)>160 or char_length(p_to_title)>500 then raise exception 'invalid migration identifiers'; end if;
 if p_to_publication_status not in ('ongoing','complete','hiatus','cancelled','unknown') then raise exception 'invalid publication status'; end if;
 select * into source_row from public.library_entries where user_id=uid and source_id=p_from_source_id and manga_id=p_from_manga_id for update;
 if source_row.id is null then raise exception 'source library entry not found'; end if;
 select exists(select 1 from public.library_entries where user_id=uid and source_id=p_to_source_id and manga_id=p_to_manga_id) into target_exists;
 insert into public.library_entries(user_id,source_id,manga_id,title,cover_url,added_at,updated_at,reading_status,reading_status_manual,publication_status,chapter_count,latest_chapter_id,latest_chapter_number,latest_chapter_published_at,new_chapter_count,last_chapter_change_at,last_checked_at)
 values(uid,p_to_source_id,p_to_manga_id,p_to_title,nullif(p_to_cover_url,''),source_row.added_at,now(),source_row.reading_status,source_row.reading_status_manual,p_to_publication_status,0,null,null,null,0,source_row.last_chapter_change_at,null)
 on conflict(user_id,source_id,manga_id) do update set title=excluded.title,cover_url=coalesce(excluded.cover_url,public.library_entries.cover_url),added_at=least(public.library_entries.added_at,excluded.added_at),reading_status=case when public.library_entries.reading_status_manual then public.library_entries.reading_status else excluded.reading_status end,reading_status_manual=public.library_entries.reading_status_manual or excluded.reading_status_manual,publication_status=excluded.publication_status,updated_at=now();
 insert into public.library_collection_items(user_id,collection_id,source_id,manga_id,added_at)
 select uid,collection_id,p_to_source_id,p_to_manga_id,added_at from public.library_collection_items where user_id=uid and source_id=p_from_source_id and manga_id=p_from_manga_id on conflict do nothing;
 select count(*) into total_progress from public.reading_progress where user_id=uid and source_id=p_from_source_id and manga_id=p_from_manga_id;
 select count(*) into mapped_progress from public.reading_progress
 where user_id=uid and source_id=p_from_source_id and manga_id=p_from_manga_id and p_chapter_map ? chapter_id;
 if mapped_progress < total_progress then
   raise exception 'source migration cannot safely map % progress rows', total_progress-mapped_progress;
 end if;
 select chapter_id into history_chapter from public.reading_history where user_id=uid and source_id=p_from_source_id and manga_id=p_from_manga_id;
 if history_chapter is not null and not (p_chapter_map ? history_chapter) then
   raise exception 'source migration cannot safely map reading history';
 end if;
 for map_entry in select key old_chapter_id,value #>> '{}' new_chapter_id from jsonb_each(coalesce(p_chapter_map,'{}'::jsonb)) loop
  insert into public.reading_progress(user_id,source_id,manga_id,chapter_id,page_index,scroll_progress,completed,updated_at)
  select uid,p_to_source_id,p_to_manga_id,map_entry.new_chapter_id,old.page_index,old.scroll_progress,old.completed,old.updated_at from public.reading_progress old
  where old.user_id=uid and old.source_id=p_from_source_id and old.manga_id=p_from_manga_id and old.chapter_id=map_entry.old_chapter_id
  and not exists(select 1 from public.reading_progress existing where existing.user_id=uid and existing.source_id=p_to_source_id and existing.chapter_id=map_entry.new_chapter_id and existing.updated_at>=old.updated_at)
  on conflict(user_id,source_id,chapter_id) do update set manga_id=excluded.manga_id,page_index=excluded.page_index,scroll_progress=excluded.scroll_progress,completed=excluded.completed,updated_at=excluded.updated_at where excluded.updated_at>public.reading_progress.updated_at;
  if found then migrated_progress:=migrated_progress+1; end if;
 end loop;
 insert into public.reading_history(user_id,source_id,manga_id,chapter_id,percentage,read_at)
 select uid,p_to_source_id,p_to_manga_id,p_chapter_map->>old.chapter_id,old.percentage,old.read_at from public.reading_history old where old.user_id=uid and old.source_id=p_from_source_id and old.manga_id=p_from_manga_id
 on conflict(user_id,source_id,manga_id) do update set chapter_id=excluded.chapter_id,percentage=excluded.percentage,read_at=excluded.read_at where excluded.read_at>public.reading_history.read_at;
 delete from public.reading_history where user_id=uid and source_id=p_from_source_id and manga_id=p_from_manga_id;
 delete from public.reading_progress where user_id=uid and source_id=p_from_source_id and manga_id=p_from_manga_id;
 delete from public.library_entries where user_id=uid and source_id=p_from_source_id and manga_id=p_from_manga_id;
 return jsonb_build_object('migratedProgress',migrated_progress,'unmappedProgress',0,'targetAlreadyExisted',target_exists);
end;$$;
revoke all on function public.migrate_my_library_source(text,text,text,text,text,text,text,jsonb) from public, anon;
grant execute on function public.migrate_my_library_source(text,text,text,text,text,text,text,jsonb) to authenticated;
