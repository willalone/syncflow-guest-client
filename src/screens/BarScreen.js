import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BRAND_LILAC, BRAND_LIME, borderRadius, getColors, getShadows, spacing, typography } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import BrandHeaderAccent from '../components/BrandHeaderAccent';
import MenuDishCard from '../components/MenuDishCard';
import ScreenBackdrop from '../components/ScreenBackdrop';

export default function BarScreen({ dishes = [], onOpenDish }) {
  const { isDarkMode } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const colors = getColors(isDarkMode);
  const shadowsThemed = useMemo(() => getShadows(isDarkMode), [isDarkMode]);

  const barItems = useMemo(() => dishes.filter((dish) => dish.category === 'Бар'), [dishes]);
  const aperitif = barItems.filter((i) => /апероль|беллини/i.test(i.title));
  const wine = barItems.filter((i) => /pinot|вино/i.test(i.title));
  const digestif = barItems.filter((i) => !aperitif.includes(i) && !wine.includes(i));

  const sections = useMemo(
    () => [
      { id: 'aperitif', title: 'Аперитивы', items: aperitif },
      { id: 'wine', title: 'Вино и пиво', items: wine },
      { id: 'digestif', title: 'Дижестивы', items: digestif },
    ],
    [aperitif, wine, digestif]
  );

  return (
    <ScreenBackdrop isDarkMode={isDarkMode}>
      <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]}>
      <View style={styles.header}>
        <BrandHeaderAccent kicker="НАПИТКИ" />
        <Text style={[styles.title, { color: colors.text }]}>Бар</Text>
        <LinearGradient
          colors={[BRAND_LILAC, BRAND_LIME]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.titleAccent}
        />
        <Text style={[styles.subtitle, { color: colors.textLight }]}>Аперитивы, вина, пиво и дижестивы</Text>
      </View>
      <View style={[styles.constructor, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.constructorTitle, { color: colors.text }]}>Бар-конструктор</Text>
        <Text style={[styles.meta, { color: colors.textLight }]}>
          Аперитив → Вино/пиво → Дижестив. За 2 позиции бара начисляется +30 баллов.
        </Text>
      </View>
      <FlatList
        data={sections}
        keyExtractor={(section) => section.id}
        contentContainerStyle={[styles.list, { paddingBottom: spacing['2xl'] }]}
        renderItem={({ item: section }) => (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
            {section.items.length ? (
              section.items.map((item) => (
                <MenuDishCard
                  key={item.id}
                  dish={item}
                  colors={colors}
                  shadowsThemed={shadowsThemed}
                  isCompact={isCompact}
                  isTablet={false}
                  onPress={onOpenDish}
                  showFavorite={false}
                />
              ))
            ) : (
              <Text style={[styles.empty, { color: colors.textMuted }]}>Нет позиций в разделе</Text>
            )}
          </View>
        )}
      />
      </SafeAreaView>
    </ScreenBackdrop>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  title: { ...typography.h2 },
  titleAccent: { width: 44, height: 3, borderRadius: 2, marginTop: spacing.sm },
  subtitle: { ...typography.caption, marginTop: spacing.sm },
  constructor: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  constructorTitle: { ...typography.body, fontWeight: '700', marginBottom: spacing.xs },
  list: { paddingHorizontal: spacing.lg },
  section: { marginBottom: spacing.sm },
  sectionTitle: {
    ...typography.bodyLarge,
    fontWeight: '700',
    marginBottom: spacing.sm,
    paddingLeft: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: BRAND_LIME,
  },
  empty: { ...typography.body, textAlign: 'center', marginTop: spacing.xl },
});
