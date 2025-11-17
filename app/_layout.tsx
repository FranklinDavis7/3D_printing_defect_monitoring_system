import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    // The Stack component configures all the screens in this directory
    <Stack>
      {/* THIS IS THE LINE YOU NEED TO CHANGE */}
      <Stack.Screen
        name="index" // This refers to your index.js file
        options={{ headerShown: false }} // <-- ADD THIS OPTION HERE
      />
      
      {/* If you had other screens, you could configure them here */}
      {/* <Stack.Screen name="settings" options={{ title: "Settings" }} /> */}
    </Stack>
  );
}