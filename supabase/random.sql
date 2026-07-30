select
    h.created_at,
    h.name,
    (select count(*) from profiles    p  where p.household_id  = h.id) as members,
    (select count(*) from stores      s  where s.household_id  = h.id) as stores,
    (select count(*) from list_items  li where li.household_id = h.id) as items
from households h
order by h.created_at;