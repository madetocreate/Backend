export type WebshopPlatform = "shopify" | "woocommerce" | "other";

export type WebshopGoal =
  | "product_recommendation"
  | "cart_help"
  | "faq"
  | "collection_story"
  | "other";

export type WebshopProduct = {
  id: string;
  externalId?: string;
  title: string;
  description?: string;
  price?: number;
  currency?: string;
  url?: string;
  imageUrl?: string;
  tags?: string[];
  category?: string;
  metadata?: Record<string, unknown>;
};

export type WebshopCartItem = {
  productId: string;
  quantity: number;
  variantId?: string;
  metadata?: Record<string, unknown>;
};

export type WebshopCart = {
  items: WebshopCartItem[];
  currency?: string;
  total?: number;
  metadata?: Record<string, unknown>;
};

export type WebshopConstraints = {
  minPrice?: number;
  maxPrice?: number;
  categories?: string[];
  tags?: string[];
  maxRecommendations?: number;
};

export type WebshopAssistRequest = {
  tenantId: string;
  sessionId: string;
  platform: WebshopPlatform;
  goal: WebshopGoal;
  query: string;
  products?: WebshopProduct[];
  cart?: WebshopCart;
  constraints?: WebshopConstraints;
  locale?: string;
  metadata?: Record<string, unknown>;
};

export type WebshopRecommendation = {
  productId: string;
  reason: string;
  score?: number;
  tags?: string[];
  actions?: string[];
};

export type WebshopCartSuggestionType = "add" | "remove" | "replace" | "adjust_quantity";

export type WebshopCartSuggestion = {
  type: WebshopCartSuggestionType;
  productId: string;
  targetProductId?: string;
  quantity?: number;
  reason: string;
};

export type WebshopFilterOperator = "eq" | "lt" | "gt" | "in";

export type WebshopFilterSuggestion = {
  label: string;
  field: string;
  operator: WebshopFilterOperator;
  value: string | number | string[];
};

export type WebshopAssistResponse = {
  tenantId: string;
  sessionId: string;
  channel: string;
  goal: WebshopGoal;
  platform: WebshopPlatform;
  answer: string;
  recommendations?: WebshopRecommendation[];
  cartSuggestions?: WebshopCartSuggestion[];
  filters?: WebshopFilterSuggestion[];
  followUps?: string[];
  notes?: string;
};
