import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../styles/theme';
import { Card } from './Card';
import { ChipBadge } from './ChipBadge';
import { User, Bot, Crown } from 'lucide-react';

export const Seat = ({
  seatIndex,
  player,
  isClientTurn = false,
  isClientSeat = false,
  isDealer = false,
  isSmallBlind = false,
  isBigBlind = false,
  revealedCards = null,
  onSit = null,
  onAddBot = null,
  gameStatus = 'waiting',
  isMobile = false,
  displayPositionIndex = 0,
  seatPlacement = 'bottom',
  isWinner = false,
  winAmount = 0,
  winDescription = null,
  lastAction = null,
}) => {
  if (!player) {
    return (
      <View style={[styles.emptySeatContainer, isMobile && styles.emptySeatContainerMobile]}>
        <View style={[styles.emptySeatPod, isMobile && styles.emptySeatPodMobile]}>
          <Text style={[styles.emptySeatNumber, isMobile && styles.emptySeatNumberMobile]}>
            S{seatIndex + 1}
          </Text>
          {gameStatus === 'waiting' && (
            <View style={[styles.emptySeatActions, isMobile && styles.emptySeatActionsMobile]}>
              {onSit && (
                <TouchableOpacity
                  style={[styles.sitBtn, isMobile && styles.sitBtnMobile]}
                  onPress={() => onSit(seatIndex)}
                >
                  <Text style={[styles.sitBtnText, isMobile && styles.sitBtnTextMobile]}>Sit</Text>
                </TouchableOpacity>
              )}
              {onAddBot && (
                <TouchableOpacity
                  style={[styles.addBotBtn, isMobile && styles.addBotBtnMobile]}
                  onPress={() => onAddBot(seatIndex)}
                >
                  <Text style={[styles.addBotBtnText, isMobile && styles.addBotBtnTextMobile]}>+Bot</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    );
  }

  const { name, chips, current_bet, has_folded, is_all_in, is_bot, is_eliminated } = player;

  // Choose card size based on mobile and whether this is Hero
  const cardSize = isMobile
    ? isClientSeat
      ? 'hero'
      : 'micro'
    : isClientSeat
    ? 'normal'
    : 'mini';

  // Position bet chips and action bubble facing inward towards the felt center
  const getBetInFrontStyle = () => {
    switch (seatPlacement) {
      case 'top':
        return {
          top: '100%',
          marginTop: isMobile ? 3 : 5,
          alignSelf: 'center',
          alignItems: 'center',
        };
      case 'bottom':
        return {
          bottom: '100%',
          marginBottom: isMobile ? 3 : 5,
          alignSelf: 'center',
          alignItems: 'center',
        };
      case 'left':
        return {
          top: isMobile ? -10 : -14,
          left: isMobile ? 12 : 24,
          alignItems: 'flex-start',
        };
      case 'right':
        return {
          top: isMobile ? -10 : -14,
          right: isMobile ? 12 : 24,
          alignItems: 'flex-end',
        };
      default:
        return {
          bottom: '100%',
          marginBottom: isMobile ? 3 : 5,
          alignSelf: 'center',
          alignItems: 'center',
        };
    }
  };

  const getActionBubbleStyle = (action = '') => {
    if (action.includes('Check')) {
      return {
        backgroundColor: 'rgba(30, 58, 95, 0.95)',
        border: '1.5px solid #60a5fa',
        color: '#e0f2fe',
      };
    }
    if (action.includes('Call')) {
      return {
        backgroundColor: 'rgba(20, 83, 45, 0.95)',
        border: '1.5px solid #4ade80',
        color: '#f0fdf4',
      };
    }
    if (action.includes('All-In')) {
      return {
        backgroundColor: 'rgba(159, 18, 57, 0.95)',
        border: '1.5px solid #fbbf24',
        color: '#ffffff',
        boxShadow: '0 0 10px rgba(244, 63, 94, 0.45)',
      };
    }
    if (action.includes('Raise') || action.includes('Bet')) {
      return {
        backgroundColor: 'rgba(146, 64, 14, 0.95)',
        border: '1.5px solid #fbbf24',
        color: '#fffbeb',
      };
    }
    if (action.includes('Fold')) {
      return {
        backgroundColor: 'rgba(51, 65, 85, 0.9)',
        border: '1px solid #94a3b8',
        color: '#cbd5e1',
      };
    }
    return {
      backgroundColor: 'rgba(30, 41, 59, 0.9)',
      border: '1px solid #94a3b8',
      color: '#f8fafc',
    };
  };

  const getActionIcon = (action = '') => {
    if (action.includes('Check')) return '✓';
    if (action.includes('Call')) return '📞';
    if (action.includes('All-In')) return '⚡';
    if (action.includes('Raise')) return '▲';
    if (action.includes('Bet')) return '🪙';
    if (action.includes('Fold')) return '✕';
    return '•';
  };

  const formatActionText = (actionObj) => {
    if (!actionObj) return '';
    const act = actionObj.action || '';
    if (act.includes('Check')) return 'CHECK';
    if (act.includes('Fold')) return 'FOLD';
    if (act.includes('All-In')) return `ALL-IN ${actionObj.amount > 0 ? '$' + Number(actionObj.amount).toLocaleString() : ''}`.trim();
    if (act.includes('Call')) return `CALL ${actionObj.amount > 0 ? '$' + Number(actionObj.amount).toLocaleString() : ''}`.trim();
    if (act.includes('Raise')) return `RAISE $${Number(actionObj.amount).toLocaleString()}`;
    if (act.includes('Bet')) return `BET $${Number(actionObj.amount).toLocaleString()}`;
    return act;
  };

  return (
    <View style={[styles.seatContainer, isMobile && (isClientSeat ? styles.heroSeatContainerMobile : styles.opponentSeatContainerMobile)]}>
      {/* Winner Floating Badge */}
      {isWinner && (
        <View style={[styles.winnerFloatingTag, isMobile && styles.winnerFloatingTagMobile]}>
          <Text style={styles.winnerFloatingTagText}>🏆 +${winAmount.toLocaleString()}</Text>
        </View>
      )}

      {/* Player Action Message Bubble & Bet Chips in Front */}
      {(lastAction || current_bet > 0) && (
        <View style={[styles.betInFront, getBetInFrontStyle()]}>
          {lastAction && (
            <div
              className="action-bubble-anim"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: isMobile ? '4px 9px' : '5px 12px',
                borderRadius: '999px',
                fontSize: isMobile ? '11px' : '12px',
                fontWeight: 800,
                letterSpacing: '0.6px',
                textTransform: 'uppercase',
                fontFamily: "'Outfit', sans-serif",
                boxShadow: '0 4px 10px rgba(0, 0, 0, 0.35)',
                whiteSpace: 'nowrap',
                marginBottom: current_bet > 0 && !lastAction.action?.includes('Check') && !lastAction.action?.includes('Fold') ? 4 : 0,
                ...getActionBubbleStyle(lastAction.action),
              }}
            >
              <span>{getActionIcon(lastAction.action)}</span>
              <span>{formatActionText(lastAction)}</span>
            </div>
          )}
          {current_bet > 0 && !lastAction?.action?.includes('Check') && !lastAction?.action?.includes('Fold') && (
            <ChipBadge amount={current_bet} size={isMobile ? 'mini' : 'normal'} />
          )}
        </View>
      )}

      {/* Main Seat Pod */}
      <View
        style={[
          styles.seatPod,
          isMobile && (isClientSeat ? styles.heroPodMobile : styles.opponentPodMobile),
          isClientTurn && styles.activeTurnGlow,
          isWinner && styles.winnerPodGlow,
          has_folded && styles.foldedPod,
          is_eliminated && styles.eliminatedPod,
        ]}
      >
        {/* Dealer / Blind Badges */}
        {isDealer && (
          <View style={[styles.roleBadge, styles.dealerBadge, isMobile && styles.roleBadgeMobile]}>
            <Text style={[styles.roleBadgeText, isMobile && styles.roleBadgeTextMobile]}>D</Text>
          </View>
        )}
        {isSmallBlind && (
          <View style={[styles.roleBadge, styles.sbBadge, isMobile && styles.roleBadgeMobile]}>
            <Text style={[styles.roleBadgeText, isMobile && styles.roleBadgeTextMobile]}>SB</Text>
          </View>
        )}
        {isBigBlind && (
          <View style={[styles.roleBadge, styles.bbBadge, isMobile && styles.roleBadgeMobile]}>
            <Text style={[styles.roleBadgeText, isMobile && styles.roleBadgeTextMobile]}>BB</Text>
          </View>
        )}

        {/* Player Avatar & Status */}
        <View style={[styles.avatarRow, isMobile && !isClientSeat && styles.avatarRowMobile]}>
          <View
            style={[
              styles.avatarCircle,
              isMobile && !isClientSeat && styles.avatarCircleMobile,
              is_bot ? styles.botAvatar : styles.humanAvatar,
              isClientSeat && styles.clientAvatarHighlight,
            ]}
          >
            {is_bot ? (
              <Bot size={isMobile && !isClientSeat ? 14 : 18} color="#f8fafc" />
            ) : isClientSeat ? (
              <Crown size={isMobile ? 16 : 20} color="#dfb76c" />
            ) : (
              <User size={isMobile && !isClientSeat ? 14 : 18} color="#f8fafc" />
            )}
          </View>

          <View style={styles.playerMeta}>
            <Text
              style={[styles.playerName, isMobile && !isClientSeat && styles.playerNameMobile]}
              numberOfLines={1}
            >
              {name} {isClientSeat ? '(You)' : ''}
            </Text>
            <Text style={[styles.chipStack, isMobile && !isClientSeat && styles.chipStackMobile]}>
              {is_eliminated ? 'OUT' : is_all_in ? 'ALL-IN' : `$${chips.toLocaleString()}`}
            </Text>
            {isWinner && winDescription && (
              <View style={styles.winDescBadge}>
                <Text style={styles.winDescText} numberOfLines={1}>{winDescription}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Hole Cards */}
        {!is_eliminated && (
          <View style={[styles.cardsRow, isMobile && styles.cardsRowMobile]}>
            {revealedCards ? (
              revealedCards.map((c, i) => (
                <Card
                  key={`rev-${i}-${c ? c.rank + c.suit : 'down'}`}
                  card={c}
                  faceDown={!c}
                  size={cardSize}
                  isHighlighted={isClientSeat}
                  unfold={!!c}
                />
              ))
            ) : isClientSeat && player.hole_cards ? (
              player.hole_cards.map((c, i) => (
                <Card key={i} card={c} size={cardSize} isHighlighted={true} />
              ))
            ) : (
              <>
                <Card faceDown={true} size={cardSize} />
                <Card faceDown={true} size={cardSize} />
              </>
            )}
          </View>
        )}

        {has_folded && (
          <View style={styles.foldedOverlay}>
            <Text style={[styles.foldedText, isMobile && styles.foldedTextMobile]}>FOLD</Text>
          </View>
        )}

        {is_eliminated && (
          <View style={styles.eliminatedOverlay}>
            <Text style={[styles.eliminatedText, isMobile && styles.eliminatedTextMobile]}>OUT</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  seatContainer: {
    alignItems: 'center',
    position: 'relative',
    width: 140,
  },
  heroSeatContainerMobile: {
    width: 160,
  },
  opponentSeatContainerMobile: {
    width: 84,
  },
  emptySeatContainer: {
    width: 140,
    alignItems: 'center',
  },
  emptySeatContainerMobile: {
    width: 78,
  },
  emptySeatPod: {
    width: 120,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    alignItems: 'center',
  },
  emptySeatPodMobile: {
    width: 76,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  emptySeatNumber: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptySeatNumberMobile: {
    fontSize: 9,
    marginBottom: 3,
  },
  emptySeatActions: {
    flexDirection: 'row',
    gap: 4,
  },
  emptySeatActionsMobile: {
    gap: 2,
  },
  sitBtn: {
    backgroundColor: Colors.emerald,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sitBtnMobile: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sitBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  sitBtnTextMobile: {
    fontSize: 8,
  },
  addBotBtn: {
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.gold,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addBotBtnMobile: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  addBotBtnText: {
    color: Colors.gold,
    fontSize: 10,
    fontWeight: '700',
  },
  addBotBtnTextMobile: {
    fontSize: 8,
  },
  seatPod: {
    width: 146,
    backgroundColor: 'rgba(24, 32, 47, 0.9)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderRadius: 16,
    padding: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    alignItems: 'center',
    position: 'relative',
  },
  opponentPodMobile: {
    width: 96,
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  heroPodMobile: {
    width: 168,
    padding: 7,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(223, 183, 108, 0.6)',
    backgroundColor: 'rgba(24, 32, 47, 0.94)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  },
  activeTurnGlow: {
    borderColor: Colors.gold,
    shadowColor: Colors.gold,
    shadowOpacity: 0.7,
    shadowRadius: 12,
  },
  foldedPod: {
    opacity: 0.45,
  },
  eliminatedPod: {
    opacity: 0.3,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    marginBottom: 5,
  },
  avatarRowMobile: {
    gap: 4,
    marginBottom: 3,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  avatarCircleMobile: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
  },
  humanAvatar: {
    backgroundColor: '#2563eb',
  },
  botAvatar: {
    backgroundColor: '#7c3aed',
  },
  clientAvatarHighlight: {
    borderColor: Colors.gold,
    borderWidth: 2,
  },
  playerMeta: {
    flex: 1,
  },
  playerName: {
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.2,
  },
  playerNameMobile: {
    fontSize: 11,
    lineHeight: 13,
  },
  chipStack: {
    color: Colors.goldLight,
    fontFamily: 'JetBrains Mono',
    fontWeight: '700',
    fontSize: 12,
  },
  chipStackMobile: {
    fontSize: 10,
    lineHeight: 12,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 4,
  },
  cardsRowMobile: {
    gap: 3,
    marginTop: 2,
  },
  betInFront: {
    position: 'absolute',
    zIndex: 35,
  },
  roleBadge: {
    position: 'absolute',
    top: -10,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    zIndex: 20,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 3,
  },
  roleBadgeMobile: {
    top: -7,
    right: -4,
    width: 17,
    height: 17,
    borderRadius: 9,
    borderWidth: 1,
  },
  dealerBadge: {
    backgroundColor: Colors.gold,
  },
  sbBadge: {
    backgroundColor: '#3b82f6',
  },
  bbBadge: {
    backgroundColor: '#ef4444',
  },
  roleBadgeText: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 10,
  },
  roleBadgeTextMobile: {
    fontSize: 8,
  },
  foldedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foldedText: {
    color: Colors.crimson,
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 1.5,
  },
  foldedTextMobile: {
    fontSize: 10,
    letterSpacing: 1,
  },
  eliminatedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eliminatedText: {
    color: '#94a3b8',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 1.5,
  },
  eliminatedTextMobile: {
    fontSize: 10,
    letterSpacing: 1,
  },
  winnerPodGlow: {
    borderColor: '#eab308',
    borderWidth: 2,
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    shadowColor: '#eab308',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 16,
  },
  winnerFloatingTag: {
    position: 'absolute',
    top: -24,
    alignSelf: 'center',
    backgroundColor: '#eab308',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    zIndex: 50,
    shadowColor: '#eab308',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  winnerFloatingTagMobile: {
    top: -18,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  winnerFloatingTagText: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  winDescBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.5)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 3,
    alignSelf: 'center',
    maxWidth: '92%',
  },
  winDescText: {
    color: '#38bdf8',
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
