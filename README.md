# 📱 EcoVerse

EcoVerse is a mobile application designed to help users track physical activity and develop healthier, more sustainable lifestyle habits. The app focuses on activity logging, progress tracking, and future integration with Android Health Connect.

This project is developed as part of a **Final Year Project (FYP)** using **React Native** and **Expo**.

---

## 🎯 Project Objectives

- Allow users to log daily activities manually  
- Display summaries and basic statistics of logged activities  
- Provide a clean and accessible user interface  
- Lay the groundwork for future integration with **Android Health Connect**  
- Apply modern mobile development practices using Expo and Expo Router  

---

## 🛠️ Tech Stack

- React Native  
- Expo (Managed Workflow)  
- Expo Router (file-based navigation)  
- Zustand (state management)  
- TypeScript  
- Android (primary target platform)  

---

## 📂 Project Structure

```txt
app/
├── (tabs)/
│   ├── index.tsx        # Home screen
│   ├── activity.tsx     # Activity overview
│   ├── stats.tsx        # Statistics screen
│   └── profile.tsx      # User profile
│
├── activity/
│   ├── add.tsx          # Add new activity
│   └── details.tsx      # Activity details
│
├── _layout.tsx          # Root layout
│
assets/
├── images/
│   ├── icon.png
│   ├── splash.png
│   └── adaptive-icon.png
│
store/
├── activityStore.ts     # Zustand activity store

🧭 Navigation
Navigation is implemented using Expo Router, which uses file-based routing.
Each screen corresponds directly to a file inside the app/ directory.

Tab navigation is defined in:
app/(tabs)/_layout.tsx

📊 Data Handling
- Activity data is stored locally using Zustand
- Users manually enter activity details such as type and duration
- This allows the app to function independently without external data sources
- Health Connect integration is planned for a later phase

🩺 Health Connect (Planned Feature)
Health Connect is not yet implemented.

Planned functionality includes:
- Reading activity data from Health Connect
- Syncing selected health metrics
- Falling back to manual entry if permissions are denied

This phased approach ensures core functionality works before native integration.

🚀 Running the Project
Install dependencies
npm install

Start the development server
npx expo start

Assets & Branding
- App Icon – displayed on the device home screen and when the app launches

All assets are configured in app.json.

🔮 Future Improvements
- Android Health Connect integration
- Persistent storage (SQLite or AsyncStorage)
- Improved statistics and data visualization
- User authentication
- Cloud data synchronization

👩🏽‍💻 Author
Amirah
Final Year Computer Science Student