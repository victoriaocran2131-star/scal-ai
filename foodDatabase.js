const foodDatabase = {
    // Fruits
    "apple": { calories: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4.4, sugar: 19, digestion: "30-40 min", digestionDesc: "Fruits digest quickly due to high water and simple sugar content", category: "fruit" },
    "banana": { calories: 105, protein: 1.3, carbs: 27, fat: 0.4, fiber: 3.1, sugar: 14, digestion: "30-45 min", digestionDesc: "Bananas are easy to digest and provide quick energy", category: "fruit" },
    "orange": { calories: 62, protein: 1.2, carbs: 15, fat: 0.2, fiber: 3.1, sugar: 12, digestion: "30 min", digestionDesc: "Citrus fruits digest rapidly", category: "fruit" },
    "strawberry": { calories: 49, protein: 1, carbs: 12, fat: 0.5, fiber: 3, sugar: 7, digestion: "25-35 min", digestionDesc: "Berries digest very quickly", category: "fruit" },
    "grape": { calories: 104, protein: 1.1, carbs: 27, fat: 0.2, fiber: 1.4, sugar: 23, digestion: "30-40 min", digestionDesc: "Grapes are easy to digest when chewed well", category: "fruit" },
    "watermelon": { calories: 46, protein: 0.9, carbs: 12, fat: 0.2, fiber: 0.6, sugar: 9, digestion: "20-30 min", digestionDesc: "Watermelon digests very quickly due to high water content", category: "fruit" },
    "mango": { calories: 99, protein: 1.4, carbs: 25, fat: 0.6, fiber: 2.6, sugar: 23, digestion: "30-45 min", digestionDesc: "Mangoes digest moderately fast", category: "fruit" },
    "pineapple": { calories: 82, protein: 0.9, carbs: 22, fat: 0.2, fiber: 2.3, sugar: 16, digestion: "30-40 min", digestionDesc: "Pineapple contains enzymes that aid digestion", category: "fruit" },
    "grapefruit": { calories: 52, protein: 1.7, carbs: 13, fat: 0.2, fiber: 2, sugar: 9, digestion: "30-40 min", digestionDesc: "Citrus fruits digest rapidly", category: "fruit" },
    "pear": { calories: 101, protein: 0.6, carbs: 27, fat: 0.2, fiber: 5.5, sugar: 17, digestion: "30-40 min", digestionDesc: "Pears digest moderately quickly", category: "fruit" },

    // Vegetables
    "broccoli": { calories: 55, protein: 3.7, carbs: 11, fat: 0.6, fiber: 5.1, sugar: 2.2, digestion: "2-3 hours", digestionDesc: "Cruciferous vegetables take longer to digest", category: "vegetable" },
    "carrot": { calories: 41, protein: 0.9, carbs: 10, fat: 0.2, fiber: 2.8, sugar: 4.7, digestion: "1.5-2 hours", digestionDesc: "Root vegetables digest moderately", category: "vegetable" },
    "spinach": { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, sugar: 0.4, digestion: "1-2 hours", digestionDesc: "Leafy greens digest quickly", category: "vegetable" },
    "tomato": { calories: 22, protein: 1, carbs: 4.8, fat: 0.2, fiber: 1.5, sugar: 3.2, digestion: "30-60 min", digestionDesc: "Tomatoes digest relatively quickly", category: "vegetable" },
    "cucumber": { calories: 16, protein: 0.7, carbs: 3.6, fat: 0.1, fiber: 0.5, sugar: 1.7, digestion: "30-60 min", digestionDesc: "High water content allows quick digestion", category: "vegetable" },
    "potato": { calories: 161, protein: 4.3, carbs: 37, fat: 0.2, fiber: 3.8, sugar: 1.7, digestion: "2-3 hours", digestionDesc: "Starchy vegetables take longer to digest", category: "vegetable" },
    "sweet potato": { calories: 103, protein: 2.3, carbs: 24, fat: 0.1, fiber: 3.8, sugar: 7.4, digestion: "2-2.5 hours", digestionDesc: "Sweet potatoes digest slower than regular potatoes", category: "vegetable" },
    "corn": { calories: 132, protein: 5, carbs: 29, fat: 1.5, fiber: 3.6, sugar: 6.3, digestion: "2-3 hours", digestionDesc: "Corn is harder to digest due to fibrous hull", category: "vegetable" },
    "bell pepper": { calories: 31, protein: 1, carbs: 6, fat: 0.3, fiber: 2.1, sugar: 4.2, digestion: "30-60 min", digestionDesc: "Peppers digest relatively quickly", category: "vegetable" },
    "lettuce": { calories: 15, protein: 1.4, carbs: 2.9, fat: 0.2, fiber: 1.3, sugar: 0.8, digestion: "20-30 min", digestionDesc: "Leafy greens digest very quickly", category: "vegetable" },
    "onion": { calories: 44, protein: 1.2, carbs: 10, fat: 0.1, fiber: 1.9, sugar: 4.7, digestion: "1-2 hours", digestionDesc: "Alliums digest moderately", category: "vegetable" },
    "celery": { calories: 16, protein: 0.7, carbs: 3, fat: 0.2, fiber: 1.6, sugar: 1.3, digestion: "20-30 min", digestionDesc: "High water content allows quick digestion", category: "vegetable" },
    "mushroom": { calories: 22, protein: 3.1, carbs: 3.3, fat: 0.3, fiber: 1, sugar: 2, digestion: "1-2 hours", digestionDesc: "Mushrooms digest moderately", category: "vegetable" },

    // Proteins
    "chicken breast": { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0, digestion: "3-4 hours", digestionDesc: "Lean protein takes several hours to fully digest", category: "protein" },
    "chicken thigh": { calories: 209, protein: 26, carbs: 0, fat: 11, fiber: 0, sugar: 0, digestion: "3-4 hours", digestionDesc: "Higher fat content slows digestion slightly", category: "protein" },
    "beef steak": { calories: 271, protein: 26, carbs: 0, fat: 18, fiber: 0, sugar: 0, digestion: "4-5 hours", digestionDesc: "Red meat takes the longest to digest", category: "protein" },
    "ground beef": { calories: 254, protein: 17, carbs: 0, fat: 20, fiber: 0, sugar: 0, digestion: "4-5 hours", digestionDesc: "Ground beef digests slightly faster than steak", category: "protein" },
    "pork chop": { calories: 231, protein: 25, carbs: 0, fat: 14, fiber: 0, sugar: 0, digestion: "3-4 hours", digestionDesc: "Pork digests faster than beef but slower than chicken", category: "protein" },
    "salmon": { calories: 208, protein: 20, carbs: 0, fat: 13, fiber: 0, sugar: 0, digestion: "2.5-3 hours", digestionDesc: "Fish is easier to digest than red meat", category: "protein" },
    "tuna": { calories: 130, protein: 29, carbs: 0, fat: 0.6, fiber: 0, sugar: 0, digestion: "2.5-3 hours", digestionDesc: "Lean fish digests relatively quickly", category: "protein" },
    "shrimp": { calories: 85, protein: 20, carbs: 0, fat: 0.2, fiber: 0, sugar: 0, digestion: "1.5-2 hours", digestionDesc: "Shellfish digests quickly", category: "protein" },
    "egg": { calories: 78, protein: 6, carbs: 0.6, fat: 5, fiber: 0, sugar: 0.6, digestion: "2-3 hours", digestionDesc: "Eggs are moderately easy to digest", category: "protein" },
    "tofu": { calories: 144, protein: 17, carbs: 3, fat: 9, fiber: 2, sugar: 1, digestion: "1.5-2 hours", digestionDesc: "Tofu is easier to digest than meat", category: "protein" },
    "bacon": { calories: 43, protein: 3, carbs: 0, fat: 3.5, fiber: 0, sugar: 0, digestion: "3-4 hours", digestionDesc: "Fatty meats take longer to digest", category: "protein" },

    // Grains & Carbs
    "rice": { calories: 206, protein: 4.3, carbs: 45, fat: 0.4, fiber: 0.6, sugar: 0.1, digestion: "2-3 hours", digestionDesc: "White rice digests moderately", category: "grain" },
    "brown rice": { calories: 216, protein: 5, carbs: 45, fat: 1.8, fiber: 3.5, sugar: 0.7, digestion: "2.5-3.5 hours", digestionDesc: "Brown rice takes longer due to fiber content", category: "grain" },
    "bread": { calories: 79, protein: 2.7, carbs: 15, fat: 1, fiber: 0.6, sugar: 1.4, digestion: "1.5-2 hours", digestionDesc: "Bread digests relatively quickly", category: "grain" },
    "pasta": { calories: 220, protein: 8, carbs: 43, fat: 1.3, fiber: 2.5, sugar: 0.8, digestion: "2-3 hours", digestionDesc: "Pasta takes moderate time to digest", category: "grain" },
    "noodles": { calories: 138, protein: 4.5, carbs: 25, fat: 2, fiber: 1.2, sugar: 0.6, digestion: "2-3 hours", digestionDesc: "Noodles digest moderately", category: "grain" },
    "oatmeal": { calories: 154, protein: 5.4, carbs: 27, fat: 2.6, fiber: 4, sugar: 0.6, digestion: "2-3 hours", digestionDesc: "Oatmeal provides sustained energy", category: "grain" },
    "cereal": { calories: 105, protein: 2.3, carbs: 24, fat: 0.3, fiber: 1.3, sugar: 10, digestion: "1.5-2 hours", digestionDesc: "Most cereals digest quickly", category: "grain" },
    "tortilla": { calories: 104, protein: 2.8, carbs: 18, fat: 2.5, fiber: 1.1, sugar: 0.8, digestion: "1.5-2 hours", digestionDesc: "Tortillas digest relatively quickly", category: "grain" },
    "bagel": { calories: 245, protein: 10, carbs: 48, fat: 1.5, fiber: 2, sugar: 5, digestion: "2-3 hours", digestionDesc: "Dense bread takes longer to digest", category: "grain" },
    "pancake": { calories: 227, protein: 6.4, carbs: 28, fat: 10, fiber: 1, sugar: 4, digestion: "2-3 hours", digestionDesc: "Pancakes digest moderately", category: "grain" },
    "waffle": { calories: 218, protein: 6, carbs: 25, fat: 11, fiber: 1, sugar: 3, digestion: "2-3 hours", digestionDesc: "Waffles digest similarly to pancakes", category: "grain" },

    // Dairy
    "milk": { calories: 149, protein: 8, carbs: 12, fat: 8, fiber: 0, sugar: 12, digestion: "1.5-2 hours", digestionDesc: "Milk digests moderately", category: "dairy" },
    "cheese": { calories: 113, protein: 7, carbs: 0.4, fat: 9, fiber: 0, sugar: 0.1, digestion: "3-4 hours", digestionDesc: "Cheese takes longer to digest due to fat content", category: "dairy" },
    "yogurt": { calories: 100, protein: 17, carbs: 6, fat: 0.7, fiber: 0, sugar: 6, digestion: "1-2 hours", digestionDesc: "Yogurt is easier to digest than milk", category: "dairy" },
    "butter": { calories: 102, protein: 0.1, carbs: 0, fat: 12, fiber: 0, sugar: 0, digestion: "3-4 hours", digestionDesc: "Pure fat takes longer to digest", category: "dairy" },
    "ice cream": { calories: 207, protein: 3.5, carbs: 24, fat: 11, fiber: 0, sugar: 21, digestion: "2-3 hours", digestionDesc: "High sugar and fat slow digestion", category: "dairy" },

    // Fast Food
    "burger": { calories: 354, protein: 20, carbs: 31, fat: 17, fiber: 1.5, sugar: 7, digestion: "4-5 hours", digestionDesc: "Combination of meat, bread, and fat slows digestion", category: "fastfood" },
    "pizza": { calories: 285, protein: 12, carbs: 36, fat: 10, fiber: 2.3, sugar: 3.6, digestion: "3-4 hours", digestionDesc: "Pizza is heavy and takes time to digest", category: "fastfood" },
    "french fries": { calories: 365, protein: 4, carbs: 48, fat: 17, fiber: 4, sugar: 0.3, digestion: "3-4 hours", digestionDesc: "Fried foods take longer to digest", category: "fastfood" },
    "hot dog": { calories: 290, protein: 10, carbs: 24, fat: 17, fiber: 1, sugar: 4, digestion: "3-4 hours", digestionDesc: "Processed meats digest slowly", category: "fastfood" },
    "chicken nuggets": { calories: 280, protein: 14, carbs: 18, fat: 17, fiber: 1, sugar: 0.5, digestion: "3-4 hours", digestionDesc: "Fried chicken takes longer to digest", category: "fastfood" },
    "taco": { calories: 226, protein: 9, carbs: 20, fat: 12, fiber: 2, sugar: 2, digestion: "3-4 hours", digestionDesc: "Tacos digest moderately", category: "fastfood" },
    "burrito": { calories: 487, protein: 21, carbs: 56, fat: 20, fiber: 8, sugar: 4, digestion: "4-5 hours", digestionDesc: "Large meals take longer to digest", category: "fastfood" },
    "sandwich": { calories: 300, protein: 15, carbs: 35, fat: 12, fiber: 3, sugar: 5, digestion: "3-4 hours", digestionDesc: "Sandwiches digest moderately", category: "fastfood" },

    // Snacks
    "chips": { calories: 536, protein: 7, carbs: 53, fat: 35, fiber: 4.4, sugar: 0.3, digestion: "2-3 hours", digestionDesc: "Fried snacks digest slowly", category: "snack" },
    "popcorn": { calories: 31, protein: 1, carbs: 6, fat: 0.4, fiber: 1.2, sugar: 0.1, digestion: "1.5-2 hours", digestionDesc: "Popcorn is a whole grain snack", category: "snack" },
    "pretzels": { calories: 380, protein: 10, carbs: 79, fat: 3, fiber: 3, sugar: 3, digestion: "2-3 hours", digestionDesc: "Pretzels digest moderately", category: "snack" },
    "nuts": { calories: 173, protein: 5, carbs: 6, fat: 16, fiber: 2, sugar: 1, digestion: "3-4 hours", digestionDesc: "Nuts take time due to high fat content", category: "snack" },
    "peanut butter": { calories: 188, protein: 8, carbs: 6, fat: 16, fiber: 2, sugar: 3, digestion: "3-4 hours", digestionDesc: "Nut butters digest slowly", category: "snack" },
    "crackers": { calories: 137, protein: 3, carbs: 17, fat: 6, fiber: 0.6, sugar: 0.5, digestion: "1.5-2 hours", digestionDesc: "Crackers digest relatively quickly", category: "snack" },
    "granola bar": { calories: 190, protein: 3, carbs: 29, fat: 7, fiber: 2, sugar: 12, digestion: "2-3 hours", digestionDesc: "Granola bars digest moderately", category: "snack" },
    "chocolate": { calories: 546, protein: 5, carbs: 60, fat: 31, fiber: 7, sugar: 48, digestion: "3-4 hours", digestionDesc: "Chocolate is high in fat and sugar", category: "snack" },

    // Soups & Stews
    "soup": { calories: 75, protein: 4, carbs: 10, fat: 2, fiber: 1, sugar: 2, digestion: "1-2 hours", digestionDesc: "Soups digest quickly due to liquid content", category: "soup" },
    "chili": { calories: 250, protein: 15, carbs: 20, fat: 12, fiber: 6, sugar: 4, digestion: "3-4 hours", digestionDesc: "Hearty soups take longer to digest", category: "soup" },
    "ramen": { calories: 436, protein: 15, carbs: 55, fat: 16, fiber: 2, sugar: 4, digestion: "2.5-3.5 hours", digestionDesc: "Ramen digests moderately", category: "soup" },

    // Beverages
    "coffee": { calories: 2, protein: 0.3, carbs: 0, fat: 0, fiber: 0, sugar: 0, digestion: "15-30 min", digestionDesc: "Coffee passes through quickly", category: "beverage" },
    "tea": { calories: 2, protein: 0, carbs: 0.5, fat: 0, fiber: 0, sugar: 0, digestion: "15-30 min", digestionDesc: "Tea digests very quickly", category: "beverage" },
    "juice": { calories: 112, protein: 0.5, carbs: 28, fat: 0.3, fiber: 0.2, sugar: 24, digestion: "20-30 min", digestionDesc: "Juice digests quickly due to lack of fiber", category: "beverage" },
    "soda": { calories: 140, protein: 0, carbs: 39, fat: 0, fiber: 0, sugar: 39, digestion: "20-30 min", digestionDesc: "Sugar water digests very quickly", category: "beverage" },
    "smoothie": { calories: 200, protein: 5, carbs: 40, fat: 3, fiber: 4, sugar: 30, digestion: "30-45 min", digestionDesc: "Blended fruit digests quickly", category: "beverage" },
    "beer": { calories: 154, protein: 1.6, carbs: 13, fat: 0, fiber: 0, sugar: 1, digestion: "30-60 min", digestionDesc: "Alcohol absorbs quickly", category: "beverage" },
    "wine": { calories: 125, protein: 0.1, carbs: 3.4, fat: 0, fiber: 0, sugar: 1, digestion: "30-60 min", digestionDesc: "Wine absorbs relatively quickly", category: "beverage" },

    // Common Meals
    "sushi": { calories: 200, protein: 8, carbs: 38, fat: 1, fiber: 0.5, sugar: 4, digestion: "2-3 hours", digestionDesc: "Sushi digests moderately", category: "meal" },
    "fried rice": { calories: 343, protein: 9, carbs: 44, fat: 15, fiber: 1.5, sugar: 1, digestion: "3-4 hours", digestionDesc: "Fried rice takes longer due to oil", category: "meal" },
    "curry": { calories: 280, protein: 15, carbs: 25, fat: 14, fiber: 4, sugar: 3, digestion: "3-4 hours", digestionDesc: "Curry digests moderately", category: "meal" },
    "stir fry": { calories: 250, protein: 18, carbs: 15, fat: 14, fiber: 3, sugar: 4, digestion: "3-4 hours", digestionDesc: "Stir fry digests moderately", category: "meal" },
    "spaghetti": { calories: 220, protein: 8, carbs: 43, fat: 1.3, fiber: 2.5, sugar: 0.8, digestion: "2-3 hours", digestionDesc: "Pasta dishes digest moderately", category: "meal" },
    "lasagna": { calories: 336, protein: 21, carbs: 24, fat: 18, fiber: 2, sugar: 5, digestion: "4-5 hours", digestionDesc: "Heavy layered dishes take longer", category: "meal" },
    "tacos": { calories: 226, protein: 9, carbs: 20, fat: 12, fiber: 2, sugar: 2, digestion: "3-4 hours", digestionDesc: "Tacos digest moderately", category: "meal" },
    "fried chicken": { calories: 320, protein: 21, carbs: 12, fat: 22, fiber: 0.5, sugar: 0.5, digestion: "4-5 hours", digestionDesc: "Fried chicken is heavy and takes time", category: "meal" },
    "grilled cheese": { calories: 370, protein: 15, carbs: 28, fat: 23, fiber: 1.5, sugar: 3, digestion: "3-4 hours", digestionDesc: "Grilled cheese is moderately heavy", category: "meal" },
    "steak": { calories: 271, protein: 26, carbs: 0, fat: 18, fiber: 0, sugar: 0, digestion: "4-5 hours", digestionDesc: "Steak takes the longest to digest", category: "meal" },

    // Desserts
    "cake": { calories: 352, protein: 5, carbs: 52, fat: 15, fiber: 1, sugar: 34, digestion: "3-4 hours", digestionDesc: "Cakes take longer due to sugar and fat", category: "dessert" },
    "cookie": { calories: 148, protein: 2, carbs: 19, fat: 7, fiber: 0.5, sugar: 10, digestion: "2-3 hours", digestionDesc: "Cookies digest moderately", category: "dessert" },
    "brownie": { calories: 466, protein: 5, carbs: 62, fat: 24, fiber: 2, sugar: 42, digestion: "3-4 hours", digestionDesc: "Brownies are dense and take time", category: "dessert" },
    "donut": { calories: 269, protein: 3.5, carbs: 31, fat: 15, fiber: 0.8, sugar: 13, digestion: "2-3 hours", digestionDesc: "Donuts digest moderately", category: "dessert" },
    "pie": { calories: 411, protein: 5, carbs: 55, fat: 20, fiber: 2, sugar: 30, digestion: "3-4 hours", digestionDesc: "Pies take longer to digest", category: "dessert" },
    "ice cream": { calories: 207, protein: 3.5, carbs: 24, fat: 11, fiber: 0, sugar: 21, digestion: "2-3 hours", digestionDesc: "Ice cream digests moderately", category: "dessert" },

    // Legumes
    "beans": { calories: 127, protein: 8.7, carbs: 23, fat: 0.5, fiber: 7.4, sugar: 0.6, digestion: "2-3 hours", digestionDesc: "Beans are high in fiber and protein", category: "legume" },
    "lentils": { calories: 116, protein: 9, carbs: 20, fat: 0.4, fiber: 8, sugar: 1.8, digestion: "2-3 hours", digestionDesc: "Lentils digest moderately", category: "legume" },
    "chickpeas": { calories: 164, protein: 8.9, carbs: 27, fat: 2.6, fiber: 7.6, sugar: 4.8, digestion: "2-3 hours", digestionDesc: "Chickpeas digest moderately", category: "legume" },
    "hummus": { calories: 166, protein: 8, carbs: 14, fat: 10, fiber: 6, sugar: 0.2, digestion: "2-3 hours", digestionDesc: "Hummus digests moderately", category: "legume" },

    // Nuts & Seeds
    "almonds": { calories: 164, protein: 6, carbs: 6, fat: 14, fiber: 3.5, sugar: 1.2, digestion: "3-4 hours", digestionDesc: "Nuts take time due to healthy fats", category: "nut" },
    "cashews": { calories: 157, protein: 5, carbs: 9, fat: 12, fiber: 0.9, sugar: 1.7, digestion: "3-4 hours", digestionDesc: "Cashews digest slowly", category: "nut" },
    "walnuts": { calories: 185, protein: 4.3, carbs: 3.9, fat: 18, fiber: 1.9, sugar: 0.7, digestion: "3-4 hours", digestionDesc: "Walnuts digest slowly", category: "nut" },
    "peanuts": { calories: 161, protein: 7.3, carbs: 4.6, fat: 14, fiber: 2.4, sugar: 1.3, digestion: "3-4 hours", digestionDesc: "Peanuts digest slowly", category: "nut" }
};

// Search function
function searchFood(query) {
    query = query.toLowerCase().trim();
    const matches = [];
    
    for (const [name, data] of Object.entries(foodDatabase)) {
        if (name.includes(query)) {
            matches.push({ name, ...data });
        }
    }
    
    // Sort by relevance (exact match first)
    matches.sort((a, b) => {
        const aExact = a.name === query ? 0 : 1;
        const bExact = b.name === query ? 0 : 1;
        if (aExact !== bExact) return aExact - bExact;
        return a.name.localeCompare(b.name);
    });
    
    return matches.slice(0, 10);
}
