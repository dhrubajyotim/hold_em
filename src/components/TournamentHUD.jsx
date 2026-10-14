import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../styles/theme';
import { Volume2, VolumeX, Users, Shield, LogOut } from 'lucide-react';

export const TournamentHUD = ({
  roomCode,
  blinds,
  handsPlayed = 0,
  activePlayersCount = 0,
  totalSeats = 10,
  isMuted,
  onToggleMute,
  isMobile = false,
  onLeaveTable,
  isPlaying = false,
  blindIntervalHands = 5,
}) => {
  return (
    <View style={[styles.hudContainer, isMobile && styles.hudContainerMobile]}>
      {/* Left: Tournament & Room Code / Back Button */}
      <View style={styles.roomInfo}>
        <View style={styles.titleRow}>
          <Shield size={isMobile ? 13 : 16} color={Colors.gold} />
          <Text style={[styles.titleText, isMobile && styles.titleTextMobile]}>
            {isMobile ? 'HOLD\'EM' : 'TOURNAMENT HOLD\'EM'}
          </Text>
        </View>
        <View style={[styles.roomCodeBadge, isMobile && styles.roomCodeBadgeMobile]}>
          <Text style={[styles.roomCodeLabel, isMobile && styles.roomCodeLabelMobile]}>ROOM:</Text>
          <Text style={[styles.roomCodeValue, isMobile && styles.roomCodeValueMobile]}>{roomCode}</Text>
        </View>
      </View>

      {/* Center: Blind Stakes & Hands */}
      <View style={styles.blindsInfo}>
        <View style={[styles.blindsBadge, isMobile && styles.blindsBadgeMobile]}>
          <Text style={[styles.levelLabel, isMobile && styles.levelLabelMobile]}>
            L{blinds?.level || 1}
          </Text>
          <Text style={[styles.blindsValue, isMobile && styles.blindsValueMobile]}>
            ${blinds?.small_blind || 10}/${blinds?.big_blind || 20}
          </Text>
          {blinds?.ante > 0 && (
            <Text style={[styles.anteValue, isMobile && styles.anteValueMobile]}>
              +{blinds.ante}
            </Text>
          )}
        </View>
        {!isMobile && (
          <Text style={styles.handsCounter}>Hand #{handsPlayed + 1} (Escalates every {blindIntervalHands})</Text>
        )}
      </View>

      {/* Right: Players Count, Sound Toggle & Leave Button */}
      <View style={[styles.rightActions, isMobile && styles.rightActionsMobile]}>
        <View style={[styles.playerCountBadge, isMobile && styles.playerCountBadgeMobile]}>
          <Users size={isMobile ? 12 : 14} color={Colors.cyan} />
          <Text style={[styles.playerCountText, isMobile && styles.playerCountTextMobile]}>
            {activePlayersCount}/{totalSeats}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.muteButton, isMobile && styles.muteButtonMobile]}
          onPress={onToggleMute}
          title={isMuted ? "Unmute Sound" : "Mute Sound"}
        >
          {isMuted ? (
            <VolumeX size={isMobile ? 15 : 18} color={Colors.crimson} />
          ) : (
            <Volume2 size={isMobile ? 15 : 18} color={Colors.gold} />
          )}
        </TouchableOpacity>

        {onLeaveTable && (
          <TouchableOpacity
            style={[styles.leaveButton, isMobile && styles.leaveButtonMobile]}
            onPress={onLeaveTable}
            title="Leave Table"
          >
            <LogOut size={isMobile ? 13 : 15} color="#cbd5e1" />
            {!isMobile && <Text style={styles.leaveText}>Leave</Text>}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  hudContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: 'rgba(18, 22, 31, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(223, 183, 108, 0.25)',
    zIndex: 100,
  },
  hudContainerMobile: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  roomInfo: {
    alignItems: 'flex-start',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  titleText: {
    color: Colors.gold,
    fontFamily: 'Cinzel',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 1.4,
  },
  titleTextMobile: {
    fontSize: 12,
    letterSpacing: 1,
  },
  roomCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  roomCodeBadgeMobile: {
    marginTop: 1,
  },
  roomCodeLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  roomCodeLabelMobile: {
    fontSize: 9,
  },
  roomCodeValue: {
    color: Colors.goldLight,
    fontFamily: 'JetBrains Mono',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.8,
  },
  roomCodeValueMobile: {
    fontSize: 11,
  },
  blindsInfo: {
    alignItems: 'center',
  },
  blindsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(223, 183, 108, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(223, 183, 108, 0.35)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  blindsBadgeMobile: {
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  levelLabel: {
    color: Colors.gold,
    fontWeight: '800',
    fontSize: 12,
  },
  levelLabelMobile: {
    fontSize: 10,
  },
  blindsValue: {
    color: '#ffffff',
    fontFamily: 'JetBrains Mono',
    fontWeight: '800',
    fontSize: 14,
  },
  blindsValueMobile: {
    fontSize: 12,
  },
  anteValue: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
  anteValueMobile: {
    fontSize: 10,
  },
  handsCounter: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 3,
    fontWeight: '600',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rightActionsMobile: {
    gap: 8,
  },
  playerCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(96, 165, 250, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  playerCountBadgeMobile: {
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  playerCountText: {
    color: Colors.cyan,
    fontSize: 13,
    fontWeight: '700',
  },
  playerCountTextMobile: {
    fontSize: 11,
  },
  muteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  muteButtonMobile: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  leaveButtonMobile: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
  },
  leaveText: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '700',
  },
});
