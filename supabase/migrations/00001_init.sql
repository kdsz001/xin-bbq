-- 系统设置
create table settings (
  id serial primary key,
  key text unique not null,
  value text not null
);

-- 菜品
create table dishes (
  id uuid primary key,
  name text not null,
  price numeric not null,
  category text default '',
  is_active boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- 订单
create table orders (
  id uuid primary key,
  table_number integer not null,
  status text not null default 'open',
  created_at timestamptz default now(),
  settled_at timestamptz,
  total numeric default 0
);

-- 订单明细
create table order_items (
  id uuid primary key,
  order_id uuid references orders(id),
  dish_id uuid,
  dish_name text not null,
  price numeric not null,
  quantity integer not null,
  subtotal numeric not null
);

-- 支出
create table expenses (
  id uuid primary key,
  amount numeric not null,
  description text not null,
  category text not null,
  date date not null default current_date,
  created_at timestamptz default now()
);

-- 开放匿名访问
alter table settings enable row level security;
alter table dishes enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table expenses enable row level security;

create policy "allow all" on settings for all using (true) with check (true);
create policy "allow all" on dishes for all using (true) with check (true);
create policy "allow all" on orders for all using (true) with check (true);
create policy "allow all" on order_items for all using (true) with check (true);
create policy "allow all" on expenses for all using (true) with check (true);
