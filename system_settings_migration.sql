-- Global system settings table for Smart-U
-- Includes deletion_lock flag to make the system non-destructive when enabled

create table if not exists system_settings (
  id uuid primary key default gen_random_uuid(),
  -- other columns may already exist from previous migrations
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure the deletion_lock column exists even if the table was created earlier
alter table system_settings
  add column if not exists deletion_lock boolean not null default false;

-- Ensure there is always at least one row of settings.
-- If no row exists, insert a default row (deletion_lock will default to false).
insert into system_settings (id)
select gen_random_uuid()
where not exists (select 1 from system_settings);

-- Optional: simple trigger to keep updated_at in sync
do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'system_settings_set_updated_at'
  ) then
    create trigger system_settings_set_updated_at
    before update on system_settings
    for each row
    execute function public.set_current_timestamp_updated_at();
  end if;
exception
  when undefined_function then
    -- If set_current_timestamp_updated_at doesn't exist in this project,
    -- just skip creating the trigger. The app logic will still work.
    null;
end
$$;

