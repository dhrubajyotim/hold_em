import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../styles/theme';
import { soundManager } from '../services/sound';

export const ActionConsole = ({
  isMyTurn,
  callAmount = 0,
  minRaise = 0,
  maxRaise = 0,
  currentBet = 0,
  totalPot = 0,
  onAction,
  isMobile = false,
  currentTurnPlayerName = null,
}) => {
  const [raiseAmount, setRaiseAmount] = useState(minRaise);

  useEffect(() => {
    setRaiseAmount(Math.min(minRaise, maxRaise));
  }, [minRaise, maxRaise]);

  if (!isMyTurn) {
    return (
      <View style={[styles.idleContainer, isMobile && styles.idleContainerMobile]}>
        <View style={styles.idleIndicatorDot} />
        <Text style={[styles.idleText, isMobile && styles.idleTextMobile]}>
          {currentTurnPlayerName ? `Waiting for ${currentTurnPlayerName}...` : 'Waiting for action...'}
        </Text>
      </View>
    );
  }

  const canCheck = callAmount === 0;

  const handleFold = () => {
    onAction('Fold');
  };

  const handleCheckOrCall = () => {
    if (canCheck) {
      onAction('Check');
    } else {
      onAction('Call', callAmount);
    }
  };

  const handleRaise = () => {
    if (raiseAmount >= maxRaise) {
      onAction('AllIn', maxRaise);
    } else {
      onAction('Raise', raiseAmount);
    }
  };

  const setPresetRaise = (fraction) => {
    let amt;
    if (fraction === 1) {
      // Pot size raise
      amt = Math.max(minRaise, currentBet + callAmount + totalPot);
    } else if (fraction === 0.5) {
      // Half pot
      amt = Math.max(minRaise, currentBet + callAmount + Math.floor(totalPot / 2));
    } else if (fraction === 'allin') {
      amt = maxRaise;
    } else {
      amt = minRaise;
    }
    setRaiseAmount(Math.min(amt, maxRaise));
  };

  const sliderProgress = maxRaise > minRaise
    ? Math.max(0, Math.min(100, ((raiseAmount - minRaise) / (maxRaise - minRaise)) * 100))
    : 100;

  return (
    <View style={[styles.container, isMobile && styles.containerMobile]}>
      {/* Quick Bet Presets Row (iOS Pill Chips) */}
      <View style={[styles.presetsRow, isMobile && styles.presetsRowMobile]}>
        <TouchableOpacity
          style={[styles.presetBtn, isMobile && styles.presetBtnMobile]}
          onPress={() => setPresetRaise('min')}
        >
          <Text style={[styles.presetText, isMobile && styles.presetTextMobile]}>Min</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.presetBtn, isMobile && styles.presetBtnMobile]}
          onPress={() => setPresetRaise(0.5)}
        >
          <Text style={[styles.presetText, isMobile && styles.presetTextMobile]}>1/2 Pot</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.presetBtn, isMobile && styles.presetBtnMobile]}
          onPress={() => setPresetRaise(1)}
        >
          <Text style={[styles.presetText, isMobile && styles.presetTextMobile]}>Pot</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.presetBtn, styles.allInPresetBtn, isMobile && styles.presetBtnMobile]}
          onPress={() => setPresetRaise('allin')}
        >
          <Text style={[styles.presetText, styles.allInPresetText, isMobile && styles.presetTextMobile]}>
            All-In
          </Text>
        </TouchableOpacity>
        <View style={styles.amountPill}>
          <Text style={styles.amountPillLabel}>BET</Text>
          <Text style={styles.amountPillValue}>${raiseAmount.toLocaleString()}</Text>
        </View>
      </View>

      {/* iOS Fluid Range Slider */}
      {maxRaise > minRaise && (
        <View style={styles.sliderContainer}>
          <input
            type="range"
            min={minRaise}
            max={maxRaise}
            step={Math.max(1, Math.floor(minRaise / 2) || 10)}
            value={raiseAmount}
            onChange={(e) => {
              const val = Number(e.target.value);
              setRaiseAmount(val);
            }}
            className="ios-slider"
            style={{
              background: `linear-gradient(to right, #d4af37 0%, #f6e27a ${sliderProgress}%, rgba(255, 255, 255, 0.15) ${sliderProgress}%, rgba(255, 255, 255, 0.15) 100%)`,
            }}
          />
          <View style={styles.sliderLabelsRow}>
            <Text style={styles.sliderLabelMin}>${minRaise.toLocaleString()}</Text>
            <Text style={styles.sliderLabelMax}>All-In (${maxRaise.toLocaleString()})</Text>
          </View>
        </View>
      )}

      {/* Main Action Buttons (iOS Glass Cards) */}
      <View style={[styles.buttonsRow, isMobile && styles.buttonsRowMobile]}>
        {/* Fold Button */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.foldBtn, isMobile && styles.actionBtnMobile]}
          onPress={handleFold}
        >
          <Text style={[styles.actionBtnText, isMobile && styles.actionBtnTextMobile]}>FOLD</Text>
        </TouchableOpacity>

        {/* Check / Call Button */}
        <TouchableOpacity
          style={[
            styles.actionBtn,
            canCheck ? styles.checkBtn : styles.callBtn,
            isMobile && styles.actionBtnMobile,
          ]}
          onPress={handleCheckOrCall}
        >
          <Text style={[styles.actionBtnText, isMobile && styles.actionBtnTextMobile]}>
            {canCheck ? 'CHECK' : 'CALL'}
          </Text>
          {!canCheck && (
            <Text style={[styles.subActionText, isMobile && styles.subActionTextMobile]}>
              ${callAmount.toLocaleString()}
            </Text>
          )}
        </TouchableOpacity>

        {/* Bet / Raise Button */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.raiseBtn, isMobile && styles.actionBtnMobile]}
          onPress={handleRaise}
          disabled={maxRaise <= 0}
        >
          <Text style={[styles.actionBtnText, isMobile && styles.actionBtnTextMobile]}>
            {raiseAmount >= maxRaise ? 'ALL-IN' : canCheck ? 'BET' : 'RAISE'}
          </Text>
          <Text style={[styles.subActionText, isMobile && styles.subActionTextMobile]}>
            ${raiseAmount.toLocaleString()}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(24, 32, 47, 0.94)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: 22,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
  },
  containerMobile: {
    maxWidth: '100%',
    borderRadius: 18,
    padding: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    backgroundColor: 'rgba(24, 32, 47, 0.96)',
  },
  idleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: 'rgba(24, 32, 47, 0.85)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  idleContainerMobile: {
    padding: 9,
    borderRadius: 14,
  },
  idleIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gold,
    opacity: 0.95,
  },
  idleText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  idleTextMobile: {
    fontSize: 12,
  },
  presetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  presetsRowMobile: {
    gap: 4,
    marginBottom: 6,
  },
  presetBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  presetBtnMobile: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },
  presetText: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '700',
  },
  presetTextMobile: {
    fontSize: 11,
  },
  allInPresetBtn: {
    backgroundColor: 'rgba(244, 63, 94, 0.18)',
    borderColor: 'rgba(244, 63, 94, 0.4)',
  },
  allInPresetText: {
    color: '#fb7185',
  },
  amountPill: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(223, 183, 108, 0.4)',
  },
  amountPillLabel: {
    color: Colors.gold,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  amountPillValue: {
    color: '#ffffff',
    fontFamily: 'JetBrains Mono',
    fontWeight: '800',
    fontSize: 14,
  },
  sliderContainer: {
    width: '100%',
    paddingHorizontal: 2,
    marginBottom: 8,
  },
  sliderLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -2,
  },
  sliderLabelMin: {
    color: '#64748b',
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    fontWeight: '600',
  },
  sliderLabelMax: {
    color: Colors.gold,
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    fontWeight: '700',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  buttonsRowMobile: {
    gap: 6,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  actionBtnMobile: {
    paddingVertical: 11,
    minHeight: 48,
    borderRadius: 14,
  },
  foldBtn: {
    backgroundColor: '#9f1239', // Soothing rose-crimson, not laser red
  },
  checkBtn: {
    backgroundColor: '#0369a1', // Soothing ocean blue
  },
  callBtn: {
    backgroundColor: '#15803d', // Calming deep emerald green
  },
  raiseBtn: {
    backgroundColor: '#b45309', // Warm amber-ochre
    borderColor: 'rgba(251, 191, 36, 0.35)',
  },
  actionBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.8,
  },
  actionBtnTextMobile: {
    fontSize: 13,
    letterSpacing: 0.5,
  },
  subActionText: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontFamily: 'JetBrains Mono',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  subActionTextMobile: {
    fontSize: 11,
    marginTop: 1,
  },
});
