-- Create the predictions table in the public schema
create table public.predictions (
  -- Unique identifier for each prediction
  id uuid default gen_random_uuid() primary key,
  -- Timestamps for creation and updates
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null,
  -- The actual prediction text
  content text not null,
  -- Reference to the user who created the prediction
  user_id uuid references auth.users(id) not null,
  -- Locking mechanism
  is_locked boolean default false not null,
  locked_at timestamptz
);

-- Enable Row Level Security (RLS)
alter table public.predictions enable row level security;

-- Policy: Allow all authenticated users to view predictions
create policy "Users can view all predictions" 
  on public.predictions
  for select
  to authenticated
  using (true);

-- Policy: Allow users to create their own predictions
create policy "Users can insert their own predictions" 
  on public.predictions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Policy: Allow users to update their own unlocked predictions
create policy "Users can update their own unlocked predictions" 
  on public.predictions
  for update
  to authenticated
  using (auth.uid() = user_id and is_locked = false);

-- Function to automatically update the updated_at timestamp
create or replace function handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to call the handle_updated_at function before updates
create trigger predictions_updated_at
  before update on public.predictions
  for each row
  execute function handle_updated_at(); 