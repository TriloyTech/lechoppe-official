export type MenuCategory =
  | "tous"
  | "side"
  | "burger"
  | "dessert"
  | "drink";

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: Exclude<MenuCategory, "tous">;
  available: boolean;
  chef_suggestion: boolean;
  takeaway_available?: boolean;  // undefined = treat as true for non-drinks
  image_url?: string;
  has_allergens?: boolean;
  allergens_text?: string;
}

// ── Static seed data (fallback when Supabase is empty) ───────────────────────
export const STATIC_MENU: MenuItem[] = [
  // ── Entrées ──────────────────────────────────────────────────────────────
  {
    id: "e1", name: "Tartare de Bœuf Maison",
    description: "Bœuf haché au couteau, câpres, cornichons, jaune d'œuf, moutarde de Dijon",
    price: 18, category: "side", available: true, chef_suggestion: true,
    image_url: "",
  },
  {
    id: "e2", name: "Soupe à l'Oignon Gratinée",
    description: "Oignons confits, bouillon de bœuf, croûton grillé, comté fondu",
    price: 11, category: "side", available: true, chef_suggestion: false,
  },
  {
    id: "e3", name: "Œuf Cocotte Forestier",
    description: "Girolles sautées, crème fraîche, herbes du jardin",
    price: 12, category: "side", available: true, chef_suggestion: false,
  },
  {
    id: "e4", name: "Salade du Marché",
    description: "Mesclun, chèvre chaud, noix, vinaigrette balsamique",
    price: 13, category: "side", available: true, chef_suggestion: false,
  },
  {
    id: "e5", name: "Carpaccio de Bœuf",
    description: "Bœuf charolais, parmesan, roquette, huile de truffe",
    price: 16, category: "side", available: true, chef_suggestion: false,
  },

  // ── Burgers ───────────────────────────────────────────────────────────────
  {
    id: "b1", name: "Le Dallas",
    description: "Double smash patty, cheddar fondu, pickles maison, oignons caramélisés, sauce secrète maison",
    price: 19, category: "burger", available: true, chef_suggestion: true,
    image_url: "",
  },
  {
    id: "b2", name: "Le Signature",
    description: "Wagyu japonais A5, comté 18 mois, lamelles de truffe noire, beurre de foie gras",
    price: 34, category: "burger", available: true, chef_suggestion: true,
    image_url: "",
  },
  {
    id: "b3", name: "L'Américain",
    description: "Double smash, cheddar fondu, pickles maison, sauce secrète",
    price: 19.5, category: "burger", available: true, chef_suggestion: false,
  },
  {
    id: "b4", name: "Le Végétarien",
    description: "Galette de lentilles maison, féta, légumes grillés, houmous, herbes fraîches",
    price: 17, category: "burger", available: true, chef_suggestion: false,
  },
  {
    id: "b5", name: "Le Parisien",
    description: "Jambon de Paris, beurre de qualité, emmental, salade, cornichon",
    price: 16, category: "burger", available: false, chef_suggestion: false,
  },

  // ── Spécialités ───────────────────────────────────────────────────────────
  {
    id: "s1", name: "Cuisse de Canard Confite",
    description: "Confit 12h, pommes sarladaises, jus de viande réduit, fleur de sel de Guérande",
    price: 21, category: "burger", available: true, chef_suggestion: true,
    image_url: "",
  },
  {
    id: "s2", name: "Bœuf Bourguignon Maison",
    description: "Bœuf braisé 6h, carottes, champignons, lardons fumés, purée truffée",
    price: 24, category: "burger", available: true, chef_suggestion: false,
  },
  {
    id: "s3", name: "Saint-Jacques Poêlées",
    description: "Noix de saint-jacques, beurre blanc au citron, risotto à l'encre de seiche",
    price: 28, category: "burger", available: true, chef_suggestion: false,
  },
  {
    id: "s4", name: "Côte de Veau Rôtie",
    description: "Veau fermier, gnocchi à la parisienne, jus corsé, morilles fraîches",
    price: 26, category: "burger", available: true, chef_suggestion: false,
  },

  // ── Classiques ────────────────────────────────────────────────────────────
  {
    id: "c1", name: "Steak Frites Maison",
    description: "Entrecôte charolaise 200g, frites maison double cuisson, sauce béarnaise",
    price: 22, category: "burger", available: true, chef_suggestion: false,
  },
  {
    id: "c2", name: "Poulet Fermier Rôti",
    description: "Demi-poulet Label Rouge, pommes de terre confites, jus de rôti",
    price: 19, category: "burger", available: true, chef_suggestion: false,
  },
  {
    id: "c3", name: "Croque Monsieur Revisité",
    description: "Pain de mie maison, jambon ibérique, béchamel truffée, comté",
    price: 14, category: "burger", available: true, chef_suggestion: false,
  },
  {
    id: "c4", name: "Pavé de Saumon",
    description: "Saumon Label Rouge, épinards à la crème, sauce hollandaise",
    price: 21, category: "burger", available: true, chef_suggestion: false,
  },

  // ── Desserts ──────────────────────────────────────────────────────────────
  {
    id: "d1", name: "Moelleux au Chocolat",
    description: "Chocolat Valrhona 70%, cœur coulant caramel beurre salé, glace vanille Bourbon",
    price: 9, category: "dessert", available: true, chef_suggestion: true,
    image_url: "",
  },
  {
    id: "d2", name: "Crème Brûlée à la Vanille",
    description: "Vanille de Madagascar, cassonade dorée à la flamme",
    price: 8, category: "dessert", available: true, chef_suggestion: false,
  },
  {
    id: "d3", name: "Tarte Tatin Maison",
    description: "Pommes caramélisées, pâte feuilletée pur beurre, crème fraîche",
    price: 9, category: "dessert", available: true, chef_suggestion: false,
  },
  {
    id: "d4", name: "Île Flottante",
    description: "Blancs en neige, crème anglaise, pralin caramélisé",
    price: 7.5, category: "dessert", available: true, chef_suggestion: false,
  },

  // ── Boissons ──────────────────────────────────────────────────────────────
  {
    id: "bv1", name: "Vin Rouge — Bordeaux AOC",
    description: "Carafe 50cl · Château Maucaillou, Moulis-en-Médoc",
    price: 18, category: "drink", available: true, chef_suggestion: false,
  },
  {
    id: "bv2", name: "Vin Blanc — Chablis",
    description: "Carafe 50cl · Domaine Laroche, Premier Cru",
    price: 20, category: "drink", available: true, chef_suggestion: false,
  },
  {
    id: "bv3", name: "Eau Pétillante Maison",
    description: "Filtrée et gazéifiée sur place · 1L",
    price: 4, category: "drink", available: true, chef_suggestion: false,
  },
  {
    id: "bv4", name: "Café Gourmand",
    description: "Espresso + 3 mignardises du chef",
    price: 6, category: "drink", available: true, chef_suggestion: false,
  },
];

export const CATEGORIES: { key: MenuCategory; fr: string; en: string }[] = [
  { key: "tous",    fr: "Tout",        en: "All" },
  { key: "side",    fr: "Entrées",     en: "Starters & Sides" },
  { key: "burger",  fr: "Burgers & Plats", en: "Burgers & Mains" },
  { key: "dessert", fr: "Desserts",    en: "Desserts" },
  { key: "drink",   fr: "Boissons",    en: "Drinks" },
];

export const fmt = (price: number) =>
  price % 1 === 0 ? `${price}€` : `${Number(price).toFixed(2).replace(".", ",")}€`;
