import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { borderRadius, spacing, typography } from '../../constants/theme';

export default function DeleteAccountModal({ visible, colors, onDelete, onCancel }) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Удалить аккаунт?</Text>
          <Text style={[styles.modalText, { color: colors.textLight }]}>
            Аккаунт и связанные данные будут удалены. Это действие нельзя отменить.
          </Text>
          <TouchableOpacity style={[styles.modalDangerBtn, { backgroundColor: colors.error }]} onPress={onDelete}>
            <Text style={[styles.modalDangerText, { color: colors.white }]}>Удалить</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modalCancelBtn, { borderColor: colors.border }]} onPress={onCancel}>
            <Text style={[styles.modalCancelText, { color: colors.text }]}>Отмена</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  modalTitle: {
    ...typography.h4,
    marginBottom: spacing.xs,
  },
  modalText: {
    ...typography.body,
    marginBottom: spacing.md,
  },
  modalDangerBtn: {
    borderRadius: borderRadius.md,
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.xs,
  },
  modalDangerText: {
    ...typography.button,
    fontWeight: '700',
  },
  modalCancelBtn: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  modalCancelText: {
    ...typography.button,
    fontWeight: '600',
  },
});
