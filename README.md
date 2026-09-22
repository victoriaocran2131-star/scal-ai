# Scal AI - Food Scanner & Nutrition Tracker

A mobile app that uses your camera to identify food and calculate calories, nutrients, and digestion time.

## Features

- **Camera Integration**: Use your device camera to scan food
- **AI Food Recognition**: Google Cloud Vision API-powered food identification
- **USDA Nutrition Data**: Accurate nutrition data from USDA FoodData Central
- **Nutrition Tracking**: Calories, protein, carbs, fat, fiber, sugar
- **Digestion Time**: How long food takes to digest in your body
- **Portion Control**: Adjust portion sizes for accurate calculations
- **Manual Search**: Search from 100+ foods if camera isn't available
- **Daily Log**: Track all food eaten throughout the day
- **Charts & Analytics**: Visualize your nutrition trends
- **Meal Reminders**: Set reminders to track your meals
- **Subscription Plans**: Weekly, monthly, and yearly plans available

## Tech Stack

- **Frontend**: React Native with Expo SDK 56
- **Backend**: Firebase (Firestore, Authentication, Cloud Functions)
- **AI**: Google Cloud Vision API for food recognition
- **Nutrition Data**: USDA FoodData Central API
- **Push Notifications**: Expo Notifications
- **In-App Purchases**: react-native-iap with Apple IAP

## Getting Started

```bash
npm install
npm start
```

## Building

```bash
# iOS
eas build --platform ios

# Android
eas build --platform android
```

## Environment Variables

Create a `.env` file with:

```
EXPO_PUBLIC_GOOGLE_VISION_API_KEY=your_google_vision_key
EXPO_PUBLIC_USDA_API_KEY=your_usda_key
```

## License

ISC
