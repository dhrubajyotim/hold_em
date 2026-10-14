import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../styles/theme';
import { ChipBadge } from './ChipBadge';

export const PotDisplay = ({ totalPot, pots = [], isMobile = false }) => {
  if (!totalPot || totalPot === 0) return null;

  return (
    <View style={[styles.container, isMobile && styles.containerMobile]}>
      <View style={[styles.mainPotBadge, isMobile && styles.mainPotBadgeMobile]}>
        <Text style={[styles.mainPotLabel, isMobile && styles.mainPotLabelMobile]}>TOTAL POT</Text>
        <Text style={[styles.mainPotAmount, isMobile && styles.mainPotAmountMobile]}>
          ${totalPot.toLocaleString()}
        </Text>
      </View>

      {pots.length > 1 && (
        <View style={[styles.sidePotsRow, isMobile && styles.sidePotsRowMobile]}>
          {pots.map((pot, idx) => (
            <View key={idx} style={[styles.sidePotItem, isMobile && styles.sidePotItemMobile]}>
              <Text style={[styles.sidePotLabel, isMobile && styles.sidePotLabelMobile]}>
                {idx === 0 ? 'Main Pot' : `Side Pot ${idx}`}:
              </Text>
              <ChipBadge amount={pot.amount} size={isMobile ? 'micro' : 'mini'} />
            </View>
          ))}
        </View>
      )}
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderWidth: 1.5,
    borderColor: Colors.gold,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 5,
    alignItems: 'center',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  mainPotBadgeMobile: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 14,
    borderWidth: 1,
  },
  mainPotLabel: {
    color: Colors.gold,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  mainPotLabelMobile: {
    fontSize: 8,
    letterSpacing: 0.8,
  },
  mainPotAmount: {
    color: '#ffffff',
    fontFamily: 'JetBrains Mono',
    fontSize: 16,
    fontWeight: '800',
  },
  mainPotAmountMobile: {
    fontSize: 12,
  },
  sidePotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
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
