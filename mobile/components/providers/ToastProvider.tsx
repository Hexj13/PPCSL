import Toast from 'react-native-toast-message';

export function ToastProvider() {
  return <Toast position="bottom" bottomOffset={80} />;
}

export function showToast(type: 'success' | 'error' | 'info', text1: string, text2?: string) {
  Toast.show({ type, text1, text2, visibilityTime: 3000 });
}
