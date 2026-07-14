import '../config/env.js';
import connectDB, { pool } from '../config/db.js';
import logger from '../utils/logger.js';

const productsData = [
  // Cyberpunk Streetwear (10 items)
  {
    product_id: 'CYBER-ST-01',
    title: 'Neon-Glow Hannya Cyber Jacket',
    price: 4999.00,
    original_price: 7999.00,
    category: 'Cyberpunk Streetwear',
    stock: 120,
    rating: 4.85,
    reviews_count: 142,
    description: 'Immersive waterproof windbreaker embedded with custom electro-luminescent neon lining. Features detailed holographic Hannya print on back.',
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80'
  },
  {
    product_id: 'CYBER-ST-02',
    title: 'Chrome-Plated Tactical Cargo Pants',
    price: 3299.00,
    original_price: 4999.00,
    category: 'Cyberpunk Streetwear',
    stock: 95,
    rating: 4.65,
    reviews_count: 88,
    description: 'Heavyweight techwear cargo pants with modular strap attachers and liquid-chrome metallic buckle plates. Reinforced knees and water-repellent finish.',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&q=80'
  },
  {
    product_id: 'CYBER-ST-03',
    title: 'Syndicate Cyber-Assassin Cloak',
    price: 5499.00,
    original_price: 8999.00,
    category: 'Cyberpunk Streetwear',
    stock: 60,
    rating: 4.90,
    reviews_count: 54,
    description: 'Asymmetric stealth drape cloak utilizing double-weave matrix fibers. Large structural cowl hood and hidden internal holster harness pockets.',
    image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=600&q=80'
  },
  {
    product_id: 'CYBER-ST-04',
    title: 'Ghost-Grid Reflective Hoodie',
    price: 2799.00,
    original_price: 3999.00,
    category: 'Cyberpunk Streetwear',
    stock: 150,
    rating: 4.70,
    reviews_count: 110,
    description: 'Fully reflective utility hoodie embedded with high-intensity glass-bead retroreflective grids. Invisible under standard light, glows bright white under camera flash.',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=600&q=80'
  },
  {
    product_id: 'CYBER-ST-05',
    title: 'Netrunner Cyber-Kevlar Vest',
    price: 4299.00,
    original_price: 6499.00,
    category: 'Cyberpunk Streetwear',
    stock: 80,
    rating: 4.80,
    reviews_count: 67,
    description: 'Tactical body vest crafted with authentic Kevlar-weave panels and adjustable industrial velcro side adjusters. Molle system webbing for modular attachments.',
    image: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=600&q=80'
  },
  {
    product_id: 'CYBER-ST-06',
    title: 'Grid-Runner Exo Sneakers',
    price: 5999.00,
    original_price: 9999.00,
    category: 'Cyberpunk Streetwear',
    stock: 75,
    rating: 4.92,
    reviews_count: 230,
    description: 'Cyberpunk lifestyle kicks with mechanical external heels and translucent matrix traction outsoles. Quick-lace system with futuristic high-top build.',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80'
  },
  {
    product_id: 'CYBER-ST-07',
    title: 'Kuro-Obi Cyber-Ninja Joggers',
    price: 2499.00,
    original_price: 3799.00,
    category: 'Cyberpunk Streetwear',
    stock: 130,
    rating: 4.58,
    reviews_count: 95,
    description: 'Ultra-tapered techwear joggers featuring double straps and elastic calf cuffs. Made with ripstop stretch material for active agility.',
    image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=600&q=80'
  },
  {
    product_id: 'CYBER-ST-08',
    title: 'Outlaw Cyberpunk Leather Trenchcoat',
    price: 8999.00,
    original_price: 14999.00,
    category: 'Cyberpunk Streetwear',
    stock: 40,
    rating: 4.95,
    reviews_count: 42,
    description: 'Ultra-premium full-grain distressed cowhide leather trenchcoat featuring high-collar layout, neon accent stitchings, and hidden magnetic quick-release chest plates.',
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=600&q=80'
  },
  {
    product_id: 'CYBER-ST-09',
    title: 'Glitch-Art Heavy Drop-Shoulder Tee',
    price: 1499.00,
    original_price: 2299.00,
    category: 'Cyberpunk Streetwear',
    stock: 200,
    rating: 4.60,
    reviews_count: 156,
    description: 'Heavyweight 300GSM drop-shoulder cotton tee featuring custom glitch-distortion artwork silk-screened on chest and sleeves.',
    image: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=600&q=80'
  },
  {
    product_id: 'CYBER-ST-10',
    title: 'Megacity Hacktivist Windbreaker',
    price: 3499.00,
    original_price: 5499.00,
    category: 'Cyberpunk Streetwear',
    stock: 110,
    rating: 4.75,
    reviews_count: 102,
    description: 'Lightweight, packable translucent neon windbreaker with custom heat-welded seams and high-visibility digital print decals.',
    image: 'https://images.unsplash.com/photo-1554568218-0f1715e72254?auto=format&fit=crop&w=600&q=80'
  },

  // Tech Gadgets (10 items)
  {
    product_id: 'TECH-GD-01',
    title: 'Holographic Smart Wrist Terminal',
    price: 7999.00,
    original_price: 12999.00,
    category: 'Tech Gadgets',
    stock: 50,
    rating: 4.91,
    reviews_count: 88,
    description: 'Next-gen wrist band displaying physical projections and real-time vital telemetry. Integrates with system-wide interfaces seamlessly.',
    image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=600&q=80'
  },
  {
    product_id: 'TECH-GD-02',
    title: 'Apex Mechanical RGB Board',
    price: 3999.00,
    original_price: 5999.00,
    category: 'Tech Gadgets',
    stock: 85,
    rating: 4.84,
    reviews_count: 94,
    description: 'Hot-swappable custom linear switches, solid aluminium frame, and premium PBT double-shot keycaps. Beautiful custom addressable RGB.',
    image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80'
  },
  {
    product_id: 'TECH-GD-03',
    title: 'Viper Ergonomic Tech Mouse',
    price: 2499.00,
    original_price: 3799.00,
    category: 'Tech Gadgets',
    stock: 140,
    rating: 4.76,
    reviews_count: 104,
    description: 'Futuristic optical mouse with zero-latency wireless connectivity and 26,000 DPI sensor. Features ergonomic design and magnetic chargers.',
    image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=600&q=80'
  },
  {
    product_id: 'TECH-GD-04',
    title: 'AuraPods Pro ANC Earbuds',
    price: 1999.00,
    original_price: 2999.00,
    category: 'Tech Gadgets',
    stock: 180,
    rating: 4.70,
    reviews_count: 165,
    description: 'Active noise cancellation earbuds with high-fidelity acoustic chamber. Up to 36 hours total battery life with fast charge case.',
    image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=600&q=80'
  },
  {
    product_id: 'TECH-GD-05',
    title: 'Sub-Zero Bluetooth Speaker Grid',
    price: 3499.00,
    original_price: 4999.00,
    category: 'Tech Gadgets',
    stock: 90,
    rating: 4.68,
    reviews_count: 72,
    description: 'Futuristic circular audio hub with dynamic RGB pulse grids. Waterproof structure and twin bass radiators for deep acoustics.',
    image: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=600&q=80'
  },
  {
    product_id: 'TECH-GD-06',
    title: 'Tactical Bone-Conduction Visor',
    price: 6999.00,
    original_price: 9999.00,
    category: 'Tech Gadgets',
    stock: 45,
    rating: 4.88,
    reviews_count: 59,
    description: 'Sleek wraparound polarized visor with integrated bone-conduction temple audio transducers. Bluetooth 5.4 connection for HUD status reads.',
    image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=600&q=80'
  },
  {
    product_id: 'TECH-GD-07',
    title: 'Neural-Link VR Interface Band',
    price: 9999.00,
    original_price: 15999.00,
    category: 'Tech Gadgets',
    stock: 30,
    rating: 4.96,
    reviews_count: 31,
    description: 'Headband accessory reading neural delta-waves for high-immersion VR calibration. Lightweight fabric fit with cooling gel pads.',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80'
  },
  {
    product_id: 'TECH-GD-08',
    title: 'Infinity Glass Tablet Terminal',
    price: 11999.00,
    original_price: 18999.00,
    category: 'Tech Gadgets',
    stock: 25,
    rating: 4.93,
    reviews_count: 47,
    description: 'Fully transparent OLED tablet terminal with customizable neon interface presets and inductive touch controls.',
    image: 'https://images.unsplash.com/photo-1611085583191-a3b1a1e27d81?auto=format&fit=crop&w=600&q=80'
  },
  {
    product_id: 'TECH-GD-09',
    title: 'Cyberpunk LED Tech Mask v4',
    price: 4599.00,
    original_price: 6999.00,
    category: 'Tech Gadgets',
    stock: 65,
    rating: 4.80,
    reviews_count: 73,
    description: 'Cyberpunk face shield with active side filter pods and custom programmable LED front grids. Includes rechargeable battery module.',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80'
  },
  {
    product_id: 'TECH-GD-10',
    title: 'Portable Solar Power Matrix 20K',
    price: 2999.00,
    original_price: 4299.00,
    category: 'Tech Gadgets',
    stock: 120,
    rating: 4.62,
    reviews_count: 101,
    description: 'Rugged water-resistant 20,000mAh external battery featuring folding solar panel receptors and quick-charge output loops.',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80'
  },

  // Minimalist Accessories (10 items)
  {
    product_id: 'MIN-AC-01',
    title: 'Carbon-Fiber RFID Shield Cardholder',
    price: 1299.00,
    original_price: 1999.00,
    category: 'Minimalist Accessories',
    stock: 200,
    rating: 4.78,
    reviews_count: 144,
    description: 'RFID-blocking minimalist cardholder made of military-grade carbon fiber panels. Elastic cash strap holds up to 12 cards comfortably.',
    image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=600&q=80'
  },
  {
    product_id: 'MIN-AC-02',
    title: 'Titanium Magnetic Key Organizer',
    price: 999.00,
    original_price: 1499.00,
    category: 'Minimalist Accessories',
    stock: 250,
    rating: 4.65,
    reviews_count: 110,
    description: 'Sleek key organizer machined from grade 5 titanium. Silences noisy keys and organizes them inside a slim magnetic folding housing.',
    image: 'https://images.unsplash.com/photo-1605733160314-4fc7dac4bb16?auto=format&fit=crop&w=600&q=80'
  },
  {
    product_id: 'MIN-AC-03',
    title: 'Minimalist Matte-Black Steel Watch',
    price: 2999.00,
    original_price: 4499.00,
    category: 'Minimalist Accessories',
    stock: 80,
    rating: 4.83,
    reviews_count: 92,
    description: 'Clean dial design watch with zero numeric indicators. Crafted with matte-black surgical steel case and comfortable Milanese mesh strap.',
    image: 'https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=600&q=80'
  },
  {
    product_id: 'MIN-AC-04',
    title: 'Liquid-Silicon Cable Organizer Roll',
    price: 599.00,
    original_price: 899.00,
    category: 'Minimalist Accessories',
    stock: 300,
    rating: 4.54,
    reviews_count: 180,
    description: 'Soft liquid-silicon organizer roll with magnetic quick-snap closures. Safely holds and separates your chargers and cables on the go.',
    image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80'
  },
  {
    product_id: 'MIN-AC-05',
    title: 'Aero-Aluminium Minimalist Pen',
    price: 899.00,
    original_price: 1299.00,
    category: 'Minimalist Accessories',
    stock: 150,
    rating: 4.70,
    reviews_count: 76,
    description: 'Stunning writing pen machined from a single billet of aircraft-grade aluminium. Magnetic cap suspension system and premium ink refills.',
    image: 'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&w=600&q=80'
  },
  {
    product_id: 'MIN-AC-06',
    title: 'Waterproof Matte Tech Pouch',
    price: 1199.00,
    original_price: 1799.00,
    category: 'Minimalist Accessories',
    stock: 120,
    rating: 4.72,
    reviews_count: 85,
    description: 'Compact tech organizer pouch with matte polyurethane skin and weather-resistant zippers. Flexible interior mesh pockets and elastic loops.',
    image: 'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=600&q=80'
  },
  {
    product_id: 'MIN-AC-07',
    title: 'Stainless Magnetic Money Clip',
    price: 499.00,
    original_price: 799.00,
    category: 'Minimalist Accessories',
    stock: 400,
    rating: 4.45,
    reviews_count: 130,
    description: 'Industrial-grade stainless steel money clip with strong neodymium magnets. Holds up to 30 folded bills securely and slims your pockets.',
    image: 'https://images.unsplash.com/photo-1560343090-f0409e92791a?auto=format&fit=crop&w=600&q=80'
  },
  {
    product_id: 'MIN-AC-08',
    title: 'Premium Leather RFID Passport Wallet',
    price: 1799.00,
    original_price: 2799.00,
    category: 'Minimalist Accessories',
    stock: 90,
    rating: 4.80,
    reviews_count: 65,
    description: 'RFID protected travel passport wallet crafted from premium crazy-horse leather. Features card slots, passport sheath, and pen holder loops.',
    image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80'
  },
  {
    product_id: 'MIN-AC-09',
    title: 'Matte-Black Blue-Light Specs',
    price: 1499.00,
    original_price: 2199.00,
    category: 'Minimalist Accessories',
    stock: 110,
    rating: 4.67,
    reviews_count: 122,
    description: 'Lightweight TR90 composite frame glasses with blue-light filtering lenses. Reduces eye strain during long screen exposure sessions.',
    image: 'https://images.unsplash.com/photo-1501127122-f385ca6ddd96?auto=format&fit=crop&w=600&q=80'
  },
  {
    product_id: 'MIN-AC-10',
    title: 'Premium Cordura Tech Belt',
    price: 799.00,
    original_price: 1199.00,
    category: 'Minimalist Accessories',
    stock: 180,
    rating: 4.58,
    reviews_count: 84,
    description: 'Military style tactical belt crafted with authentic 1000D Cordura webbing and a quick-release heavy duty metal Cobra buckle.',
    image: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=600&q=80'
  },

  // High-Detail Artwork Apparels (10 items)
  {
    product_id: 'ART-AP-01',
    title: 'Ukiyo-e Wave Embroidered Kimono',
    price: 3999.00,
    original_price: 5999.00,
    category: 'High-Detail Artwork Apparels',
    stock: 70,
    rating: 4.94,
    reviews_count: 91,
    description: 'Stunning lightweight kimono featuring an entire back panel of high-detail traditional Japanese wave embroidery. Premium satin collar panels.',
    image: 'https://images.unsplash.com/photo-1618005198143-e5283b519a7f?auto=format&fit=crop&w=600&q=80'
  },
  {
    product_id: 'ART-AP-02',
    title: 'Cyber-Samurai High-Detail Graphic Hoodie',
    price: 2999.00,
    original_price: 4499.00,
    category: 'High-Detail Artwork Apparels',
    stock: 110,
    rating: 4.87,
    reviews_count: 115,
    description: 'Heavyweight organic cotton hoodie printed with intricate neon Cyber-Samurai graphic panels using multi-layer direct-to-garment print cycles.',
    image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=600&q=80'
  },
  {
    product_id: 'ART-AP-03',
    title: 'Ryu Dragon Embroidered Bomber',
    price: 4999.00,
    original_price: 7999.00,
    category: 'High-Detail Artwork Apparels',
    stock: 50,
    rating: 4.92,
    reviews_count: 73,
    description: 'Satin souvenir bomber jacket detailed with 150,000 stitch counts of Ryu Dragon embroidery winding along both sleeves and back panel.',
    image: 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=600&q=80'
  },
  {
    product_id: 'ART-AP-04',
    title: 'Oni-Demon Print Acid-Wash Tee',
    price: 1399.00,
    original_price: 1999.00,
    category: 'High-Detail Artwork Apparels',
    stock: 160,
    rating: 4.69,
    reviews_count: 140,
    description: 'Acid-washed loose fit heavy cotton tee featuring hand-illustrated traditional Oni-Demon graphic details in a distressed grunge style.',
    image: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=600&q=80'
  },
  {
    product_id: 'ART-AP-05',
    title: 'cyberpunk Matrix Canvas Print Set',
    price: 2499.00,
    original_price: 3999.00,
    category: 'High-Detail Artwork Apparels',
    stock: 85,
    rating: 4.78,
    reviews_count: 62,
    description: 'Three-panel high-resolution gallery canvas set displaying futuristic neon cyberpunk cityscape artwork prints on wood frames.',
    image: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=600&q=80'
  },
  {
    product_id: 'ART-AP-06',
    title: 'Geisha-Neon Premium Knit Sweater',
    price: 3299.00,
    original_price: 4999.00,
    category: 'High-Detail Artwork Apparels',
    stock: 65,
    rating: 4.85,
    reviews_count: 53,
    description: 'Ultra-soft jacquard knit sweater displaying a beautiful dual-tone Geisha portrait integrated with neon graphic stitching accents.',
    image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=600&q=80'
  },
  {
    product_id: 'ART-AP-07',
    title: 'Kanji-Detail Heavy Duty Parka',
    price: 6499.00,
    original_price: 9999.00,
    category: 'High-Detail Artwork Apparels',
    stock: 45,
    rating: 4.90,
    reviews_count: 38,
    description: 'Insulated sub-zero parka jacket adorned with high-definition reflective Kanji prints, utility buckles, and removable faux-fur hood trim.',
    image: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&w=600&q=80'
  },
  {
    product_id: 'ART-AP-08',
    title: 'Traditional Sakura Print Silk Scarf',
    price: 999.00,
    original_price: 1599.00,
    category: 'High-Detail Artwork Apparels',
    stock: 140,
    rating: 4.60,
    reviews_count: 67,
    description: 'Pure Mulberry silk scarf displaying hand-illustrated cherry blossom Sakura branches flowing gracefully across a minimalist white canvas.',
    image: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=600&q=80'
  },
  {
    product_id: 'ART-AP-09',
    title: 'Ukiyo-e Fuji Sunset Joggers',
    price: 2199.00,
    original_price: 3299.00,
    category: 'High-Detail Artwork Apparels',
    stock: 120,
    rating: 4.73,
    reviews_count: 81,
    description: 'Soft fleece joggers featuring high-resolution traditional woodblock-style Mount Fuji sunset print overlays on both leg panels.',
    image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=600&q=80'
  },
  {
    product_id: 'ART-AP-10',
    title: 'Traditional Koi Embroidered Tee',
    price: 1499.00,
    original_price: 2299.00,
    category: 'High-Detail Artwork Apparels',
    stock: 180,
    rating: 4.77,
    reviews_count: 104,
    description: 'Premium heavyweight cotton tee featuring detailed traditional Koi fish embroidery on the left chest with satin accent threads.',
    image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=600&q=80'
  }
];

async function run() {
  await connectDB();
  const connection = await pool.getConnection();
  
  try {
    logger.info('--- Launching Database Seeder Script for 40+ Products ---');
    
    // 1. Ensure product_id column exists
    const [columns] = await connection.query("SHOW COLUMNS FROM products LIKE 'product_id'");
    if (columns.length === 0) {
      logger.info('Creating product_id column in products table...');
      await connection.query('ALTER TABLE products ADD COLUMN product_id VARCHAR(100) UNIQUE NULL');
    }
    
    // 2. Perform safe Upsert (ON DUPLICATE KEY UPDATE) for each product
    for (const p of productsData) {
      // Check if product_id already exists to make operations highly idempotent
      const [existing] = await connection.query('SELECT id FROM products WHERE product_id = ? LIMIT 1', [p.product_id]);
      
      let productIdDb;
      if (existing.length > 0) {
        productIdDb = existing[0].id;
        // Update product attributes safely
        await connection.query(
          'UPDATE products SET title = ?, price = ?, original_price = ?, description = ?, rating = ?, reviews_count = ?, stock = ?, category = ? WHERE id = ?',
          [p.title, p.price, p.original_price, p.description, p.rating, p.reviews_count, p.stock, p.category, productIdDb]
        );
        logger.info(`Updated product: [${p.product_id}] ${p.title}`);
      } else {
        // Check if title already exists to prevent duplicate titles
        const [existingTitle] = await connection.query('SELECT id FROM products WHERE title = ? LIMIT 1', [p.title]);
        
        if (existingTitle.length > 0) {
          productIdDb = existingTitle[0].id;
          await connection.query(
            'UPDATE products SET product_id = ?, price = ?, original_price = ?, description = ?, rating = ?, reviews_count = ?, stock = ?, category = ? WHERE id = ?',
            [p.product_id, p.price, p.original_price, p.description, p.rating, p.reviews_count, p.stock, p.category, productIdDb]
          );
          logger.info(`Updated product_id matching title: [${p.product_id}] ${p.title}`);
        } else {
          // Insert new product record
          const [result] = await connection.query(
            'INSERT INTO products (product_id, title, price, original_price, description, rating, reviews_count, stock, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [p.product_id, p.title, p.price, p.original_price, p.description, p.rating, p.reviews_count, p.stock, p.category]
          );
          productIdDb = result.insertId;
          logger.info(`Inserted new product: [${p.product_id}] ${p.title}`);
        }
      }
      
      // 3. Sync primary product image
      const [imgExisting] = await connection.query('SELECT id FROM product_images WHERE product_id = ? AND is_primary = 1 LIMIT 1', [productIdDb]);
      if (imgExisting.length > 0) {
        await connection.query(
          'UPDATE product_images SET image_url = ? WHERE id = ?',
          [p.image, imgExisting[0].id]
        );
      } else {
        await connection.query(
          'INSERT INTO product_images (product_id, image_url, is_primary) VALUES (?, ?, 1)',
          [productIdDb, p.image]
        );
      }
    }
    
    logger.info('--- Seeding Completed Successfully! ---');
  } catch (err) {
    logger.error(err, 'Seeding products failed');
  } finally {
    connection.release();
    process.exit(0);
  }
}

run();
