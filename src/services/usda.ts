import { FoodItem } from '../data/foodDatabase';

const USDA_API_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search';

let USDA_API_KEY = '';

export function setUsdaApiKey(key: string) {
  USDA_API_KEY = key;
}

export function getUsdaApiKey(): string {
  return USDA_API_KEY;
}

interface UsdaFood {
  fdcId: number;
  description: string;
  foodNutrients?: Array<{
    nutrientName: string;
    value: number;
    unitName: string;
  }>;
}

interface UsdaResponse {
  foods: UsdaFood[];
  totalHits: number;
}

const NUTRIENT_MAP: Record<string, string> = {
  'Energy': 'calories',
  'Protein': 'protein',
  'Carbohydrate, by difference': 'carbs',
  'Total lipid (fat)': 'fat',
  'Fiber, total dietary': 'fiber',
  'Sugars, total including NLEA': 'sugar',
};

function mapNutrients(nutrients: Array<{ nutrientName: string; value: number; unitName: string }>): Partial<FoodItem> {
  const result: Partial<FoodItem> = {};
  for (const n of nutrients) {
    const key = NUTRIENT_MAP[n.nutrientName];
    if (key) {
      result[key as keyof FoodItem] = n.unitName === 'KCAL' ? Math.round(n.value) : Math.round(n.value * 10) / 10;
    }
  }
  return result;
}

function getDigestionTime(category: string): { time: string; desc: string } {
  const times: Record<string, { time: string; desc: string }> = {
    fruit: { time: '30-45 min', desc: 'Fruits digest quickly due to high water and simple sugar content' },
    vegetable: { time: '1-2 hours', desc: 'Vegetables digest moderately depending on fiber content' },
    protein: { time: '3-4 hours', desc: 'Proteins take longer to fully digest' },
    grain: { time: '2-3 hours', desc: 'Grains digest moderately due to complex carbs' },
    dairy: { time: '2-3 hours', desc: 'Dairy digests moderately depending on fat content' },
    fastfood: { time: '3-5 hours', desc: 'Combination of ingredients slows digestion' },
    snack: { time: '2-3 hours', desc: 'Snacks digest moderately' },
    soup: { time: '1-2 hours', desc: 'Liquid-based foods digest quickly' },
    beverage: { time: '15-30 min', desc: 'Beverages pass through quickly' },
    meal: { time: '3-4 hours', desc: 'Complex meals take longer to digest' },
    dessert: { time: '2-3 hours', desc: 'High sugar and fat slow digestion' },
    legume: { time: '2-3 hours', desc: 'Legumes digest moderately' },
    nut: { time: '3-4 hours', desc: 'Nuts take time due to healthy fats' },
  };
  return times[category] || { time: '2-3 hours', desc: 'Food digests at a moderate pace' };
}

function categorizeFood(description: string): string {
  const lower = description.toLowerCase();
  if (/\b(apple|banana|orange|strawberry|grape|watermelon|mango|pineapple|pear|fruit)\b/.test(lower)) return 'fruit';
  if (/\b(broccoli|carrot|spinach|tomato|cucumber|potato|corn|lettuce|onion|celery|mushroom|pepper|vegetable)\b/.test(lower)) return 'vegetable';
  if (/\b(chicken|beef|pork|salmon|tuna|shrimp|egg|tofu|bacon|meat|fish|steak)\b/.test(lower)) return 'protein';
  if (/\b(rice|bread|pasta|noodles|oatmeal|cereal|tortilla|bagel|pancake|waffle|grain)\b/.test(lower)) return 'grain';
  if (/\b(milk|cheese|yogurt|butter|ice cream|dairy)\b/.test(lower)) return 'dairy';
  if (/\b(burger|pizza|fries|hot dog|nugget|taco|burrito|fast)\b/.test(lower)) return 'fastfood';
  if (/\b(chips|popcorn|pretzel|nut|peanut butter|cracker|granola|chocolate|snack)\b/.test(lower)) return 'snack';
  if (/\b(soup|chili|ramen|stew|broth)\b/.test(lower)) return 'soup';
  if (/\b(coffee|tea|juice|soda|smoothie|beer|wine|drink|beverage)\b/.test(lower)) return 'beverage';
  if (/\b(sushi|fried rice|curry|stir fry|spaghetti|lasagna|chicken|steak|meal)\b/.test(lower)) return 'meal';
  if (/\b(cake|cookie|brownie|donut|pie|dessert|sweet)\b/.test(lower)) return 'dessert';
  if (/\b(bean|lentil|chickpea|hummus|legume|pulse)\b/.test(lower)) return 'legume';
  if (/\b(almond|cashew|walnut|peanut)\b/.test(lower)) return 'nut';
  return 'meal';
}

export async function searchUsdaFood(query: string): Promise<FoodItem | null> {
  if (!USDA_API_KEY) return null;

  try {
    const response = await fetch(
      `${USDA_API_URL}?query=${encodeURIComponent(query)}&pageSize=1&api_key=${USDA_API_KEY}`
    );

    if (!response.ok) return null;

    const data: UsdaResponse = await response.json();
    if (!data.foods || data.foods.length === 0) return null;

    const food = data.foods[0];
    const nutrients = mapNutrients(food.foodNutrients || []);
    const category = categorizeFood(food.description);
    const digestion = getDigestionTime(category);

    const name = food.description.split(',')[0].toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();

    return {
      name,
      calories: nutrients.calories || 0,
      protein: nutrients.protein || 0,
      carbs: nutrients.carbs || 0,
      fat: nutrients.fat || 0,
      fiber: nutrients.fiber || 0,
      sugar: nutrients.sugar || 0,
      digestion: digestion.time,
      digestionDesc: digestion.desc,
      category,
      fact: `${food.description} - nutritional data from USDA FoodData Central.`,
    };
  } catch {
    return null;
  }
}
