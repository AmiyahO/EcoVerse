import { ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { PRIVACY_POLICY_HTML } from '@/src/content/privacyPolicyHtml';

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
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