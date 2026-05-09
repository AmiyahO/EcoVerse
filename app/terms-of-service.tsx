import { ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { TERMS_OF_SERVICE_HTML } from '@/src/content/termsOfServiceHtml';

export default function TermsScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
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