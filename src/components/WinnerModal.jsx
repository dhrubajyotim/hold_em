import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../styles/theme';
import { Trophy, Award, RotateCcw, LogOut } from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundManager } from '../services/sound';

export const WinnerModal = ({
  winnerName,
  standings = [],
  onPlayAgain,
  onLeaveTable,
  isMobile = false,
}) => {
  useEffect(() => {
    soundManager.playTournamentWin();

    // Trigger luxury casino confetti
    const duration = 3.5 * 1000;
    const end = Date.now() + duration;

    const interval = setInterval(() => {
      if (Date.now() > end) {
        return clearInterval(interval);
      }
      confetti({
        startVelocity: 30,
        spread: 360,
        ticks: 60,
        origin: { x: Math.random(), y: Math.random() - 0.2 },
        colors: ['#d4af37', '#f6e27a', '#38bdf8', '#ef4444', '#ffffff'],
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.overlay}>
      <View style={[styles.modal, isMobile && styles.modalMobile]}>
        {/* Trophy Icon */}
        <View style={[styles.trophyContainer, isMobile && styles.trophyContainerMobile]}>
          <Trophy size={isMobile ? 36 : 48} color={Colors.gold} />
        </View>

        <Text style={[styles.championLabel, isMobile && styles.championLabelMobile]}>
          TOURNAMENT CHAMPION
        </Text>
        <Text style={[styles.winnerName, isMobile && styles.winnerNameMobile]}>
          {winnerName}
        </Text>

        {/* Final Standings Leaderboard */}
        <View style={[styles.standingsBox, isMobile && styles.standingsBoxMobile]}>
          <Text style={styles.standingsTitle}>FINAL STANDINGS</Text>
          {standings.map((item, idx) => (
            <View key={idx} style={[styles.standingRow, idx === 0 && styles.firstPlaceRow]}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>#{item.rank || idx + 1}</Text>
              </View>
              <Text style={[styles.playerText, idx === 0 && styles.firstPlaceText]}>
                {item.name}
              </Text>
              {idx === 0 && <Award size={16} color={Colors.gold} />}
            </View>
          ))}
        </View>

        {/* Actions Row: Play Again & Leave Table */}
        <View style={[styles.buttonGroup, isMobile && styles.buttonGroupMobile]}>
          <TouchableOpacity
            style={[styles.playAgainBtn, isMobile && styles.playAgainBtnMobile]}
            onPress={onPlayAgain}
          >
            <RotateCcw size={16} color="#000000" />
            <Text style={styles.playAgainText}>NEW TOURNAMENT</Text>
          </TouchableOpacity>

          {onLeaveTable && (
            <TouchableOpacity
              style={[styles.leaveBtn, isMobile && styles.leaveBtnMobile]}
              onPress={onLeaveTable}
            >
              <LogOut size={16} color="#ffffff" />
              <Text style={styles.leaveBtnText}>LEAVE TABLE</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: 16,
  },
  modal: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.gold,
    padding: 24,
    width: '90%',
    maxWidth: 440,
    alignItems: 'center',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.8,
    shadowRadius: 25,
  },
  modalMobile: {
    padding: 16,
    borderRadius: 16,
  },
  trophyContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderWidth: 2,
    borderColor: Colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
  },
  trophyContainerMobile: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 12,
  },
  championLabel: {
    color: Colors.gold,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 4,
  },
  championLabelMobile: {
    fontSize: 10,
    letterSpacing: 1.5,
  },
  winnerName: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 20,
    textAlign: 'center',
  },
  winnerNameMobile: {
    fontSize: 20,
    marginBottom: 14,
  },
  standingsBox: {
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    marginBottom: 20,
    maxHeight: 220,
  },
  standingsBoxMobile: {
    padding: 8,
    marginBottom: 14,
  },
  standingsTitle: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  standingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 2,
  },
  firstPlaceRow: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  rankBadge: {
    width: 28,
  },
  rankText: {
    color: Colors.textMuted,
    fontFamily: 'JetBrains Mono',
    fontWeight: '700',
    fontSize: 12,
  },
  playerText: {
    flex: 1,
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  firstPlaceText: {
    color: Colors.goldLight,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    justifyContent: 'center',
  },
  buttonGroupMobile: {
    flexDirection: 'column',
    gap: 8,
  },
  playAgainBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.gold,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  playAgainBtnMobile: {
    paddingVertical: 10,
    borderRadius: 10,
  },
  playAgainText: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.8,
  },
  leaveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  leaveBtnMobile: {
    paddingVertical: 10,
    borderRadius: 10,
  },
  leaveBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.8,
  },
});
