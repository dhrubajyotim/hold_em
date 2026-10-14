import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../styles/theme';
import { ChipBadge } from './ChipBadge';

export const PotDisplay = ({ totalPot, isMobile = false }) => {
  if (!totalPot || totalPot === 0) return null;

  return (
    <View style={[styles.container, isMobile && styles.containerMobile]}>
      <View style={[styles.mainPotBadge, isMobile && styles.mainPotBadgeMobile]}>
        <Text style={[styles.mainPotLabel, isMobile && styles.mainPotLabelMobile]}>TOTAL POT</Text>
        <Text style={[styles.mainPotAmount, isMobile && styles.mainPotAmountMobile]}>
          ${totalPot.toLocaleString()}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 8,
  },
  containerMobile: {
    marginBottom: 4,
  },
  mainPotBadge: {
    backgroundColor: 'rgba(24, 32, 47, 0.92)',
    backdropFilter: 'blur(12px)',
    borderWidth: 1.5,
    borderColor: Colors.gold,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 6,
    alignItems: 'center',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  mainPotBadgeMobile: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  mainPotLabel: {
    color: Colors.gold,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  mainPotLabelMobile: {
    fontSize: 9,
    letterSpacing: 1,
  },
  mainPotAmount: {
    color: '#ffffff',
    fontFamily: 'JetBrains Mono',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  mainPotAmountMobile: {
    fontSize: 14,
  },
  sidePotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 5,
  },
  sidePotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sidePotLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
});
