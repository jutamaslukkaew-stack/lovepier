CREATE TABLE IF NOT EXISTS preorder_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_th text NOT NULL UNIQUE,
  description_th text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'อาหารพรีออเดอร์',
  price integer,
  unit text NOT NULL DEFAULT 'ชุด',
  min_quantity integer NOT NULL DEFAULT 1,
  lead_days integer NOT NULL DEFAULT 3,
  daily_quota integer,
  cover_image_url text,
  media jsonb NOT NULL DEFAULT '[]'::jsonb,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  is_deleted boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS preorder_items_sort_order_idx ON preorder_items(sort_order);

INSERT INTO preorder_items (name_th, category, sort_order) VALUES
('ปูต้ม','อาหารทะเล',1),('ไก่แช่เหล้า','เมนูไก่',2),('ซี่โครงหมูอบ','หมูและเนื้อ',3),
('เนื้ออบ','หมูและเนื้อ',4),('หมูแดง','หมูและเนื้อ',5),('หมูกรอบ','หมูและเนื้อ',6),
('ขาหมูเยอรมัน','หมูและเนื้อ',7),('ขนมจีนน้ำยาปู','อาหารทะเล',8),('แกงหมูลูกเหลียง','หมูและเนื้อ',9),
('หมูหวานคั่วน้ำปลา','หมูและเนื้อ',10),('ทุเรียน','เบเกอรี ผลไม้ และเครื่องดื่ม',11),
('ขนมปังไส้กรอก','เบเกอรี ผลไม้ และเครื่องดื่ม',12),('แกงเขียวหวานปลาดุกทะเล','อาหารทะเล',13),
('น้ำส้มคั้น','เบเกอรี ผลไม้ และเครื่องดื่ม',14),('พะโล้','หมูและเนื้อ',15),
('ปูจ๋า','อาหารทะเล',16),('ฮ่อยจ้อ','อาหารทะเล',17),('ห่อหมกใบยอ','อาหารทะเล',18),
('ต้มยำพุงปลา','อาหารทะเล',19),('ข้าวขาหมูพะโล้','หมูและเนื้อ',20),('แกงกะหรี่ไก่','เมนูไก่',21)
ON CONFLICT (name_th) DO NOTHING;
