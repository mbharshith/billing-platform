// FIXTURE - demo product catalog. Scrap when the real backend is live.

// Thematic catalogs per tenant (fashion / restaurant / boutique) so multi-tenancy is obvious.
import type { Product } from '@shared/domain/types';
import {
  SEED_STORE_MAIN_ID, SEED_STORE_BRANCH_ID, SEED_STORE_THIRD_ID,
} from './stores';

const NOW = new Date().toISOString();

const p = (
  id: string, sku: string, name: string, price: number,
  category: Product['category'], tone: Product['tone'], stock: number,
  storeId: string, image?: string,
): Product => ({ id, sku, name, price, category, tone, stock, active: true, createdAt: NOW, storeId, ...(image && { image }) });

// Velvet Mumbai - luxury Indian fashion
const VELVET: readonly Product[] = [
  p('v01', 'LUX-0001', 'Silk Embroidered Kurta',      3999, 'Personal', 'rose',   20, SEED_STORE_MAIN_ID, 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=400&q=80'),
  p('v02', 'LUX-0002', 'Designer Lehenga Set',       18999, 'Personal', 'rose',    8, SEED_STORE_MAIN_ID, 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80'),
  p('v03', 'LUX-0003', 'Kashmiri Pashmina Shawl',     5499, 'Personal', 'stone',  15, SEED_STORE_MAIN_ID, 'https://images.unsplash.com/photo-1551232864-3f0890e580d9?w=400&q=80'),
  p('v04', 'LUX-0004', 'Block Print Co-ord Set',      4999, 'Personal', 'amber',  18, SEED_STORE_MAIN_ID, 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&q=80'),
  p('v05', 'LUX-0005', 'Handloom Linen Saree',        8999, 'Personal', 'sky',    10, SEED_STORE_MAIN_ID, 'https://images.unsplash.com/photo-1594938298603-c8148c4b4057?w=400&q=80'),
  p('v06', 'ACC-0001', 'Zardozi Embroidered Dupatta', 2499, 'Other',    'amber',  25, SEED_STORE_MAIN_ID, 'https://images.unsplash.com/photo-1583391733981-8698e2d80fd2?w=400&q=80'),
  p('v07', 'ACC-0002', 'Pearl Drop Earrings',         1999, 'Other',    'amber',  30, SEED_STORE_MAIN_ID, 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&q=80'),
  p('v08', 'ACC-0003', 'Leather Tote Bag',            6999, 'Other',    'brown',  12, SEED_STORE_MAIN_ID, 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80'),
  p('v09', 'FTW-0001', 'Kolhapuri Wedges',            2999, 'Other',    'orange', 16, SEED_STORE_MAIN_ID, 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&q=80'),
  p('v10', 'FTW-0002', 'Embellished Heels',           4499, 'Other',    'rose',   14, SEED_STORE_MAIN_ID, 'https://images.unsplash.com/photo-1596703263926-eb0762ee17e4?w=400&q=80'),
];

// Spice Route Kitchen - Indian non-veg restaurant menu
const SPICE_ROUTE: readonly Product[] = [
  p('r01', 'MNU-0001', 'Chicken Tikka',              380, 'Snacks',    'red',    999, SEED_STORE_BRANCH_ID, 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&q=80'),
  p('r02', 'MNU-0002', 'Mutton Seekh Kebab',         420, 'Snacks',    'brown',  999, SEED_STORE_BRANCH_ID, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80'),
  p('r03', 'MNU-0003', 'Fish Amritsari',             360, 'Snacks',    'amber',  999, SEED_STORE_BRANCH_ID, 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&q=80'),
  p('r04', 'MNU-0004', 'Prawn Masala',               520, 'Meat',      'orange', 999, SEED_STORE_BRANCH_ID, 'https://images.unsplash.com/photo-1596815706826-5f6cd559e0a6?w=400&q=80'),
  p('r05', 'MNU-0005', 'Butter Chicken',             480, 'Meat',      'amber',  999, SEED_STORE_BRANCH_ID, 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&q=80'),
  p('r06', 'MNU-0006', 'Mutton Rogan Josh',          560, 'Meat',      'red',    999, SEED_STORE_BRANCH_ID, 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=400&q=80'),
  p('r07', 'MNU-0007', 'Chicken Biryani',            450, 'Other',     'yellow', 999, SEED_STORE_BRANCH_ID, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&q=80'),
  p('r08', 'MNU-0008', 'Mutton Biryani',             580, 'Other',     'stone',  999, SEED_STORE_BRANCH_ID, 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400&q=80'),
  p('r09', 'MNU-0009', 'Tandoori Chicken Half',      620, 'Meat',      'orange', 999, SEED_STORE_BRANCH_ID, 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&q=80'),
  p('r10', 'MNU-0010', 'Dal Makhani',                280, 'Other',     'brown',  999, SEED_STORE_BRANCH_ID, 'https://images.unsplash.com/photo-1626500155159-cbfb9a5661a3?w=400&q=80'),
  p('r11', 'BEV-0001', 'Mango Lassi',                120, 'Beverages', 'yellow', 999, SEED_STORE_BRANCH_ID, 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=400&q=80'),
  p('r12', 'BEV-0002', 'Masala Chai',                 60, 'Beverages', 'amber',  999, SEED_STORE_BRANCH_ID, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&q=80'),
];

// La Maison Boutique - luxury fashion, SoHo New York
const LA_MAISON: readonly Product[] = [
  p('b01', 'BTQ-0001', 'Italian Merino Blazer',       389, 'Personal', 'slate',  8,  SEED_STORE_THIRD_ID, 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&q=80'),
  p('b02', 'BTQ-0002', 'French Linen Dress',          289, 'Personal', 'sky',    12, SEED_STORE_THIRD_ID, 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400&q=80'),
  p('b03', 'BTQ-0003', 'Cashmere Turtleneck',         249, 'Personal', 'stone',  15, SEED_STORE_THIRD_ID, 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=400&q=80'),
  p('b04', 'BTQ-0004', 'Wide-Leg Silk Trousers',      329, 'Personal', 'amber',  10, SEED_STORE_THIRD_ID, 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400&q=80'),
  p('b05', 'BTQ-0005', 'Leather Crossbody Bag',       459, 'Other',    'brown',   7, SEED_STORE_THIRD_ID, 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80'),
  p('b06', 'BTQ-0006', 'Suede Chelsea Boots',         399, 'Other',    'brown',   9, SEED_STORE_THIRD_ID, 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=400&q=80'),
  p('b07', 'BTQ-0007', 'Gold Chain Necklace',         189, 'Other',    'amber',  20, SEED_STORE_THIRD_ID, 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&q=80'),
  p('b08', 'BTQ-0008', 'Silk Square Scarf',           159, 'Other',    'rose',   25, SEED_STORE_THIRD_ID, 'https://images.unsplash.com/photo-1584030373081-f37b7bb4fa8e?w=400&q=80'),
  p('b09', 'BTQ-0009', 'Canvas Tote Bag',              89, 'Other',    'sky',    30, SEED_STORE_THIRD_ID, 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&q=80'),
  p('b10', 'BTQ-0010', 'Structured Wool Coat',        549, 'Personal', 'slate',   6, SEED_STORE_THIRD_ID, 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=400&q=80'),
];

export const SEED_PRODUCTS: readonly Product[] = [...VELVET, ...SPICE_ROUTE, ...LA_MAISON];
