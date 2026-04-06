create table if not exists users (
  id varchar(191) primary key,
  username varchar(191) not null unique,
  full_name varchar(191) not null,
  email varchar(191) not null unique,
  mobile varchar(50) not null,
  avatar text not null,
  password_hash text not null,
  role enum('user', 'admin') not null default 'user',
  refresh_token text null,
  created_at datetime not null default utc_timestamp(),
  updated_at datetime not null default utc_timestamp()
);

create table if not exists properties (
  id varchar(191) primary key,
  title varchar(255) not null,
  description text not null,
  transaction_type enum('Buy', 'Rent') not null,
  property_type enum('Residential', 'Commercial') not null,
  category varchar(191) not null,
  sub_category varchar(191) not null,
  location varchar(191) not null,
  address text not null,
  price decimal(14, 2) not null,
  sqt decimal(12, 2) not null,
  bedrooms int null,
  bathrooms int null,
  images json not null,
  agent_id varchar(191) null,
  created_at datetime not null default utc_timestamp(),
  updated_at datetime not null default utc_timestamp(),
  constraint fk_properties_agent foreign key (agent_id) references users(id) on delete set null,
  constraint chk_properties_price check (price >= 0),
  constraint chk_properties_sqt check (sqt >= 0),
  constraint chk_properties_bedrooms check (bedrooms is null or bedrooms >= 0),
  constraint chk_properties_bathrooms check (bathrooms is null or bathrooms >= 0)
);

create table if not exists projects (
  id varchar(191) primary key,
  title varchar(255) not null,
  slug varchar(191) not null unique,
  description text not null,
  status enum('ONGOING', 'COMPLETED') not null,
  location varchar(191) not null,
  address text not null,
  project_type varchar(191) not null default 'Premium Development',
  developed_by varchar(191) not null default 'Shree Jalaram Estate Agency',
  images json not null,
  brochure_url text not null,
  overview json not null,
  amenities json not null,
  location_description text not null,
  virtual_tour_url text not null,
  virtual_tour_title varchar(255) not null,
  virtual_tour_description text not null,
  faqs json not null,
  contact_title varchar(255) not null,
  contact_note text not null,
  contact_button_label varchar(191) not null,
  created_at datetime not null default utc_timestamp(),
  updated_at datetime not null default utc_timestamp()
);

create table if not exists content (
  `key` varchar(191) primary key,
  payload json not null,
  created_at datetime not null default utc_timestamp(),
  updated_at datetime not null default utc_timestamp()
);

create table if not exists inquiries (
  id varchar(191) primary key,
  type enum('contact', 'project') not null default 'contact',
  name varchar(191) not null,
  mobile varchar(50) not null,
  email varchar(191) not null default '',
  message text not null,
  consent boolean not null default false,
  project_id varchar(191) null,
  created_at datetime not null default utc_timestamp(),
  updated_at datetime not null default utc_timestamp(),
  constraint fk_inquiries_project foreign key (project_id) references projects(id) on delete set null
);

create table if not exists reviews (
  id varchar(191) primary key,
  name varchar(191) not null,
  phone varchar(50) not null,
  rating int not null default 5,
  testimonial text not null,
  image text not null,
  created_at datetime not null default utc_timestamp(),
  updated_at datetime not null default utc_timestamp(),
  constraint chk_reviews_rating check (rating between 1 and 5)
);

create table if not exists user_favorites (
  user_id varchar(191) not null,
  property_id varchar(191) not null,
  created_at datetime not null default utc_timestamp(),
  primary key (user_id, property_id),
  constraint fk_user_favorites_user foreign key (user_id) references users(id) on delete cascade,
  constraint fk_user_favorites_property foreign key (property_id) references properties(id) on delete cascade
);

create index idx_users_role on users(role);
create index idx_users_created_at on users(created_at);
create index idx_properties_created_at on properties(created_at);
create index idx_properties_agent_id on properties(agent_id);
create index idx_properties_transaction_type on properties(transaction_type);
create index idx_properties_property_type on properties(property_type);
create index idx_properties_category on properties(category);
create index idx_properties_sub_category on properties(sub_category);
create index idx_properties_location on properties(location);
create index idx_projects_created_at on projects(created_at);
create index idx_projects_status on projects(status);
create index idx_projects_location on projects(location);
create index idx_inquiries_type on inquiries(type);
create index idx_inquiries_project_id on inquiries(project_id);
create index idx_inquiries_created_at on inquiries(created_at);
create index idx_reviews_created_at on reviews(created_at);
create index idx_user_favorites_property_id on user_favorites(property_id);
