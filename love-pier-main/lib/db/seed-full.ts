/**
 * Full seed — mirrors MENU_DATA in pages/menu.js exactly.
 * CLEARS existing categories + items then re-inserts everything.
 * Run:  npm run db:seed-full
 */
import { db } from './index'
import { categories, menuItems } from './schema'

type Item = {
  nameTh: string; nameEn: string; nameZh: string
  descTh?: string; descEn?: string; descZh?: string
  price: string; priceMax?: string
  image?: string; badge?: string; featured?: boolean
}
type Cat = {
  slug: string; nameTh: string; nameEn: string; nameZh: string
  items: Item[]
}

const DATA: Cat[] = [
  {
    slug: 'chicken-rice',
    nameTh: 'ข้าวมันไก่', nameEn: 'Singapore Chicken Rice', nameZh: '海南鸡饭',
    items: [
      {
        nameTh: 'เซต — ข้าวมันไก่ ขนาดเล็ก', nameEn: 'Set — Mixed Chicken · Small', nameZh: '套餐 — 小份',
        descTh: 'ไก่ต้มนุ่ม เสิร์ฟบนข้าวมันหุงกับน้ำมันไก่และใบเตย พร้อมซุปใสและน้ำจิ้ม 3 สูตร · สำหรับ 1 ท่าน',
        descEn: 'Tender poached chicken over pandan-scented rice cooked in chicken fat, with clear soup and three house sauces. Serves one.',
        descZh: '嫩滑白切鸡配香兰鸡油饭，附清汤与三款招牌蘸酱 · 一人份',
        price: '150', image: '/menu/food-set-small.png',
      },
      {
        nameTh: 'เซต — ข้าวมันไก่ ขนาดกลาง', nameEn: 'Set — Mixed Chicken · Medium', nameZh: '套餐 — 中份',
        descTh: 'ไก่ต้มนุ่ม ข้าวมันหอม ซุปใส และน้ำจิ้มครบ 3 สูตร · แบ่งทานได้ 2 ท่าน',
        descEn: 'Tender poached chicken, fragrant rice, clear soup, and three sauces — sized for two to share.',
        descZh: '嫩滑白切鸡、香鸡油饭、清汤与三款蘸酱 · 适合两人分享',
        price: '280', image: '/menu/chicken-rice-full-set.png',
      },
      {
        nameTh: 'เซต — ข้าวมันไก่ ขนาดใหญ่', nameEn: 'Set — Mixed Chicken · Large', nameZh: '套餐 — 大份',
        descTh: 'ถาดใหญ่จัดเต็ม ไก่ต้ม ข้าวมันหอม ซุปใส และน้ำจิ้ม · สำหรับ 4 ท่าน',
        descEn: 'A generous family tray of poached chicken, fragrant rice, clear soup, and sauces — serves four.',
        descZh: '丰盛家庭拼盘：白切鸡、香鸡油饭、清汤与蘸酱 · 四人份',
        price: '550', image: '/menu/food-set-large.png',
      },
      {
        nameTh: 'ข้าวมันไก่ซิกเนเจอร์ เสิร์ฟเป็นถาด', nameEn: 'Signature Chicken Rice Tray', nameZh: '招牌鸡饭拼盘',
        descTh: 'น่องสะโพกหรือเนื้ออกคัดพิเศษ บนข้าวมันหอม พร้อมซุปใสและน้ำจิ้ม 3 สูตร · ถาดซิกเนเจอร์',
        descEn: 'Premium thigh or breast on fragrant rice, with clear soup and three signature sauces — our signature tray.',
        descZh: '精选鸡腿或鸡胸配香鸡油饭，附清汤与三款招牌蘸酱 · 招牌拼盘',
        price: '670', badge: 'Signature', featured: true, image: '/menu/singaporean-chicken-rice.png',
      },
      {
        nameTh: 'ตับน้ำมันงา', nameEn: 'Sesame Oil Liver', nameZh: '麻油鸡肝',
        descTh: 'ตับไก่ลวกในน้ำมันงาหอม โรยต้นหอม เนื้อนุ่มละมุนกลิ่นหอม',
        descEn: 'Chicken liver gently poached in fragrant sesame oil and finished with spring onion — silky and aromatic.',
        descZh: '鸡肝以香麻油轻煮，撒上葱花，滑嫩浓香',
        price: '150', image: '/menu/food-sesame-oil-liver.png',
      },
      {
        nameTh: 'เลือดไก่ต้ม', nameEn: 'Boiled Chicken Blood', nameZh: '白煮鸡血',
        descTh: 'เลือดไก่ต้มเนื้อนุ่ม สะอาด รสละมุน · เครื่องเคียงสไตล์ไหหลำ',
        descEn: 'Softly boiled chicken blood, clean and delicate — a classic Hainanese side.',
        descZh: '白煮鸡血，软嫩干净，经典海南配菜',
        price: '100', image: '/menu/food-chicken-blood.png',
      },
      {
        nameTh: 'ข้าวมัน', nameEn: 'Chicken Rice', nameZh: '鸡油饭',
        descTh: 'ข้าวหุงกับน้ำมันไก่ กระเทียม และใบเตย จนหอมเป็นมันวาว',
        descEn: 'Rice simmered in chicken fat, garlic, and pandan until fragrant and glossy.',
        descZh: '米饭以鸡油、蒜与香兰焖煮至油亮喷香',
        price: '35', image: '/menu/food-chicken-rice-bowl.png',
      },
      {
        nameTh: 'น้ำจิ้มพริกส้มขิง', nameEn: 'Orange Chili Ginger Sauce', nameZh: '橘子辣椒姜蘸酱',
        descTh: 'น้ำจิ้มพริกส้มผสมขิงและกระเทียม รสเปรี้ยวเผ็ดสดชื่น',
        descEn: 'Bright orange-chili sauce with garlic and ginger — tangy, spicy, and fresh.',
        descZh: '橘子辣椒姜蘸酱，蒜香浓郁，酸辣清新',
        price: '25', image: '/menu/food-orange-chili-sauce.png',
      },
      {
        nameTh: 'น้ำจิ้มน้ำมันขิง', nameEn: 'Ginger Oil Sauce', nameZh: '姜油蘸酱',
        descTh: 'ขิงอ่อนโขลกกับน้ำมันอุ่น กลิ่นหอม รสนุ่มเย็น',
        descEn: 'Pounded young ginger in warm oil — mild, fragrant, and cooling.',
        descZh: '嫩姜捣入温油，温和清香',
        price: '25', image: '/menu/food-ginger-oil-sauce.png',
      },
      {
        nameTh: 'น้ำจิ้มเต้าเจี๊ยว + ขิง + พริกสด', nameEn: 'Soybean Paste Dipping Sauce', nameZh: '豆酱蘸酱',
        descTh: 'เต้าเจี้ยวหมักผสมขิงและพริกสด รสกลมกล่อมเข้มข้น',
        descEn: 'Fermented soybean paste with ginger and fresh chili — savory and bold.',
        descZh: '发酵豆酱配姜与鲜辣椒，咸香浓郁',
        price: '25', image: '/menu/food-soybean-paste-sauce.png',
      },
      {
        nameTh: 'น้ำจิ้มต่างๆ ทานที่ร้าน', nameEn: 'Dine-in Dipping Sauces', nameZh: '堂食蘸酱',
        descTh: 'น้ำจิ้ม 3 สูตรของร้าน เติมได้ไม่อั้นสำหรับทานที่ร้าน',
        descEn: 'A trio of house dipping sauces, refilled freely for dine-in guests.',
        descZh: '三款招牌蘸酱，堂食免费续添',
        price: '0', image: '/menu/food-dipping-sauces.png',
      },
    ],
  },
  {
    slug: 'breakfast',
    nameTh: 'อาหารเช้า', nameEn: 'Breakfast All Day', nameZh: '早餐全天供应',
    items: [
      {
        nameTh: 'เพียร์เบรกฟาสต์เพลต', nameEn: 'Pier Breakfast Plate', nameZh: 'Pier 早午餐拼盘',
        descTh: 'ไข่ 2 ฟอง ซาวโดว์ อะโวคาโด แซลมอนรมควัน และผักสด',
        descEn: 'Two eggs any style, sourdough, avocado, smoked salmon, and garden greens.',
        descZh: '两颗蛋、酸种面包、牛油果、烟熏三文鱼与鲜蔬。',
        price: '280', badge: 'Signature', featured: true, image: '/menu/food-pier-breakfast.png',
      },
      {
        nameTh: 'แซนด์วิชแซลมอนรมควัน', nameEn: 'Smoked Salmon Sandwich', nameZh: '烟熏三文鱼三明治',
        descTh: 'ครีมชีส แตงกวา ดิล บนขนมปังซาวโดว์ปิ้ง',
        descEn: 'Smoked salmon, cream cheese, cucumber, and dill on toasted sourdough.',
        descZh: '烟熏三文鱼、奶油芝士、黄瓜与莳萝，配烤酸种面包。',
        price: '240',
      },
      {
        nameTh: 'แซนด์วิชไก่อะโวคาโด', nameEn: 'Chicken & Avocado Ciabatta', nameZh: '鸡肉牛油果夏巴塔',
        descTh: 'ไก่ย่าง อะโวคาโด มะเขือเทศ มายองเนสสมุนไพร บนขนมปังเซียบัตตา',
        descEn: 'Grilled chicken, avocado, tomato, and herb mayo on ciabatta.',
        descZh: '烤鸡、牛油果、番茄与香草蛋黄酱，配夏巴塔。',
        price: '220',
      },
      {
        nameTh: 'เอ้กเบเนดิกต์', nameEn: 'Eggs Benedict', nameZh: '班尼迪克蛋',
        descTh: 'ไข่ลวก บริยอช แฮม และซอสฮอลแลนเดส',
        descEn: 'Poached eggs, brioche, ham, and lemon hollandaise.',
        descZh: '水波蛋、布里欧修、火腿与荷兰酱。',
        price: '260',
      },
      {
        nameTh: 'โคโคนัทกราโนล่าโบวล์', nameEn: 'Coconut Granola Bowl', nameZh: '椰子麦片碗',
        descTh: 'กราโนล่าโฮมเมด โยเกิร์ตมะพร้าว ผลไม้ตามฤดูกาล และน้ำผึ้ง',
        descEn: 'House granola, coconut yogurt, seasonal fruit, and honey.',
        descZh: '自制麦片、椰子酸奶、时令水果与蜂蜜。',
        price: '220',
      },
    ],
  },
  {
    slug: 'coffee',
    nameTh: 'กาแฟ', nameEn: 'Coffee', nameZh: '咖啡',
    items: [
      {
        nameTh: 'อเมริกาโน่', nameEn: 'Americano', nameZh: '美式',
        descTh: 'เอสเพรสโซผสมน้ำร้อน รสสะอาด หอมกลม ดื่มง่าย',
        descEn: 'Espresso lengthened with hot water — clean, bright, and easy to sip.',
        descZh: '浓缩加热水，口感干净明亮，顺口好饮。',
        price: '90', priceMax: '100', image: '/menu/real-americano.jpg',
      },
      {
        nameTh: 'เอสเพรสโซ่', nameEn: 'Espresso', nameZh: '浓缩',
        descTh: 'ช็อตเข้มข้น ดึงสดทุกแก้ว',
        descEn: 'A short, intense shot pulled fresh to order.',
        descZh: '短萃浓烈，现点现做。',
        price: '80', priceMax: '135', image: '/menu/real-espresso.jpg',
      },
      {
        nameTh: 'คาปูชิโน่', nameEn: 'Cappuccino', nameZh: '卡布奇诺',
        descTh: 'สูตรคลาสสิก เอสเพรสโซ นมสตีม และฟองนมสมดุล',
        descEn: 'Classic espresso, steamed milk, and foam in equal parts.',
        descZh: '经典浓缩、蒸奶与奶泡，比例均衡。',
        price: '90', priceMax: '135', image: '/menu/real-cappuccino.jpg',
      },
      {
        nameTh: 'ลาเต้', nameEn: 'Latte', nameZh: '拿铁',
        descTh: 'ดับเบิลเอสเพรสโซกับนมสตีม นุ่มละมุน',
        descEn: 'Double espresso with steamed milk, smooth and mellow.',
        descZh: '双份浓缩配蒸奶，顺滑柔和。',
        price: '90', priceMax: '135', image: '/menu/real-latte.jpg',
      },
      {
        nameTh: 'มอคค่า', nameEn: 'Mocca', nameZh: '摩卡',
        descTh: 'เอสเพรสโซ ช็อกโกแลต และนม หอมเข้มโรยโกโก้',
        descEn: 'Espresso, chocolate, and steamed milk finished with cocoa.',
        descZh: '浓缩、巧克力与蒸奶，撒可可粉。',
        price: '90', priceMax: '135', image: '/menu/drink-mocca-2.png',
      },
      {
        nameTh: 'คาราเมลมัคคิอาโต', nameEn: 'Caramel Macchiato', nameZh: '焦糖玛奇朵',
        descTh: 'เอสเพรสโซ คาราเมล และนมสตีม หวานนุ่มกลมกล่อม',
        descEn: 'Espresso marked with caramel and silky steamed milk.',
        descZh: '浓缩、焦糖与蒸奶，香甜细腻。',
        price: '100', priceMax: '145', image: '/menu/caramel-macchiato.jpg',
      },
      {
        nameTh: 'เดอร์ตี้', nameEn: 'Dirty', nameZh: 'Dirty 咖啡',
        descTh: 'นมเย็นท็อปด้วยเอสเพรสโซร้อน ชั้นชัด รสเข้มแต่ลื่น',
        descEn: 'Chilled milk topped with hot espresso — layered, bold, and smooth.',
        descZh: '冰牛奶上浇热浓缩，层次分明。',
        price: '179', badge: 'Signature', image: '/menu/real-dirty-coffee.jpg',
      },
      {
        nameTh: 'ซอฟท์คอฟฟี่ลาเต้', nameEn: 'Soft Coffee Latte', nameZh: '软咖啡拿铁',
        descTh: 'กาแฟนมเนื้อเบา รสนุ่ม หวานน้อย ดื่มง่าย',
        descEn: 'Gentle espresso and milk, light-bodied and softly sweet.',
        descZh: '轻柔咖啡拿铁，口感轻盈、微甜顺口。',
        price: '150', image: '/menu/soft-coffee-latte.jpg',
      },
      {
        nameTh: 'ยูซุแบล็คคอฟฟี่', nameEn: 'Yuzu Black Coffee', nameZh: '柚子黑咖啡',
        descTh: 'อเมริกาโน่เย็นผสมยูซุ เปรี้ยวสดชื่น กลิ่นกาแฟสะอาด',
        descEn: 'Iced americano with yuzu — bright citrus over a clean coffee base.',
        descZh: '冰美式配柚子，柑橘明亮，咖啡干净。',
        price: '140', image: '/menu/yuzu-americano.jpg',
      },
      {
        nameTh: 'ออเรนจ์แบล็คคอฟฟี่', nameEn: 'Orange Black Coffee', nameZh: '橙子黑咖啡',
        descTh: 'อเมริกาโน่เย็นผสมน้ำส้มสด หอมเปรี้ยว สดชื่น',
        descEn: 'Iced americano with fresh orange — fruity, tangy, and refreshing.',
        descZh: '冰美式配鲜橙汁，果香酸甜，清爽解渴。',
        price: '140', image: '/menu/real-orange-americano.jpg',
      },
      {
        nameTh: 'โคโคนัทคอฟฟี่', nameEn: 'Coconut Coffee', nameZh: '椰子咖啡',
        descTh: 'อเมริกาโน่เย็นผสมมะพร้าว หอมท็อปปิคอล นุ่มลื่น',
        descEn: 'Iced americano with coconut — tropical, creamy, and beach-ready.',
        descZh: '冰美式配椰子，热带椰香，顺滑耐喝。',
        price: '140', image: '/menu/real-coconut-americano.jpg',
      },
    ],
  },
  {
    slug: 'matcha',
    nameTh: 'มัทฉะ', nameEn: 'Matcha', nameZh: '抹茶',
    items: [
      {
        nameTh: 'PANG Signature', nameEn: 'PANG Signature', nameZh: 'PANG 招牌',
        descTh: 'มัทฉะ x ข้าวหลามหนองมน ลาเต้ — สูตรซิกเนเจอร์เฉพาะร้าน',
        descEn: 'Matcha x Khao Lam Latte — our house signature blend.',
        descZh: '抹茶 x 烤糯米香拿铁 — 门店招牌特调，层次丰富、顺口耐喝。',
        price: '179', badge: 'Signature', featured: true, image: '/menu/real-pang-signature.jpg',
      },
      {
        nameTh: 'เพียวมัทฉะ', nameEn: 'Pure Matcha', nameZh: '纯抹茶',
        descTh: 'มัทฉะพรีเมียมตีฟองแบบเพียว หอมเขียว เข้มข้น รสสะอาด',
        descEn: 'Premium matcha whisked pure — rich, grassy, and clean.',
        descZh: '精品抹茶纯饮，茶香浓郁，口感干净。',
        price: '140', image: '/menu/real-pure-matcha.jpg',
      },
      {
        nameTh: 'มัทฉะลาเต้', nameEn: 'Matcha Latte', nameZh: '抹茶拿铁',
        descTh: 'มัทฉะผสมนมสตีม เนื้อนุ่ม รสกลมกล่อม',
        descEn: 'Matcha with steamed milk, smooth and balanced.',
        descZh: '抹茶与蒸奶，顺滑平衡。',
        price: '150', image: '/menu/real-matcha-latte.jpg',
      },
      {
        nameTh: 'เดอร์ตี้มัทฉะ', nameEn: 'Dirty Matcha', nameZh: 'Dirty 抹茶',
        descTh: 'นมเย็นท็อปมัทฉะ ชั้นชัด รสเข้มแต่ลื่น',
        descEn: 'Chilled milk topped with matcha — layered, bold, and smooth.',
        descZh: '冰牛奶上浇抹茶，层次分明。',
        price: '150', image: '/menu/real-dirty-matcha-v2.jpg',
      },
      {
        nameTh: 'โคโคนัทมัทฉะ', nameEn: 'Coconut Matcha', nameZh: '椰子抹茶',
        descTh: 'มัทฉะผสมมะพร้าว หอมครีมมี่ ท็อปปิคอลนุ่มละมุน',
        descEn: 'Matcha with coconut — creamy, tropical, and gently sweet.',
        descZh: '抹茶配椰子，椰香细腻，热带顺口。',
        price: '150', image: '/menu/real-matcha-coconut.jpg',
      },
      {
        nameTh: 'ออเรนจ์มัทฉะ', nameEn: 'Orange Matcha', nameZh: '橙子抹茶',
        descTh: 'มัทฉะผสมส้มสด เปรี้ยวหอม สดชื่น',
        descEn: 'Matcha with fresh orange — bright, tangy, and refreshing.',
        descZh: '抹茶配鲜橙，果香酸甜，清爽解渴。',
        price: '150', image: '/menu/real-matcha-yuzu.jpg',
      },
      {
        nameTh: 'มัทฉะยูซุ', nameEn: 'Matcha Yuzu', nameZh: '柚子抹茶',
        descTh: 'มัทฉะผสมยูซุ กลิ่นส้มซ่า สดกลมกล่อม',
        descEn: 'Matcha with yuzu — citrusy, aromatic, and crisp.',
        descZh: '抹茶配柚子，柑橘明亮，香气清新。',
        price: '150', image: '/menu/matcha-orange.jpg',
      },
      {
        nameTh: 'ซอฟท์มัทฉะ', nameEn: 'Soft Matcha', nameZh: '软抹茶',
        descTh: 'มัทฉะสูตรซอฟท์ เนื้อเบา หวานน้อย ดื่มง่าย',
        descEn: 'Soft matcha blend — light-bodied, mellow, and easy to drink.',
        descZh: '轻柔抹茶，口感轻盈，微甜顺口。',
        price: '160', image: '/menu/real-soft-matcha.jpg',
      },
    ],
  },
  {
    slug: 'non-coffee',
    nameTh: 'เครื่องดื่มไม่มีกาแฟ', nameEn: 'Non Coffee', nameZh: '无咖啡饮品',
    items: [
      {
        nameTh: 'ชาไทยพรีเมียม', nameEn: 'Premium Thai Tea', nameZh: '泰式奶茶',
        descTh: 'ชาไทยพรีเมี่ยมเย็น หอมเครื่องเทศ รสเข้มกลมกล่อม',
        descEn: 'Premium Thai tea, iced — rich, aromatic, and classic.',
        descZh: '精品泰式冰茶，茶香浓郁，经典顺口。',
        price: '100', image: '/menu/real-thai-tea.jpg',
      },
      {
        nameTh: 'ชาไทยปั่น', nameEn: 'Thai Tea Frappe', nameZh: '泰茶冰沙',
        descTh: 'ชาไทยปั่น เนื้อเนียน เย็นจัด หวานมันกำลังดี',
        descEn: 'Thai tea blended smooth with ice.',
        descZh: '泰茶冰沙，细腻冰爽，甜润均衡。',
        price: '120', image: '/menu/real-thai-tea-frappe.jpg',
      },
      {
        nameTh: 'ช็อกโกแลต', nameEn: 'Chocolate', nameZh: '巧克力',
        descTh: 'ช็อกโกแลตเย็น โกโก้เข้ม รสนุ่มครีมมี่',
        descEn: 'Iced chocolate — deep cocoa, creamy finish.',
        descZh: '冰巧克力，可可浓郁，口感顺滑。',
        price: '100', image: '/menu/real-chocolate.jpg',
      },
      {
        nameTh: 'ช็อกโกแลตปั่น', nameEn: 'Chocolate Frappe', nameZh: '巧克力冰沙',
        descTh: 'ช็อกโกแลตปั่น เนื้อหนา เย็นสดชื่น',
        descEn: 'Chocolate blended frappe — thick, cold, and indulgent.',
        descZh: '巧克力冰沙，绵密冰爽，甜而不腻。',
        price: '120', image: '/menu/drink-chocolate-frappe.png',
      },
      {
        nameTh: 'โคโคนัทมิลค์เฟรปเป้', nameEn: 'Coconut Milk Frappe', nameZh: '椰奶冰沙',
        descTh: 'มะพร้าวนมสดปั่น หอมมะพร้าว ครีมมี่ หวานน้อย',
        descEn: 'Fresh coconut milk blended — creamy, tropical, lightly sweet.',
        descZh: '鲜椰奶冰沙，椰香细腻，热带清甜。',
        price: '120', image: '/menu/coconut-milk-smoothie.jpg',
      },
    ],
  },
  {
    slug: 'italian-soda',
    nameTh: 'อิตาเลียนโซดา', nameEn: 'Italian Soda', nameZh: '意式苏打',
    items: [
      {
        nameTh: 'เลมอนฮันนี่โซดา', nameEn: 'Lemon Honey Soda', nameZh: '柠檬蜂蜜苏打',
        descTh: 'โซดาเลมอนผสมน้ำผึ้ง เปรี้ยวหวานสดชื่น',
        descEn: 'Sparkling soda with lemon and honey — bright and gently sweet.',
        descZh: '柠檬蜂蜜苏打，酸甜明亮，清爽顺口。',
        price: '120', image: '/menu/honey-lemon-soda.jpg',
      },
      {
        nameTh: 'ยูซุโซดา', nameEn: 'Yuzu Soda', nameZh: '柚子苏打',
        descTh: 'โซดายูซุ กลิ่นส้มซ่า เนื้อผลสด ดื่มเย็นสดชื่น',
        descEn: 'Yuzu soda with citrus pulp — tangy, aromatic, refreshing.',
        descZh: '柚子苏打，果香清新，冰爽解渴。',
        price: '120', image: '/menu/yuzu-soda.jpg',
      },
      {
        nameTh: 'สตรอเบอร์รี่โซดา', nameEn: 'Strawberry Soda', nameZh: '草莓苏打',
        descTh: 'โซดาสตรอเบอร์รี่ หอมผลไม้ สีสด รสหวานอมเปรี้ยว',
        descEn: 'Strawberry soda — fruity, vibrant, and ice-cold.',
        descZh: '草莓苏打，果味鲜明，冰凉甜美。',
        price: '120', image: '/menu/strawberry-soda.jpg',
      },
      {
        nameTh: 'ลิ้นจี่โซดา', nameEn: 'Lychee Soda', nameZh: '荔枝苏打',
        descTh: 'โซดาลิ้นจี่ หอมดอกไม้ หวานกลมกล่อม',
        descEn: 'Lychee soda — floral, sweet, and crystal clear.',
        descZh: '荔枝苏打，花香清甜，透亮爽口。',
        price: '120',
      },
      {
        nameTh: 'บลูโอเชียนโซดา', nameEn: 'Blue Ocean Soda', nameZh: '蓝色海洋苏打',
        descTh: 'โซดาบลูโอเชียน ชั้นสีฟ้า หวานสดชื่น ดื่มง่าย',
        descEn: 'Blue ocean soda — layered blue, tropical, and eye-catching.',
        descZh: '蓝色海洋苏打，层次分明，热带清爽。',
        price: '120', image: '/menu/blue-ocean-soda.jpg',
      },
    ],
  },
  {
    slug: 'other',
    nameTh: 'อื่นๆ', nameEn: 'Other', nameZh: '其他',
    items: [
      {
        nameTh: 'น้ำดื่มเพอร์ร่า', nameEn: 'Purra Water', nameZh: 'Purra 饮用水',
        descTh: 'น้ำดื่มเพอร์ร่า', descEn: 'Purra drinking water.', descZh: 'Purra 饮用水。',
        price: '20',
      },
      {
        nameTh: 'น้ำแร่เอเวียง', nameEn: 'Evian Mineral Water', nameZh: '依云矿泉水',
        descTh: 'น้ำแร่เอเวียง', descEn: 'Evian mineral water.', descZh: '依云矿泉水。',
        price: '60',
      },
      {
        nameTh: 'โค้ก', nameEn: 'Coke', nameZh: '可口可乐',
        descTh: 'โค้กเย็น', descEn: 'Coca-Cola, chilled.', descZh: '冰镇可口可乐。',
        price: '40',
      },
      {
        nameTh: 'โค้กซีโร่', nameEn: 'Coke Zero', nameZh: '零度可乐',
        descTh: 'โค้กซีโร่เย็น', descEn: 'Coca-Cola Zero, chilled.', descZh: '冰镇零度可乐。',
        price: '40',
      },
    ],
  },
  {
    slug: 'sweets',
    nameTh: 'ของหวาน', nameEn: 'Sweet Desserts', nameZh: '甜点',
    items: [
      {
        nameTh: 'เค้กมะพร้าว', nameEn: 'Coconut Cake', nameZh: '椰香蛋糕',
        descTh: 'เค้กมะพร้าวเนื้อนุ่ม ครีมหอมมะพร้าว โรยมะพร้าวคั่ว',
        descEn: 'Fluffy coconut sponge with cream and toasted coconut — light, tropical, and fragrant.',
        descZh: '椰香海绵蛋糕配奶油与烤椰丝，轻盈热带。',
        price: '150', image: '/menu/dessert-coconut-cake.png',
      },
      {
        nameTh: 'สตรอเบอร์รี่ชีสพาย', nameEn: 'Strawberry Cheese Pie', nameZh: '草莓芝士派',
        descTh: 'ชีสพายครีมชีส ท็อปสตรอเบอร์รี่สด ซอสผลไม้เงาใส',
        descEn: 'Cream cheese pie topped with fresh strawberries and glossy berry glaze.',
        descZh: '芝士派配新鲜草莓与亮面莓果酱。',
        price: '189', image: '/menu/dessert-strawberry-cheese-pie.png',
      },
      {
        nameTh: 'บลูเบอร์รี่ชีสพาย', nameEn: 'Blueberry Cheese Pie', nameZh: '蓝莓芝士派',
        descTh: 'ชีสพายครีมชีส ท็อปบลูเบอร์รี่เข้มข้น เปรี้ยวหวานกลมกล่อม',
        descEn: 'Cream cheese pie with a thick blueberry compote — tangy, sweet, and rich.',
        descZh: '芝士派配浓郁蓝莓酱，酸甜饱满。',
        price: '189', image: '/menu/dessert-blueberry-cheese-pie.png',
      },
      {
        nameTh: 'เค้กช็อกโกแลต', nameEn: 'Chocolate Cake', nameZh: '巧克力蛋糕',
        descTh: 'เค้กช็อกโกแลตชั้นละมุน โกโก้เข้ม หวานน้อยพอดี',
        descEn: 'Dark chocolate layer cake — moist, deep cocoa, and indulgent.',
        descZh: '巧克力层蛋糕，湿润浓郁，可可香气足。',
        price: '140', image: '/menu/dessert-chocolate-cake.png',
      },
      {
        nameTh: 'บานอฟฟี่', nameEn: 'Banoffee', nameZh: '班夫蛋糕',
        descTh: 'บานอฟฟี่เลเยอร์กล้วย คาราเมล บิสกิต และวิปครีม',
        descEn: 'Banana, caramel, biscuit base, and whipped cream — classic banoffee in a glass.',
        descZh: '香蕉焦糖、饼干底与鲜奶油，经典班夫风味。',
        price: '150', image: '/menu/dessert-banoffee.png',
      },
      {
        nameTh: 'เรดเวลเวท', nameEn: 'Red Velvet Cake', nameZh: '红丝绒蛋糕',
        descTh: 'เรดเวลเวทนุ่ม ฟรอสติ้งครีมชีส รสกลมกล่อม',
        descEn: 'Red velvet with cream cheese frosting — soft crumb, gentle cocoa, and balanced sweetness.',
        descZh: '红丝绒配奶油芝士霜，口感柔软，甜度均衡。',
        price: '130', image: '/menu/dessert-red-velvet.png',
      },
      {
        nameTh: 'เค้กส้ม', nameEn: 'Orange Cake', nameZh: '橙子蛋糕',
        descTh: 'เค้กส้มชั้นนุ่ม น้ำส้มหอม เปรี้ยวหวานสดชื่น',
        descEn: 'Orange layer cake with citrus glaze — bright, moist, and refreshing.',
        descZh: '橙子层蛋糕配柑橘淋面，清新湿润。',
        price: '90', image: '/menu/dessert-orange-cake.png',
      },
      {
        nameTh: 'ทาร์ตไข่', nameEn: 'Egg Tart', nameZh: '蛋挞',
        descTh: 'ทาร์ตไข่กรอบนอก เนื้อคัสตาร์ดเนียน หอมเนย',
        descEn: 'Golden egg tarts with buttery pastry and silky custard.',
        descZh: '金黄蛋挞，酥皮黄油香，内馅丝滑。',
        price: '55', image: '/menu/dessert-egg-tart.png',
      },
      {
        nameTh: 'ทีรามิสุ', nameEn: 'Tiramisu', nameZh: '提拉米苏',
        descTh: 'ทีรามิสุชั้นเอสเพรสโซ ครีมมาสคาร์โพนี โรยโกโก้',
        descEn: 'Espresso-soaked layers, mascarpone cream, and cocoa — smooth and aromatic.',
        descZh: '浓缩咖啡浸润层次，马斯卡彭奶油，可可香气。',
        price: '150', image: '/menu/dessert-tiramisu.png',
      },
      {
        nameTh: 'สตรอเบอร์รี่ชอร์ตเค้ก', nameEn: 'Strawberry Shortcake', nameZh: '草莓短蛋糕',
        descTh: 'ชอร์ตเค้กสตรอเบอร์รี่ สดใส หวานพอดี',
        descEn: 'Strawberry shortcake — light, fresh, and simply sweet.',
        descZh: '草莓短蛋糕，清新甜美。',
        price: '150', image: '/menu/dessert-strawberry-shortcake.png',
      },
    ],
  },
]

async function main() {
  console.log('🗑️  Clearing existing data...')
  await db.delete(menuItems)
  await db.delete(categories)

  console.log('🌱 Seeding categories and menu items...')
  let catOrder = 0
  for (const cat of DATA) {
    const [inserted] = await db
      .insert(categories)
      .values({
        slug: cat.slug,
        nameTh: cat.nameTh,
        nameEn: cat.nameEn,
        nameZh: cat.nameZh,
        sortOrder: ++catOrder,
      })
      .returning({ id: categories.id })

    let itemOrder = 0
    for (const it of cat.items) {
      await db.insert(menuItems).values({
        categoryId: inserted.id,
        nameTh: it.nameTh,
        nameEn: it.nameEn,
        nameZh: it.nameZh,
        descriptionTh: it.descTh ?? null,
        descriptionEn: it.descEn ?? null,
        descriptionZh: it.descZh ?? null,
        price: it.price,
        priceMax: it.priceMax ?? null,
        badge: it.badge ?? null,
        imageUrl: it.image ?? null,
        isFeatured: it.featured ?? false,
        isAvailable: true,
        sortOrder: ++itemOrder,
      })
    }
    console.log(`  ✅ ${cat.nameEn} — ${cat.items.length} items`)
  }
  console.log('🎉 Done!')
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1) })
