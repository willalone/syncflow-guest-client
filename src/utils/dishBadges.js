export function getRoleBadge(dish) {
  if (dish.role) return dish.role;
  if (dish.category === 'Основные блюда' && dish.price >= 1200) return 'Премиум-якорь';
  if (dish.category === 'Основные блюда') return 'Локомотив';
  if (dish.category === 'Гарниры' || dish.category === 'Бар') return 'Спутник';
  if (dish.category === 'Закуски') return 'Беспроигрышное';
  return 'Дойная корова';
}

export function getRoleColor(role) {
  if (role === 'Локомотив') return '#E8A87C';
  if (role === 'Премиум-якорь') return '#C4A8E0';
  if (role === 'Спутник') return '#8EC5D8';
  if (role === 'Беспроигрышное') return '#9DC9A4';
  if (role === 'Детское') return '#E8B8D4';
  return '#A8B5C8';
}

export function getRoleLabel(role) {
  if (role === 'Локомотив') return 'ХИТ';
  if (role === 'Премиум-якорь') return 'ПРЕМИУМ';
  if (role === 'Спутник') return 'ДОПОЛНЕНИЕ';
  if (role === 'Беспроигрышное') return 'БАЗОВОЕ';
  if (role === 'Детское') return 'ДЕТСКОЕ';
  return 'ВЫГОДНО';
}
