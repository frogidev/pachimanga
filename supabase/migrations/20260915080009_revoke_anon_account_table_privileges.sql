revoke all privileges on all tables in schema public from anon;
alter default privileges for role postgres in schema public
  revoke all privileges on tables from anon;
