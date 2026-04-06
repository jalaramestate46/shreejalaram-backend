create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.users (
  id text primary key,
  username text not null unique,
  full_name text not null,
  email text not null unique,
  mobile text not null,
  avatar text not null default '',
  password_hash text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  refresh_token text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.properties (
  id text primary key,
  title text not null,
  description text not null,
  transaction_type text not null check (transaction_type in ('Buy', 'Rent')),
  property_type text not null check (property_type in ('Residential', 'Commercial')),
  category text not null,
  sub_category text not null,
  location text not null,
  address text not null,
  price numeric(14, 2) not null check (price >= 0),
  sqt numeric(12, 2) not null check (sqt >= 0),
  bedrooms integer check (bedrooms is null or bedrooms >= 0),
  bathrooms integer check (bathrooms is null or bathrooms >= 0),
  images text[] not null default '{}',
  agent_id text references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.projects (
  id text primary key,
  title text not null,
  slug text not null unique,
  description text not null,
  status text not null check (status in ('ONGOING', 'COMPLETED')),
  location text not null,
  address text not null,
  project_type text not null default 'Premium Development',
  developed_by text not null default 'Shree Jalaram Estate Agency',
  images text[] not null default '{}',
  brochure_url text not null default '',
  overview jsonb not null default '{}'::jsonb,
  amenities text[] not null default '{}',
  location_description text not null default '',
  virtual_tour_url text not null default '',
  virtual_tour_title text not null default '',
  virtual_tour_description text not null default '',
  faqs jsonb not null default '[]'::jsonb,
  contact_title text not null default 'Please share your contact',
  contact_note text not null default 'Limited time offers available',
  contact_button_label text not null default 'Get Offer',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.content (
  key text primary key,
  payload jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.inquiries (
  id text primary key,
  type text not null default 'contact' check (type in ('contact', 'project')),
  name text not null,
  mobile text not null,
  email text not null default '',
  message text not null default '',
  consent boolean not null default false,
  project_id text references public.projects(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.reviews (
  id text primary key,
  name text not null,
  phone text not null,
  rating integer not null default 5 check (rating between 1 and 5),
  testimonial text not null,
  image text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_favorites (
  user_id text not null references public.users(id) on delete cascade,
  property_id text not null references public.properties(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, property_id)
);

create index if not exists idx_users_role on public.users(role);
create index if not exists idx_users_created_at on public.users(created_at desc);
create index if not exists idx_properties_created_at on public.properties(created_at desc);
create index if not exists idx_properties_agent_id on public.properties(agent_id);
create index if not exists idx_properties_transaction_type on public.properties(transaction_type);
create index if not exists idx_properties_property_type on public.properties(property_type);
create index if not exists idx_properties_category on public.properties(category);
create index if not exists idx_properties_sub_category on public.properties(sub_category);
create index if not exists idx_properties_location on public.properties(location);
create index if not exists idx_projects_created_at on public.projects(created_at desc);
create index if not exists idx_projects_status on public.projects(status);
create index if not exists idx_projects_location on public.projects(location);
create index if not exists idx_inquiries_type on public.inquiries(type);
create index if not exists idx_inquiries_project_id on public.inquiries(project_id);
create index if not exists idx_inquiries_created_at on public.inquiries(created_at desc);
create index if not exists idx_reviews_created_at on public.reviews(created_at desc);
create index if not exists idx_user_favorites_property_id on public.user_favorites(property_id);

create index if not exists idx_properties_search
on public.properties using gin (
  to_tsvector(
    'simple',
    coalesce(title, '') || ' ' ||
    coalesce(location, '') || ' ' ||
    coalesce(address, '') || ' ' ||
    coalesce(description, '')
  )
);

drop trigger if exists trg_users_set_updated_at on public.users;
create trigger trg_users_set_updated_at before update on public.users for each row execute function public.set_updated_at();
drop trigger if exists trg_properties_set_updated_at on public.properties;
create trigger trg_properties_set_updated_at before update on public.properties for each row execute function public.set_updated_at();
drop trigger if exists trg_projects_set_updated_at on public.projects;
create trigger trg_projects_set_updated_at before update on public.projects for each row execute function public.set_updated_at();
drop trigger if exists trg_content_set_updated_at on public.content;
create trigger trg_content_set_updated_at before update on public.content for each row execute function public.set_updated_at();
drop trigger if exists trg_inquiries_set_updated_at on public.inquiries;
create trigger trg_inquiries_set_updated_at before update on public.inquiries for each row execute function public.set_updated_at();
drop trigger if exists trg_reviews_set_updated_at on public.reviews;
create trigger trg_reviews_set_updated_at before update on public.reviews for each row execute function public.set_updated_at();
