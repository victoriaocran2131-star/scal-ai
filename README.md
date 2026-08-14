# FoodScan - Calorie & Nutrient Scanner

A web-based food scanning app that uses your camera to identify food and calculate calories, nutrients, and digestion time.

## Features

- **Camera Integration**: Use your device camera to scan food
- **Food Recognition**: AI-powered food identification (simulated demo)
- **Nutrition Data**: Calories, protein, carbs, fat, fiber, sugar
- **Digestion Time**: How long food takes to digest in your body
- **Portion Control**: Adjust portion sizes for accurate calculations
- **Manual Search**: Search from 100+ foods if camera isn't available
- **Daily Log**: Track all food eaten throughout the day

## How to Use

1. Open `index.html` in a modern browser
2. Click "Start Camera" to enable your webcam
3. Point at food and click "Scan Food"
4. View nutrition info and digestion time
5. Adjust portion size if needed
6. Click "Add to Log" to save to your daily tracker

## Files

- `index.html` - Main app structure
- `style.css` - Styling and animations
- `foodDatabase.js` - 100+ foods with nutrition data
- `app.js` - Main application logic

## Browser Requirements

- Modern browser (Chrome, Firefox, Edge, Safari)
- Camera permission for scanning feature
- Works on desktop and mobile

## Note

This is a demo version. For production use, integrate with a food recognition API like:
- Google Vision AI
- Clarifai Food Model
- Nutritionix API
- Edamam API
