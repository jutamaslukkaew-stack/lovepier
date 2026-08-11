-- Explicit delivery-method choice (customer picks "shop delivers" vs "pickup
-- at the shop") instead of it being an implicit side effect of the distance
-- check. Additive + guarded, applied directly like 0002/0003.
--
-- default 'delivery' matches every order placed before this column existed
-- (the old flow only ever behaved like shop-delivery within the radius).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_method text NOT NULL DEFAULT 'delivery';
