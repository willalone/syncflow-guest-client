import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { getColors, spacing, borderRadius, typography, shadows } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

const departments = ['Все', 'Кухня', 'Бар', 'Зал', 'Администрация'];

const messages = [
  {
    id: 1,
    department: 'Кухня',
    sender: 'Шеф-повар',
    text: 'Стейки будут готовы через 10 минут',
    time: '14:25',
    type: 'info',
  },
  {
    id: 2,
    department: 'Зал',
    sender: 'Официант #1',
    text: 'Стол 12 просит счет',
    time: '14:20',
    type: 'request',
  },
  {
    id: 3,
    department: 'Бар',
    sender: 'Бармен',
    text: 'Закончилось вино красное',
    time: '14:15',
    type: 'alert',
  },
];

export default function ChatScreen() {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const [selectedDepartment, setSelectedDepartment] = useState('Все');
  const [messageText, setMessageText] = useState('');

  const filteredMessages =
    selectedDepartment === 'Все'
      ? messages
      : messages.filter((msg) => msg.department === selectedDepartment);

  const getMessageColor = (type) => {
    switch (type) {
      case 'alert':
        return colors.error;
      case 'request':
        return colors.accent;
      case 'info':
        return colors.info;
      default:
        return colors.primary;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Сменный чат</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.departmentsScroll}
        contentContainerStyle={styles.departmentsContent}
      >
        {departments.map((dept) => (
          <TouchableOpacity
            key={dept}
            style={[
              styles.departmentButton,
              {
                backgroundColor:
                  selectedDepartment === dept ? colors.primary : colors.card,
                borderColor: colors.border,
              },
            ]}
            onPress={() => setSelectedDepartment(dept)}
          >
            <Text
              style={[
                styles.departmentText,
                {
                  color: selectedDepartment === dept ? colors.white : colors.text,
                },
              ]}
            >
              {dept}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.messagesScroll} contentContainerStyle={styles.messagesContent}>
        {filteredMessages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageBubble,
              {
                backgroundColor: colors.card,
                borderLeftColor: getMessageColor(message.type),
              },
            ]}
          >
            <View style={styles.messageHeader}>
              <Text style={[styles.messageSender, { color: colors.text }]}>
                {message.sender}
              </Text>
              <Text style={[styles.messageTime, { color: colors.textLight }]}>
                {message.time}
              </Text>
            </View>
            <Text style={[styles.messageText, { color: colors.text }]}>
              {message.text}
            </Text>
            <Text style={[styles.messageDepartment, { color: colors.textMuted }]}>
              {message.department}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.backgroundLight,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
          placeholder="Написать сообщение..."
          placeholderTextColor={colors.textMuted}
          value={messageText}
          onChangeText={setMessageText}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: colors.primary }]}
          onPress={() => {
            setMessageText('');
          }}
        >
          <Text style={[styles.sendButtonText, { color: colors.white }]}>Отправить</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    ...shadows.small,
  },
  title: {
    ...typography.h2,
  },
  departmentsScroll: {
    maxHeight: 60,
  },
  departmentsContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  departmentButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  departmentText: {
    ...typography.caption,
    fontWeight: '600',
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing.lg,
  },
  messageBubble: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    ...shadows.small,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  messageSender: {
    ...typography.body,
    fontWeight: '600',
  },
  messageTime: {
    ...typography.caption,
  },
  messageText: {
    ...typography.body,
    marginBottom: spacing.xs,
  },
  messageDepartment: {
    ...typography.caption,
    fontSize: 10,
  },
  inputContainer: {
    padding: spacing.md,
    borderTopWidth: 1,
    ...shadows.medium,
  },
  input: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
    minHeight: 50,
    maxHeight: 100,
    ...typography.body,
  },
  sendButton: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.small,
  },
  sendButtonText: {
    ...typography.button,
  },
});

