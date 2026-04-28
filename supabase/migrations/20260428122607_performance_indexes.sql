create index if not exists borrow_transactions_borrowed_at_idx
  on public.borrow_transactions(borrowed_at desc);

create index if not exists borrow_transactions_active_borrowed_at_idx
  on public.borrow_transactions(borrowed_at desc)
  where status = 'active';

create index if not exists profiles_created_at_idx
  on public.profiles(created_at desc);

create index if not exists profiles_class_level_idx
  on public.profiles(class_level);
