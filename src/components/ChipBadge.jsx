import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../styles/theme';

export const ChipBadge = ({ amount, size = 'normal' }) => {
  if (!amount || amount === 0) return null;

  // Determine chip style based on denomination
  let bg = Colors.chip5;
  let textColor = '#ffffff';

  if (amount >= 1000) {
    bg = Colors.chip1000;
    textColor = '#0f172a';
  } else if (amount >= 500) {
    bg = Colors.chip500;
  } else if (amount >= 100) {
    bg = Colors.chip100;
  } else if (amount >= 25) {
    bg = Colors.chip25;
  }

  const isMicro = size === 'micro';
  const isMini = size === 'mini' || isMicro;

  return (
    <View
      style={[
        styles.badgeContainer,
        { backgroundColor: bg },
        isMini && styles.badgeMini,
        isMicro && styles.badgeMicro,
      ]}
    >
      <View style={[styles.innerDottedRing, isMicro && styles.innerRingMicro]}>
        <Text
          style={[
            styles.chipText,
            { color: textColor },
            isMini && styles.chipTextMini,
            isMicro && styles.chipTextMicro,
          ]}
        >
          ${amount.toLocaleString()}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  badgeContainer: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
    alignSelf: 'center',
  },
  badgeMini: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  badgeMicro: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1,
  },
  innerDottedRing: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  innerRingMicro: {
    paddingHorizontal: 2,
    paddingVertical: 0,
    borderRadius: 6,
  },
  chipText: {
    fontFamily: 'JetBrains Mono',
    fontWeight: '700',
    fontSize: 12,
  },
  chipTextMini: {
    fontSize: 10,
  },
  chipTextMicro: {
    fontSize: 9,
    fontWeight: '800',
  },
});
