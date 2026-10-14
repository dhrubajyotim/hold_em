import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const suitSymbols = {
  Spades: '♠',
  Hearts: '♥',
  Diamonds: '♦',
  Clubs: '♣',
};

const suitColors = {
  Spades: '#292524',
  Clubs: '#292524',
  Hearts: '#e11d48',
  Diamonds: '#e11d48',
};

export const Card = ({ card, faceDown = false, isHighlighted = false, size = 'normal', unfold = false }) => {
  const isMicro = size === 'micro';
  const isMini = size === 'mini';
  const isMobile = size === 'mobile';
  const isHero = size === 'hero';

  const cardSizeStyle = isMicro
    ? styles.cardMicro
    : isMini
    ? styles.cardMini
    : isMobile
    ? styles.cardMobile
    : isHero
    ? styles.cardHero
    : styles.cardNormal;

  if (faceDown || !card) {
    return (
      <View
        style={[
          styles.card,
          cardSizeStyle,
          styles.faceDown,
          isHighlighted && styles.highlighted,
        ]}
      >
        <View style={styles.cardBackPattern}>
          <Text style={[styles.cardBackIcon, (isMicro || isMini) && { fontSize: 13 }]}>♠</Text>
        </View>
      </View>
    );
  }

  const symbol = suitSymbols[card.suit] || '♠';
  const color = suitColors[card.suit] || '#1e293b';

  return (
    <View
      className={unfold ? 'card-unfold-anim' : undefined}
      style={[
        styles.card,
        cardSizeStyle,
        isHighlighted && styles.highlighted,
      ]}
    >
      <View style={styles.cornerTopLeft}>
        <Text
          style={[
            styles.rankText,
            isMicro
              ? styles.rankTextMicro
              : isMini
              ? styles.rankTextMini
              : isMobile
              ? styles.rankTextMobile
              : null,
            { color },
          ]}
        >
          {card.rank_str || getRankStr(card.rank)}
        </Text>
        <Text
          style={[
            styles.suitText,
            isMicro
              ? styles.suitTextMicro
              : isMini
              ? styles.suitTextMini
              : isMobile
              ? styles.suitTextMobile
              : null,
            { color },
          ]}
        >
          {symbol}
        </Text>
      </View>

      <View style={styles.centerSuit}>
        <Text
          style={[
            styles.bigSuit,
            isMicro
              ? styles.bigSuitMicro
              : isMini
              ? styles.bigSuitMini
              : isMobile
              ? styles.bigSuitMobile
              : null,
            { color },
          ]}
        >
          {symbol}
        </Text>
      </View>

      <View style={styles.cornerBottomRight}>
        <Text
          style={[
            styles.rankText,
            isMicro
              ? styles.rankTextMicro
              : isMini
              ? styles.rankTextMini
              : isMobile
              ? styles.rankTextMobile
              : null,
            { color },
          ]}
        >
          {card.rank_str || getRankStr(card.rank)}
        </Text>
        <Text
          style={[
            styles.suitText,
            isMicro
              ? styles.suitTextMicro
              : isMini
              ? styles.suitTextMini
              : isMobile
              ? styles.suitTextMobile
              : null,
            { color },
          ]}
        >
          {symbol}
        </Text>
      </View>
    </View>
  );
};

function getRankStr(rank) {
  if (rank === 14) return 'A';
  if (rank === 13) return 'K';
  if (rank === 12) return 'Q';
  if (rank === 11) return 'J';
  return String(rank || '');
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fafaf9', // Warm ivory linen, zero blinding glare
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#d6d3d1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    position: 'relative',
    justifyContent: 'space-between',
    padding: 3,
    userSelect: 'none',
  },
  cardNormal: {
    width: 60,
    height: 84,
    borderRadius: 8,
    padding: 4,
  },
  cardHero: {
    width: 50,
    height: 70,
    borderRadius: 7,
    padding: 3,
  },
  cardMobile: {
    width: 36,
    height: 52,
    borderRadius: 5,
    padding: 2,
  },
  cardMini: {
    width: 36,
    height: 50,
    borderRadius: 5,
    padding: 2,
  },
  cardMicro: {
    width: 28,
    height: 40,
    borderRadius: 4,
    padding: 1,
  },
  faceDown: {
    backgroundColor: '#1e293b',
    borderColor: '#dfb76c',
    borderWidth: 1.5,
    padding: 2,
  },
  cardBackPattern: {
    flex: 1,
    backgroundColor: '#18202f',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(223, 183, 108, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBackIcon: {
    color: '#dfb76c',
    fontSize: 18,
    opacity: 0.85,
  },
  cornerTopLeft: {
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  cornerBottomRight: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    transform: [{ rotate: '180deg' }],
  },
  rankText: {
    fontFamily: 'Outfit',
    fontWeight: '800',
    fontSize: 14,
    lineHeight: 15,
  },
  rankTextMobile: {
    fontSize: 11,
    lineHeight: 12,
  },
  rankTextMini: {
    fontSize: 10,
    lineHeight: 11,
  },
  rankTextMicro: {
    fontSize: 9,
    lineHeight: 9,
  },
  suitText: {
    fontSize: 12,
    lineHeight: 13,
  },
  suitTextMobile: {
    fontSize: 10,
    lineHeight: 11,
  },
  suitTextMini: {
    fontSize: 9,
    lineHeight: 10,
  },
  suitTextMicro: {
    fontSize: 8,
    lineHeight: 8,
  },
  centerSuit: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  bigSuit: {
    fontSize: 26,
    opacity: 0.9,
  },
  bigSuitMobile: {
    fontSize: 18,
  },
  bigSuitMini: {
    fontSize: 14,
  },
  bigSuitMicro: {
    fontSize: 11,
  },
  highlighted: {
    borderColor: '#38bdf8',
    borderWidth: 2,
    shadowColor: '#38bdf8',
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
});
