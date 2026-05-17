import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { borderRadius, fontFamily, spacing, typography } from '../constants/theme';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    if (__DEV__) {
      console.warn('[AppErrorBoundary]', error, info?.componentStack);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Что-то пошло не так</Text>
          <Text style={styles.body}>Перезапустите экран или вернитесь на главную.</Text>
          <TouchableOpacity onPress={this.handleRetry} style={styles.button} activeOpacity={0.9}>
            <Text style={styles.buttonText}>Попробовать снова</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: '#F7F2FB',
  },
  title: {
    ...typography.h3,
    fontFamily: fontFamily.sansBold,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  body: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.lg,
    color: '#5C5368',
  },
  button: {
    backgroundColor: '#C4E538',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  buttonText: {
    ...typography.button,
    fontFamily: fontFamily.sansBold,
    color: '#1A1520',
  },
});
