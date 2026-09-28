-- The customer's own pinned GPS location, captured during the delivery
-- distance check on /delivery and /preorder. Until now that fix was used
-- once (to price the delivery fee) and thrown away — delivery staff had
-- nothing but the customer's typed address, so a courier still had to phone
-- and ask which building or floor. This keeps the pin so the order card can
-- link straight to it in Google Maps.
--
-- Additive and nullable: a pickup order never has one, and neither does a
-- delivery order whose distance was replayed from a returning customer's
-- last order rather than a fresh GPS fix (see OrderFlow.js's "ใช้ที่อยู่เดิม"
-- bypass) — every existing row means exactly what it meant before.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS lat numeric(9, 6);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS lng numeric(9, 6);
