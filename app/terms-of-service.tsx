import { ActivityIndicator, Linking, View, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { TERMS_OF_SERVICE_HTML } from '@/src/content/termsOfServiceHtml';

export default function TermsScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ccc' }}>
        <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={22} color="#333" />
        </Pressable>
      </View>
      <WebView
        originWhitelist={['*']}
        source={{ html: TERMS_OF_SERVICE_HTML }}
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