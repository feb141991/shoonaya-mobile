import { Component, type PropsWithChildren, type ReactNode } from 'react';
import { Pressable, Text, useColorScheme, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, FONTS } from '@/lib/constants';

type ErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

type ErrorBoundaryProps = PropsWithChildren<{
  fallbackTitle?: string;
  fallbackSubtitle?: string;
  onRetry?: () => void;
}>;

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { hasError: true, message };
  }

  override componentDidCatch(error: unknown) {
    console.error('[ErrorBoundary]', error);
  }

  reset = () => {
    this.setState({ hasError: false, message: '' });
    this.props.onRetry?.();
  };

  override render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return <ErrorFallback onRetry={this.reset} />;
  }
}

// Functional fallback — reads theme from context
function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        gap: 14,
        backgroundColor: COLORS.creamBg,
      }}
    >
      <View
        style={{
          width: 68,
          height: 68,
          borderRadius: 34,
          backgroundColor: COLORS.cardBgLight,
          borderWidth: 1,
          borderColor: COLORS.borderLight,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Feather name="alert-triangle" size={28} color={COLORS.brandGold} />
      </View>

      <Text
        style={{
          fontFamily: FONTS.serifBold,
          fontSize: 22,
          color: COLORS.ink,
          textAlign: 'center',
        }}
      >
        Something went wrong
      </Text>

      <Text
        style={{
          fontFamily: FONTS.sans,
          fontSize: 14,
          color: COLORS.textDimLight,
          textAlign: 'center',
          lineHeight: 21,
        }}
      >
        An error occurred loading this section. Your progress is safe.
      </Text>

      <Pressable
        onPress={onRetry}
        style={{
          marginTop: 8,
          borderRadius: 20,
          backgroundColor: COLORS.brandGold,
          paddingHorizontal: 28,
          paddingVertical: 14,
        }}
      >
        <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, color: COLORS.ink }}>
          Try again 🙏
        </Text>
      </Pressable>
    </View>
  );
}
