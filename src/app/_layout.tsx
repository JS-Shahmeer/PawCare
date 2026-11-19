import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DatabaseProvider } from '@/core/db/DatabaseProvider';
import { AlertsBootstrap } from '@/core/notifications/AlertsBootstrap';
import { usePalette, useScheme } from '@/core/ui/theme';
import { fonts } from '@/core/ui/tokens';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const scheme = useScheme();
  const p = usePalette();

  // Fall back to system fonts rather than blocking the app if fonts fail to load.
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <DatabaseProvider>
        <AlertsBootstrap />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: p.ground },
            headerStyle: { backgroundColor: p.ground },
            headerTintColor: p.primary,
            headerShadowVisible: false,
            headerTitleStyle: { fontFamily: fonts.displayBold, color: p.ink },
            headerBackButtonDisplayMode: 'minimal',
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="pet/new" options={{ headerShown: true, title: 'Add pet' }} />
          <Stack.Screen name="pet/[id]/index" options={{ headerShown: true, title: '' }} />
          <Stack.Screen name="pet/[id]/edit" options={{ headerShown: true, title: 'Edit pet' }} />
          <Stack.Screen name="care/new" options={{ headerShown: true, title: 'New reminder' }} />
          <Stack.Screen name="care/[id]/index" options={{ headerShown: true, title: '' }} />
          <Stack.Screen name="care/[id]/edit" options={{ headerShown: true, title: 'Edit reminder' }} />
          <Stack.Screen name="care/[id]/reschedule" options={{ headerShown: true, title: 'Reschedule' }} />
          <Stack.Screen name="vaccination/new" options={{ headerShown: true, title: 'Add vaccination' }} />
          <Stack.Screen name="vaccination/[id]" options={{ headerShown: true, title: 'Vaccination' }} />
          <Stack.Screen name="document/new" options={{ headerShown: true, title: 'Add document' }} />
          <Stack.Screen name="document/[id]" options={{ headerShown: true, title: 'Document' }} />
          <Stack.Screen
            name="add"
            options={{
              presentation: 'formSheet',
              sheetAllowedDetents: [0.55],
              sheetGrabberVisible: true,
              sheetCornerRadius: 24,
              contentStyle: { backgroundColor: p.surface },
            }}
          />
        </Stack>
      </DatabaseProvider>
    </SafeAreaProvider>
  );
}
