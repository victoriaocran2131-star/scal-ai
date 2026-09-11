import { foodDatabase, FoodItem, searchFood } from '../data/foodDatabase';

const GOOGLE_VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';

let API_KEY = '';

export function setApiKey(key: string) {
  API_KEY = key;
}

export function getApiKey(): string {
  return API_KEY;
}

interface VisionResponse {
  responses: Array<{
    labelAnnotations?: Array<{
      description: string;
      score: number;
    }>;
    error?: {
      code: number;
      message: string;
    };
  }>;
}

const FOOD_KEYWORDS: Record<string, string[]> = {
  apple: ['apple', 'fruit', 'red fruit'],
  banana: ['banana', 'yellow fruit'],
  orange: ['orange', 'citrus', 'fruit'],
  strawberry: ['strawberry', 'berry', 'red berry'],
  grape: ['grape', 'fruit', 'purple fruit'],
  watermelon: ['watermelon', 'melon', 'fruit'],
  mango: ['mango', 'tropical fruit'],
  pineapple: ['pineapple', 'tropical fruit'],
  grapefruit: ['grapefruit', 'citrus'],
  pear: ['pear', 'fruit'],
  broccoli: ['broccoli', 'vegetable', 'green vegetable'],
  carrot: ['carrot', 'vegetable', 'root vegetable'],
  spinach: ['spinach', 'leafy green', 'vegetable'],
  tomato: ['tomato', 'vegetable', 'fruit'],
  cucumber: ['cucumber', 'vegetable', 'green vegetable'],
  potato: ['potato', 'vegetable', 'root vegetable'],
  sweet_potato: ['sweet potato', 'yam', 'root vegetable'],
  corn: ['corn', 'maize', 'vegetable'],
  bell_pepper: ['bell pepper', 'pepper', 'vegetable'],
  lettuce: ['lettuce', 'salad', 'leafy green'],
  onion: ['onion', 'vegetable'],
  celery: ['celery', 'vegetable'],
  mushroom: ['mushroom', 'fungus', 'vegetable'],
  chicken_breast: ['chicken', 'poultry', 'meat'],
  chicken_thigh: ['chicken', 'poultry', 'meat'],
  beef_steak: ['steak', 'beef', 'red meat'],
  ground_beef: ['beef', 'hamburger', 'ground meat'],
  pork_chop: ['pork', 'meat', 'chop'],
  salmon: ['salmon', 'fish', 'seafood'],
  tuna: ['tuna', 'fish', 'seafood'],
  shrimp: ['shrimp', 'prawn', 'seafood'],
  egg: ['egg', 'eggs'],
  tofu: ['tofu', 'soy', 'bean curd'],
  bacon: ['bacon', 'pork', 'processed meat'],
  rice: ['rice', 'grain', 'white rice'],
  brown_rice: ['brown rice', 'rice', 'grain'],
  bread: ['bread', 'baked goods'],
  pasta: ['pasta', 'noodles', 'italian'],
  noodles: ['noodles', 'pasta', 'asian'],
  oatmeal: ['oatmeal', 'oats', 'porridge'],
  cereal: ['cereal', 'breakfast'],
  tortilla: ['tortilla', 'wrap', 'flatbread'],
  bagel: ['bagel', 'bread', 'baked goods'],
  pancake: ['pancake', 'breakfast', 'griddle'],
  waffle: ['waffle', 'breakfast', 'baked goods'],
  milk: ['milk', 'dairy', 'beverage'],
  cheese: ['cheese', 'dairy'],
  yogurt: ['yogurt', 'yoghurt', 'dairy'],
  butter: ['butter', 'dairy', 'spread'],
  ice_cream: ['ice cream', 'frozen dessert', 'dessert'],
  burger: ['burger', 'hamburger', 'sandwich'],
  pizza: ['pizza', 'italian', 'fast food'],
  french_fries: ['french fries', 'fries', 'chips'],
  hot_dog: ['hot dog', 'sausage', 'fast food'],
  chicken_nuggets: ['chicken nuggets', 'nuggets', 'fried chicken'],
  taco: ['taco', 'mexican', 'fast food'],
  burrito: ['burrito', 'mexican', 'wrap'],
  sandwich: ['sandwich', 'bread', 'lunch'],
  chips: ['chips', 'crisps', 'snack'],
  popcorn: ['popcorn', 'snack', 'corn'],
  pretzels: ['pretzels', 'snack', 'baked goods'],
  nuts: ['nuts', 'mixed nuts', 'snack'],
  peanut_butter: ['peanut butter', 'spread', 'nuts'],
  crackers: ['crackers', 'snack', 'baked goods'],
  granola_bar: ['granola bar', 'energy bar', 'snack'],
  chocolate: ['chocolate', 'candy', 'dessert'],
  soup: ['soup', 'broth', 'stew'],
  chili: ['chili', 'stew', 'soup'],
  ramen: ['ramen', 'noodles', 'soup'],
  coffee: ['coffee', 'beverage', 'hot drink'],
  tea: ['tea', 'beverage', 'hot drink'],
  juice: ['juice', 'beverage', 'fruit drink'],
  soda: ['soda', 'soft drink', 'carbonated'],
  smoothie: ['smoothie', 'drink', 'blended'],
  beer: ['beer', 'alcohol', 'beverage'],
  wine: ['wine', 'alcohol', 'beverage'],
  sushi: ['sushi', 'japanese', 'seafood'],
  fried_rice: ['fried rice', 'rice', 'asian'],
  curry: ['curry', 'indian', 'spicy'],
  stir_fry: ['stir fry', 'asian', 'vegetables'],
  spaghetti: ['spaghetti', 'pasta', 'italian'],
  lasagna: ['lasagna', 'pasta', 'italian'],
  tacos_meal: ['tacos', 'mexican'],
  fried_chicken: ['fried chicken', 'chicken', 'fast food'],
  grilled_cheese: ['grilled cheese', 'sandwich'],
  steak_meal: ['steak', 'beef', 'meat'],
  cake: ['cake', 'dessert', 'baked goods'],
  cookie: ['cookie', 'dessert', 'baked goods'],
  brownie: ['brownie', 'dessert', 'chocolate'],
  donut: ['donut', 'doughnut', 'pastry'],
  pie: ['pie', 'dessert', 'pastry'],
  beans: ['beans', 'legume', 'vegetable'],
  lentils: ['lentils', 'legume', 'pulse'],
  chickpeas: ['chickpeas', 'garbanzo beans', 'legume'],
  hummus: ['hummus', 'dip', 'spread'],
  almonds: ['almonds', 'nuts', 'tree nuts'],
  cashews: ['cashews', 'nuts', 'tree nuts'],
  walnuts: ['walnuts', 'nuts', 'tree nuts'],
  peanuts: ['peanuts', 'nuts', 'legume'],
};

function matchLabelToFood(labels: string[]): FoodItem | null {
  const lowerLabels = labels.map(l => l.toLowerCase());

  for (const [foodKey, keywords] of Object.entries(FOOD_KEYWORDS)) {
    for (const label of lowerLabels) {
      for (const keyword of keywords) {
        if (label.includes(keyword) || keyword.includes(label)) {
          const food = foodDatabase[foodKey];
          if (food) return food;
        }
      }
    }
  }

  for (const label of lowerLabels) {
    const results = searchFood(label);
    if (results.length > 0) return results[0];
  }

  return null;
}

export async function recognizeFood(base64Image: string): Promise<{
  success: boolean;
  food?: FoodItem;
  confidence?: number;
  labels?: string[];
  error?: string;
}> {
  if (!API_KEY) {
    return {
      success: false,
      error: 'API key not configured. Please set your Google Cloud Vision API key.',
    };
  }

  try {
    const requestBody = {
      requests: [
        {
          image: {
            content: base64Image,
          },
          features: [
            {
              type: 'LABEL_DETECTION',
              maxResults: 15,
            },
            {
              type: 'OBJECT_LOCALIZATION',
              maxResults: 5,
            },
          ],
        },
      ],
    };

    const response = await fetch(`${GOOGLE_VISION_API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error?.message || `API error: ${response.status}`,
      };
    }

    const data: VisionResponse = await response.json();

    if (data.responses[0].error) {
      return {
        success: false,
        error: data.responses[0].error.message,
      };
    }

    const labels = data.responses[0].labelAnnotations?.map(l => l.description) || [];
    const topScore = data.responses[0].labelAnnotations?.[0]?.score || 0;

    const food = matchLabelToFood(labels);

    if (food) {
      return {
        success: true,
        food,
        confidence: topScore,
        labels,
      };
    }

    return {
      success: false,
      error: 'Could not identify food in the image. Please try a clearer photo or search manually.',
      labels,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to analyze image. Please check your connection.',
    };
  }
}

export function isApiConfigured(): boolean {
  return API_KEY.length > 0;
}
