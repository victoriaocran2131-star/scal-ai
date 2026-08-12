export interface FoodItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  digestion: string;
  digestionDesc: string;
  category: string;
}

export const foodDatabase: Record<string, FoodItem> = {
  apple: { name: 'apple', calories: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4.4, sugar: 19, digestion: '30-40 min', digestionDesc: 'Fruits digest quickly', category: 'fruit' },
  banana: { name: 'banana', calories: 105, protein: 1.3, carbs: 27, fat: 0.4, fiber: 3.1, sugar: 14, digestion: '30-45 min', digestionDesc: 'Bananas are easy to digest', category: 'fruit' },
  orange: { name: 'orange', calories: 62, protein: 1.2, carbs: 15, fat: 0.2, fiber: 3.1, sugar: 12, digestion: '30 min', digestionDesc: 'Citrus fruits digest rapidly', category: 'fruit' },
  strawberry: { name: 'strawberry', calories: 49, protein: 1, carbs: 12, fat: 0.5, fiber: 3, sugar: 7, digestion: '25-35 min', digestionDesc: 'Berries digest very quickly', category: 'fruit' },
  grape: { name: 'grape', calories: 104, protein: 1.1, carbs: 27, fat: 0.2, fiber: 1.4, sugar: 23, digestion: '30-40 min', digestionDesc: 'Grapes are easy to digest', category: 'fruit' },
  watermelon: { name: 'watermelon', calories: 46, protein: 0.9, carbs: 12, fat: 0.2, fiber: 0.6, sugar: 9, digestion: '20-30 min', digestionDesc: 'Watermelon digests very quickly', category: 'fruit' },
  mango: { name: 'mango', calories: 99, protein: 1.4, carbs: 25, fat: 0.6, fiber: 2.6, sugar: 23, digestion: '30-45 min', digestionDesc: 'Mangoes digest moderately fast', category: 'fruit' },
  pineapple: { name: 'pineapple', calories: 82, protein: 0.9, carbs: 22, fat: 0.2, fiber: 2.3, sugar: 16, digestion: '30-40 min', digestionDesc: 'Pineapple contains enzymes', category: 'fruit' },
  broccoli: { name: 'broccoli', calories: 55, protein: 3.7, carbs: 11, fat: 0.6, fiber: 5.1, sugar: 2.2, digestion: '2-3 hours', digestionDesc: 'Cruciferous vegetables take longer', category: 'vegetable' },
  carrot: { name: 'carrot', calories: 41, protein: 0.9, carbs: 10, fat: 0.2, fiber: 2.8, sugar: 4.7, digestion: '1.5-2 hours', digestionDesc: 'Root vegetables digest moderately', category: 'vegetable' },
  spinach: { name: 'spinach', calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, sugar: 0.4, digestion: '1-2 hours', digestionDesc: 'Leafy greens digest quickly', category: 'vegetable' },
  tomato: { name: 'tomato', calories: 22, protein: 1, carbs: 4.8, fat: 0.2, fiber: 1.5, sugar: 3.2, digestion: '30-60 min', digestionDesc: 'Tomatoes digest quickly', category: 'vegetable' },
  potato: { name: 'potato', calories: 161, protein: 4.3, carbs: 37, fat: 0.2, fiber: 3.8, sugar: 1.7, digestion: '2-3 hours', digestionDesc: 'Starchy vegetables take longer', category: 'vegetable' },
  chicken_breast: { name: 'chicken breast', calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0, digestion: '3-4 hours', digestionDesc: 'Lean protein takes several hours', category: 'protein' },
  beef_steak: { name: 'beef steak', calories: 271, protein: 26, carbs: 0, fat: 18, fiber: 0, sugar: 0, digestion: '4-5 hours', digestionDesc: 'Red meat takes the longest', category: 'protein' },
  salmon: { name: 'salmon', calories: 208, protein: 20, carbs: 0, fat: 13, fiber: 0, sugar: 0, digestion: '2.5-3 hours', digestionDesc: 'Fish is easier to digest', category: 'protein' },
  egg: { name: 'egg', calories: 78, protein: 6, carbs: 0.6, fat: 5, fiber: 0, sugar: 0.6, digestion: '2-3 hours', digestionDesc: 'Eggs are moderately easy to digest', category: 'protein' },
  rice: { name: 'rice', calories: 206, protein: 4.3, carbs: 45, fat: 0.4, fiber: 0.6, sugar: 0.1, digestion: '2-3 hours', digestionDesc: 'White rice digests moderately', category: 'grain' },
  bread: { name: 'bread', calories: 79, protein: 2.7, carbs: 15, fat: 1, fiber: 0.6, sugar: 1.4, digestion: '1.5-2 hours', digestionDesc: 'Bread digests relatively quickly', category: 'grain' },
  pasta: { name: 'pasta', calories: 220, protein: 8, carbs: 43, fat: 1.3, fiber: 2.5, sugar: 0.8, digestion: '2-3 hours', digestionDesc: 'Pasta takes moderate time', category: 'grain' },
  burger: { name: 'burger', calories: 354, protein: 20, carbs: 31, fat: 17, fiber: 1.5, sugar: 7, digestion: '4-5 hours', digestionDesc: 'Combination slows digestion', category: 'fastfood' },
  pizza: { name: 'pizza', calories: 285, protein: 12, carbs: 36, fat: 10, fiber: 2.3, sugar: 3.6, digestion: '3-4 hours', digestionDesc: 'Pizza is heavy', category: 'fastfood' },
  french_fries: { name: 'french fries', calories: 365, protein: 4, carbs: 48, fat: 17, fiber: 4, sugar: 0.3, digestion: '3-4 hours', digestionDesc: 'Fried foods take longer', category: 'fastfood' },
  sandwich: { name: 'sandwich', calories: 300, protein: 15, carbs: 35, fat: 12, fiber: 3, sugar: 5, digestion: '3-4 hours', digestionDesc: 'Sandwiches digest moderately', category: 'fastfood' },
  soup: { name: 'soup', calories: 75, protein: 4, carbs: 10, fat: 2, fiber: 1, sugar: 2, digestion: '1-2 hours', digestionDesc: 'Soups digest quickly', category: 'soup' },
  coffee: { name: 'coffee', calories: 2, protein: 0.3, carbs: 0, fat: 0, fiber: 0, sugar: 0, digestion: '15-30 min', digestionDesc: 'Coffee passes through quickly', category: 'beverage' },
  tea: { name: 'tea', calories: 2, protein: 0, carbs: 0.5, fat: 0, fiber: 0, sugar: 0, digestion: '15-30 min', digestionDesc: 'Tea digests very quickly', category: 'beverage' },
  juice: { name: 'juice', calories: 112, protein: 0.5, carbs: 28, fat: 0.3, fiber: 0.2, sugar: 24, digestion: '20-30 min', digestionDesc: 'Juice digests quickly', category: 'beverage' },
  sushi: { name: 'sushi', calories: 200, protein: 8, carbs: 38, fat: 1, fiber: 0.5, sugar: 4, digestion: '2-3 hours', digestionDesc: 'Sushi digests moderately', category: 'meal' },
  curry: { name: 'curry', calories: 280, protein: 15, carbs: 25, fat: 14, fiber: 4, sugar: 3, digestion: '3-4 hours', digestionDesc: 'Curry digests moderately', category: 'meal' },
  fried_chicken: { name: 'fried chicken', calories: 320, protein: 21, carbs: 12, fat: 22, fiber: 0.5, sugar: 0.5, digestion: '4-5 hours', digestionDesc: 'Fried chicken is heavy', category: 'meal' },
  steak: { name: 'steak', calories: 271, protein: 26, carbs: 0, fat: 18, fiber: 0, sugar: 0, digestion: '4-5 hours', digestionDesc: 'Steak takes the longest', category: 'meal' },
  cake: { name: 'cake', calories: 352, protein: 5, carbs: 52, fat: 15, fiber: 1, sugar: 34, digestion: '3-4 hours', digestionDesc: 'Cakes take longer', category: 'dessert' },
  cookie: { name: 'cookie', calories: 148, protein: 2, carbs: 19, fat: 7, fiber: 0.5, sugar: 10, digestion: '2-3 hours', digestionDesc: 'Cookies digest moderately', category: 'dessert' },
  ice_cream: { name: 'ice cream', calories: 207, protein: 3.5, carbs: 24, fat: 11, fiber: 0, sugar: 21, digestion: '2-3 hours', digestionDesc: 'Ice cream digests moderately', category: 'dessert' },
  beans: { name: 'beans', calories: 127, protein: 8.7, carbs: 23, fat: 0.5, fiber: 7.4, sugar: 0.6, digestion: '2-3 hours', digestionDesc: 'Beans are high in fiber', category: 'legume' },
  yogurt: { name: 'yogurt', calories: 100, protein: 17, carbs: 6, fat: 0.7, fiber: 0, sugar: 6, digestion: '1-2 hours', digestionDesc: 'Yogurt is easier to digest', category: 'dairy' },
  cheese: { name: 'cheese', calories: 113, protein: 7, carbs: 0.4, fat: 9, fiber: 0, sugar: 0.1, digestion: '3-4 hours', digestionDesc: 'Cheese takes longer', category: 'dairy' },
  milk: { name: 'milk', calories: 149, protein: 8, carbs: 12, fat: 8, fiber: 0, sugar: 12, digestion: '1.5-2 hours', digestionDesc: 'Milk digests moderately', category: 'dairy' },
  nuts: { name: 'nuts', calories: 173, protein: 5, carbs: 6, fat: 16, fiber: 2, sugar: 1, digestion: '3-4 hours', digestionDesc: 'Nuts take time', category: 'snack' },
  chocolate: { name: 'chocolate', calories: 546, protein: 5, carbs: 60, fat: 31, fiber: 7, sugar: 48, digestion: '3-4 hours', digestionDesc: 'Chocolate is high in fat', category: 'snack' },
  popcorn: { name: 'popcorn', calories: 31, protein: 1, carbs: 6, fat: 0.4, fiber: 1.2, sugar: 0.1, digestion: '1.5-2 hours', digestionDesc: 'Popcorn is a whole grain', category: 'snack' },
};

export function searchFood(query: string): FoodItem[] {
  const normalizedQuery = query.toLowerCase().trim();
  const matches: FoodItem[] = [];

  for (const [key, data] of Object.entries(foodDatabase)) {
    if (key.includes(normalizedQuery) || data.name.includes(normalizedQuery)) {
      matches.push(data);
    }
  }

  matches.sort((a, b) => {
    const aExact = a.name === normalizedQuery ? 0 : 1;
    const bExact = b.name === normalizedQuery ? 0 : 1;
    if (aExact !== bExact) return aExact - bExact;
    return a.name.localeCompare(b.name);
  });

  return matches.slice(0, 10);
}

export function getRandomFood(): FoodItem {
  const foods = Object.values(foodDatabase);
  return foods[Math.floor(Math.random() * foods.length)];
}
