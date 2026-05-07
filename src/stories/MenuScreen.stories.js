import React from 'react';
import { View } from 'react-native';
import MenuScreen from '../screens/MenuScreen';
import { ThemeProvider } from '../contexts/ThemeContext';

export default {
  title: 'Screens/MenuScreen',
  component: MenuScreen,
};

export function Default() {
  return (
    <ThemeProvider>
      <View style={{ flex: 1, height: 900 }}>
        <MenuScreen onOpenDish={() => {}} dishes={[]} categories={['Все']} />
      </View>
    </ThemeProvider>
  );
}
