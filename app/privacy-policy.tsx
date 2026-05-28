// This screen displays the Privacy Policy content in a WebView. The content is loaded from a local HTML string defined in `termsOfServiceHtml.ts`. 
// The screen also includes a back button to navigate back to the previous screen. Any links within the content that start with "mailto:" or "http" will be opened in the device's default browser or email client.
import { ActivityIndicator, Linking, View, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { PRIVACY_POLICY_HTML } from '@/src/content/privacyPolicyHtml';

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ccc' }}>
        <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={22} color="#333" />
        </Pressable>
      </View>
      <WebView
        originWhitelist={['*']}
        source={{ html: PRIVACY_POLICY_HTML }}
        javaScriptEnabled={false}
        startInLoadingState
        renderLoading={() => (
          <ActivityIndicator size="large" style={{ flex: 1 }} />
        )}
        onShouldStartLoadWithRequest={(request) => {
          const url = request.url;

          if (
            url.startsWith('mailto:') ||
            url.startsWith('http')
          ) {
            Linking.openURL(url);
            return false;
          }

          return true;
        }}
      />
    </SafeAreaView>
  );
}