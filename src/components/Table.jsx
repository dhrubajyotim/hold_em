import React, { useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Colors } from '../styles/theme';
import { Card } from './Card';
import { PotDisplay } from './PotDisplay';
import { Seat } from './Seat';
import { ActionConsole } from './ActionConsole';

// Dynamic seat position layouts based on player count (2 to 7 players)
// Pos 0 is always bottom center (Hero / client view perspective), subsequent positions follow clockwise
const LAYOUTS_DESKTOP = {
  2: [
    { bottom: 15, left: '50%', transform: [{ translateX: -70 }] }, // Pos 0: Hero (Bottom Center)
    { top: 20, left: '50%', transform: [{ translateX: -70 }] },    // Pos 1: Opponent (Top Center)
  ],
  3: [
    { bottom: 15, left: '50%', transform: [{ translateX: -70 }] }, // Pos 0: Hero (Bottom Center)
    { top: 24, left: '26%', transform: [{ translateX: -70 }] },    // Pos 1: Top Left
    { top: 24, left: '74%', transform: [{ translateX: -70 }] },    // Pos 2: Top Right
  ],
  4: [
    { bottom: 15, left: '50%', transform: [{ translateX: -70 }] }, // Pos 0: Bottom Center
    { top: '45%', left: 16, transform: [{ translateY: -35 }] },    // Pos 1: Mid Left
    { top: 20, left: '50%', transform: [{ translateX: -70 }] },    // Pos 2: Top Center
    { top: '45%', right: 16, transform: [{ translateY: -35 }] },   // Pos 3: Mid Right
  ],
  5: [
    { bottom: 15, left: '50%', transform: [{ translateX: -70 }] }, // Pos 0: Bottom Center
    { bottom: 45, left: 16 },                                      // Pos 1: Bottom Left
    { top: 24, left: '30%', transform: [{ translateX: -70 }] },    // Pos 2: Top Left
    { top: 24, left: '70%', transform: [{ translateX: -70 }] },    // Pos 3: Top Right
    { bottom: 45, right: 16 },                                     // Pos 4: Bottom Right
  ],
  6: [
    { bottom: 15, left: '50%', transform: [{ translateX: -70 }] }, // Pos 0: Bottom Center
    { bottom: 40, left: 16 },                                      // Pos 1: Bottom Left
    { top: 60, left: 16 },                                         // Pos 2: Top Left
    { top: 20, left: '50%', transform: [{ translateX: -70 }] },    // Pos 3: Top Center
    { top: 60, right: 16 },                                        // Pos 4: Top Right
    { bottom: 40, right: 16 },                                     // Pos 5: Bottom Right
  ],
  7: [
    { bottom: 15, left: '50%', transform: [{ translateX: -70 }] }, // Pos 0: Bottom Center
    { bottom: 35, left: 16 },                                      // Pos 1: Bottom Left
    { top: 75, left: 16 },                                         // Pos 2: Top Left
    { top: 22, left: '32%', transform: [{ translateX: -70 }] },    // Pos 3: Top Left-Center
    { top: 22, left: '68%', transform: [{ translateX: -70 }] },    // Pos 4: Top Right-Center
    { top: 75, right: 16 },                                        // Pos 5: Top Right
    { bottom: 35, right: 16 },                                     // Pos 6: Bottom Right
  ],
  8: [
    { bottom: 15, left: '50%', transform: [{ translateX: -70 }] }, // Pos 0: Bottom Center
    { bottom: 35, left: 16 },                                      // Pos 1: Bottom Left
    { top: '44%', left: 14, transform: [{ translateY: -35 }] },     // Pos 2: Mid Left
    { top: 55, left: 16 },                                         // Pos 3: Top Left
    { top: 20, left: '50%', transform: [{ translateX: -70 }] },    // Pos 4: Top Center
    { top: 55, right: 16 },                                        // Pos 5: Top Right
    { top: '44%', right: 14, transform: [{ translateY: -35 }] },    // Pos 6: Mid Right
    { bottom: 35, right: 16 },                                     // Pos 7: Bottom Right
  ],
  9: [
    { bottom: 15, left: '50%', transform: [{ translateX: -70 }] }, // Pos 0: Bottom Center
    { bottom: 30, left: 16 },                                      // Pos 1: Bottom Left
    { top: '48%', left: 14, transform: [{ translateY: -35 }] },     // Pos 2: Mid-Low Left
    { top: 60, left: 16 },                                         // Pos 3: Top Left
    { top: 22, left: '33%', transform: [{ translateX: -70 }] },    // Pos 4: Top Left-Center
    { top: 22, left: '67%', transform: [{ translateX: -70 }] },    // Pos 5: Top Right-Center
    { top: 60, right: 16 },                                        // Pos 6: Top Right
    { top: '48%', right: 14, transform: [{ translateY: -35 }] },    // Pos 7: Mid-Low Right
    { bottom: 30, right: 16 },                                     // Pos 8: Bottom Right
  ],
  10: [
    { bottom: 15, left: '50%', transform: [{ translateX: -70 }] }, // Pos 0: Bottom Center (Hero)
    { bottom: 25, left: '26%', transform: [{ translateX: -70 }] }, // Pos 1: Bottom Left-Center
    { bottom: 70, left: 14 },                                       // Pos 2: Low Left
    { top: '44%', left: 14, transform: [{ translateY: -35 }] },     // Pos 3: Mid Left
    { top: 45, left: 16 },                                          // Pos 4: Top Left
    { top: 22, left: '35%', transform: [{ translateX: -70 }] },    // Pos 5: Top Left-Center
    { top: 22, left: '65%', transform: [{ translateX: -70 }] },    // Pos 6: Top Right-Center
    { top: 45, right: 16 },                                         // Pos 7: Top Right
    { top: '44%', right: 14, transform: [{ translateY: -35 }] },    // Pos 8: Mid Right
    { bottom: 25, right: '26%', transform: [{ translateX: 70 }] }, // Pos 9: Bottom Right-Center
  ],
};

const LAYOUTS_MOBILE_PORTRAIT = {
  2: [
    { bottom: 8, left: '50%', transform: [{ translateX: -77 }] },  // Pos 0: Bottom Center
    { top: 8, left: '50%', transform: [{ translateX: -42 }] },     // Pos 1: Top Center
  ],
  3: [
    { bottom: 8, left: '50%', transform: [{ translateX: -77 }] },  // Pos 0: Bottom Center
    { top: 14, left: '18%', transform: [{ translateX: -35 }] },    // Pos 1: Top Left
    { top: 14, right: '18%', transform: [{ translateX: 35 }] },    // Pos 2: Top Right
  ],
  4: [
    { bottom: 8, left: '50%', transform: [{ translateX: -77 }] },  // Pos 0: Bottom Center
    { top: '38%', left: 4 },                                       // Pos 1: Mid Left
    { top: 8, left: '50%', transform: [{ translateX: -42 }] },     // Pos 2: Top Center
    { top: '38%', right: 4 },                                      // Pos 3: Mid Right
  ],
  5: [
    { bottom: 8, left: '50%', transform: [{ translateX: -77 }] },  // Pos 0: Bottom Center
    { bottom: '26%', left: 4 },                                    // Pos 1: Bottom Left
    { top: 10, left: '22%', transform: [{ translateX: -35 }] },    // Pos 2: Top Left
    { top: 10, right: '22%', transform: [{ translateX: 35 }] },    // Pos 3: Top Right
    { bottom: '26%', right: 4 },                                   // Pos 4: Bottom Right
  ],
  6: [
    { bottom: 8, left: '50%', transform: [{ translateX: -77 }] },  // Pos 0: Bottom Center
    { bottom: '26%', left: 4 },                                    // Pos 1: Bottom Left
    { top: '24%', left: 4 },                                       // Pos 2: Top Left
    { top: 8, left: '50%', transform: [{ translateX: -42 }] },     // Pos 3: Top Center
    { top: '24%', right: 4 },                                      // Pos 4: Top Right
    { bottom: '26%', right: 4 },                                   // Pos 5: Bottom Right
  ],
  7: [
    { bottom: 8, left: '50%', transform: [{ translateX: -77 }] },  // Pos 0: Bottom Center
    { bottom: '26%', left: 4 },                                    // Pos 1: Bottom Left
    { top: '26%', left: 4 },                                       // Pos 2: Top Left
    { top: 8, left: '20%', transform: [{ translateX: -41 }] },     // Pos 3: Top Left-Center
    { top: 8, right: '20%', transform: [{ translateX: 41 }] },     // Pos 4: Top Right-Center
    { top: '26%', right: 4 },                                      // Pos 5: Top Right
    { bottom: '26%', right: 4 },                                   // Pos 6: Bottom Right
  ],
  8: [
    { bottom: 8, left: '50%', transform: [{ translateX: -77 }] },  // Pos 0: Bottom Center
    { bottom: '22%', left: 3 },                                    // Pos 1
    { top: '38%', left: 3 },                                       // Pos 2
    { top: '20%', left: 3 },                                       // Pos 3
    { top: 8, left: '50%', transform: [{ translateX: -42 }] },     // Pos 4: Top Center
    { top: '20%', right: 3 },                                      // Pos 5
    { top: '38%', right: 3 },                                      // Pos 6
    { bottom: '22%', right: 3 },                                   // Pos 7
  ],
  9: [
    { bottom: 8, left: '50%', transform: [{ translateX: -77 }] },  // Pos 0: Bottom Center
    { bottom: '20%', left: 2 },                                    // Pos 1
    { top: '38%', left: 2 },                                       // Pos 2
    { top: '22%', left: 2 },                                       // Pos 3
    { top: 8, left: '26%', transform: [{ translateX: -42 }] },     // Pos 4
    { top: 8, right: '26%', transform: [{ translateX: 42 }] },     // Pos 5
    { top: '22%', right: 2 },                                      // Pos 6
    { top: '38%', right: 2 },                                      // Pos 7
    { bottom: '20%', right: 2 },                                   // Pos 8
  ],
  10: [
    { bottom: 8, left: '50%', transform: [{ translateX: -77 }] },  // Pos 0: Bottom Center
    { bottom: '18%', left: 2 },                                    // Pos 1
    { bottom: '33%', left: 2 },                                    // Pos 2
    { top: '33%', left: 2 },                                       // Pos 3
    { top: '18%', left: 2 },                                       // Pos 4
    { top: 8, left: '26%', transform: [{ translateX: -42 }] },     // Pos 5
    { top: 8, right: '26%', transform: [{ translateX: 42 }] },     // Pos 6
    { top: '18%', right: 2 },                                      // Pos 7
    { top: '33%', right: 2 },                                      // Pos 8
    { bottom: '18%', right: 2 },                                   // Pos 9
  ],
};

const LAYOUTS_LANDSCAPE = {
  2: [
    { bottom: 86, left: '50%', transform: [{ translateX: -60 }] }, // Pos 0: Bottom Center
    { top: 6, left: '50%', transform: [{ translateX: -42 }] },     // Pos 1: Top Center
  ],
  3: [
    { bottom: 86, left: '50%', transform: [{ translateX: -60 }] }, // Pos 0: Bottom Center
    { top: 6, left: '24%' },                                       // Pos 1: Top Left
    { top: 6, right: '24%' },                                      // Pos 2: Top Right
  ],
  4: [
    { bottom: 86, left: '50%', transform: [{ translateX: -60 }] }, // Pos 0: Bottom Center
    { top: '35%', left: '10%' },                                   // Pos 1: Mid Left
    { top: 6, left: '50%', transform: [{ translateX: -42 }] },     // Pos 2: Top Center
    { top: '35%', right: '10%' },                                  // Pos 3: Mid Right
  ],
  5: [
    { bottom: 86, left: '50%', transform: [{ translateX: -60 }] }, // Pos 0: Bottom Center
    { bottom: 84, left: '14%' },                                   // Pos 1: Bottom Left
    { top: 6, left: '28%' },                                       // Pos 2: Top Left
    { top: 6, right: '28%' },                                      // Pos 3: Top Right
    { bottom: 84, right: '14%' },                                  // Pos 4: Bottom Right
  ],
  6: [
    { bottom: 86, left: '50%', transform: [{ translateX: -60 }] }, // Pos 0: Bottom Center
    { bottom: 84, left: '14%' },                                   // Pos 1: Bottom Left
    { top: 6, left: '18%' },                                       // Pos 2: Top Left
    { top: 6, left: '50%', transform: [{ translateX: -42 }] },     // Pos 3: Top Center
    { top: 6, right: '18%' },                                      // Pos 4: Top Right
    { bottom: 84, right: '14%' },                                  // Pos 5: Bottom Right
  ],
  7: [
    { bottom: 86, left: '50%', transform: [{ translateX: -60 }] }, // Pos 0: Bottom Center
    { bottom: 84, left: '16%' },                                   // Pos 1: Bottom Left
    { top: 6, left: '16%' },                                       // Pos 2: Top Left
    { top: 6, left: '38%' },                                       // Pos 3: Top Left-Center
    { top: 6, right: '38%' },                                      // Pos 4: Top Right-Center
    { top: 6, right: '16%' },                                      // Pos 5: Top Right
    { bottom: 84, right: '16%' },                                  // Pos 6: Bottom Right
  ],
  8: [
    { bottom: 86, left: '50%', transform: [{ translateX: -60 }] },
    { bottom: 84, left: '16%' },
    { top: '42%', left: '8%' },
    { top: 6, left: '22%' },
    { top: 6, left: '50%', transform: [{ translateX: -42 }] },
    { top: 6, right: '22%' },
    { top: '42%', right: '8%' },
    { bottom: 84, right: '16%' },
  ],
  9: [
    { bottom: 86, left: '50%', transform: [{ translateX: -60 }] },
    { bottom: 84, left: '14%' },
    { top: '44%', left: '8%' },
    { top: 6, left: '18%' },
    { top: 6, left: '38%' },
    { top: 6, right: '38%' },
    { top: 6, right: '18%' },
    { top: '44%', right: '8%' },
    { bottom: 84, right: '14%' },
  ],
  10: [
    { bottom: 86, left: '50%', transform: [{ translateX: -60 }] },
    { bottom: 84, left: '24%' },
    { bottom: 84, left: '10%' },
    { top: '42%', left: '6%' },
    { top: 6, left: '18%' },
    { top: 6, left: '40%' },
    { top: 6, right: '40%' },
    { top: 6, right: '18%' },
    { top: '42%', right: '6%' },
    { bottom: 84, right: '24%' },
  ],
};

const getLayoutForCount = (count, isPortrait, isShortLandscape) => {
  const clamped = Math.max(2, Math.min(10, count || 2));
  const set = isPortrait
    ? LAYOUTS_MOBILE_PORTRAIT
    : isShortLandscape
    ? LAYOUTS_LANDSCAPE
    : LAYOUTS_DESKTOP;
  return set[clamped] || set[10];
};

export const Table = ({
  seats = [],
  communityCards = [],
  pots = [],
  totalPot = 0,
  currentTurnSeat = null,
  mySeat = null,
  dealerSeat = 0,
  sbSeat = 0,
  bbSeat = 0,
  revealedHands = [],
  gameStatus = 'playing',
  myHoleCards = [],
  callAmount = 0,
  minRaise = 0,
  maxRaise = 0,
  onSit,
  onAddBot,
  onPlayerAction,
  roundWinners = null,
  seatActions = {},
}) => {
  const { width, height } = useWindowDimensions();
  const isPortrait = height >= width;
  const isMobile = width < 768 || height < 520;
  const isShortLandscape = !isPortrait && height < 520;

  // Track community cards that have already played their unfold animation
  const revealedCardsRef = React.useRef(new Set());
  React.useEffect(() => {
    if (communityCards.length === 0) {
      revealedCardsRef.current.clear();
    }
  }, [communityCards.length]);

  // Identify all occupied seats (filtered from 7 slots)
  const seatedEntries = seats
    .map((player, originalSeatIndex) => ({ player, originalSeatIndex }))
    .filter((item) => item.player !== null);

  // If table is in playing mode, only render seated players!
  // If in waiting mode and no one or few players, we can either render seated players or show seats.
  const activeItems = gameStatus === 'playing' || gameStatus === 'finished'
    ? seatedEntries
    : (seatedEntries.length > 0 ? seatedEntries : seats.map((player, originalSeatIndex) => ({ player, originalSeatIndex })));

  const count = activeItems.length > 0 ? activeItems.length : 2;
  const layoutPositions = getLayoutForCount(count, isPortrait, isShortLandscape);

  // Find index in activeItems where player is Hero (mySeat)
  const heroActiveIndex = activeItems.findIndex((item) => item.originalSeatIndex === mySeat);

  // Map revealed hands by seat index
  const revealedMap = {};
  revealedHands.forEach((rh) => {
    revealedMap[rh.seat] = rh.cards;
  });

  // Aggregate round winners by seat (consolidates main pot + side pots won by the same player)
  const aggregatedWinners = useMemo(() => {
    if (!roundWinners || !Array.isArray(roundWinners) || roundWinners.length === 0) return [];
    const map = new Map();
    roundWinners.forEach((w) => {
      const existing = map.get(w.seat);
      if (existing) {
        existing.amount_won += w.amount_won;
        if (!existing.description && w.description) {
          existing.description = w.description;
        }
      } else {
        map.set(w.seat, { ...w });
      }
    });
    return Array.from(map.values());
  }, [roundWinners]);

  // Map round winners by seat index
  const winnerMap = useMemo(() => {
    const map = {};
    aggregatedWinners.forEach((w) => {
      map[w.seat] = w;
    });
    return map;
  }, [aggregatedWinners]);

  // Calculate target translation coordinates for flying pot from center table to winner's seat
  const getWinnerCoords = (winnerSeat) => {
    const itemIndex = activeItems.findIndex((it) => it.originalSeatIndex === winnerSeat);
    const displayPosIndex = itemIndex !== -1
      ? (heroActiveIndex !== -1 ? (itemIndex - heroActiveIndex + count) % count : itemIndex)
      : 0;

    const angle = (displayPosIndex / count) * 2 * Math.PI;
    const rx = isMobile ? 120 : (isShortLandscape ? 260 : 250);
    const ry = isMobile ? 150 : (isShortLandscape ? 100 : 170);

    return {
      x: Math.round(-Math.sin(angle) * rx),
      y: Math.round(Math.cos(angle) * ry),
    };
  };

  const isMyTurn = currentTurnSeat !== null && mySeat !== null && currentTurnSeat === mySeat;
  const myPlayer = mySeat !== null ? seats[mySeat] : null;
  const currentTurnPlayer = currentTurnSeat !== null ? seats[currentTurnSeat] : null;

  return (
    <View style={[styles.tableWrapper, isMobile && styles.tableWrapperMobile]}>
      {/* Outer Wooden Rail */}
      <View
        style={[
          styles.woodenRail,
          isPortrait ? styles.woodenRailMobile : isShortLandscape ? styles.woodenRailLandscape : null,
        ]}
      >
        {/* Inner Gold Bevel */}
        <View
          style={[
            styles.goldBevel,
            isPortrait ? styles.goldBevelMobile : isShortLandscape ? styles.goldBevelLandscape : null,
          ]}
        >
          {/* Deep Emerald Velvet Table Felt */}
          <View
            style={[
              styles.velvetFelt,
              isPortrait ? styles.velvetFeltMobile : isShortLandscape ? styles.velvetFeltLandscape : null,
            ]}
          >
            {/* Center Felt Watermark */}
            <View style={styles.feltWatermark}>
              <Text style={[styles.watermarkText, isMobile && styles.watermarkTextMobile]}>
                CHAMPIONSHIP HOLD'EM
              </Text>
            </View>

            {/* Center Pot & Community Cards Area */}
            <View style={[styles.centerFelt, isMobile && styles.centerFeltMobile]}>
              <PotDisplay totalPot={totalPot} isMobile={isMobile} />

              <View style={[styles.communityCardsRow, isMobile && styles.communityCardsRowMobile]}>
                {Array.from({ length: 5 }).map((_, idx) => {
                  const card = communityCards[idx];
                  let isNewCard = false;
                  if (card) {
                    const cardKey = `${idx}-${card.rank}-${card.suit}`;
                    if (!revealedCardsRef.current.has(cardKey)) {
                      revealedCardsRef.current.add(cardKey);
                      isNewCard = true;
                    }
                  }

                  return (
                    <View key={idx} style={[styles.cardSlot, isMobile && styles.cardSlotMobile]}>
                      {card ? (
                        <Card
                          key={`comm-${idx}-${card.rank}-${card.suit}`}
                          card={card}
                          size={isMobile ? 'mobile' : 'normal'}
                          isHighlighted={true}
                          unfold={isNewCard}
                        />
                      ) : (
                        <View style={[styles.emptySlotPlaceholder, isMobile && styles.emptySlotPlaceholderMobile]} />
                      )}
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Grand Winner Announcement Banner */}
            {aggregatedWinners.length > 0 && (
              <div
                className="winner-banner-anim"
                style={{
                  position: 'absolute',
                  top: isMobile ? '34%' : '37%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 55,
                  pointerEvents: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: isMobile ? '10px 16px' : '14px 28px',
                  background: 'rgba(24, 32, 47, 0.94)',
                  backdropFilter: 'blur(16px)',
                  border: '1.5px solid #dfb76c',
                  borderRadius: '18px',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), 0 0 16px rgba(223, 183, 108, 0.25)',
                  maxWidth: isMobile ? '92%' : '440px',
                  textAlign: 'center',
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#dfb76c',
                  fontFamily: "'Cinzel', serif",
                  fontWeight: 800,
                  fontSize: isMobile ? '12px' : '14px',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                }}>
                  <span>🏆</span>
                  <span>{aggregatedWinners.length === 1 ? 'Hand Winner' : 'Split Pot'}</span>
                </div>

                {aggregatedWinners.map((winner, idx) => {
                  const winnerPlayer = seats[winner.seat];
                  const winnerName = winnerPlayer ? winnerPlayer.name : `Seat ${winner.seat + 1}`;
                  return (
                    <div key={idx} style={{ marginTop: '4px', textAlign: 'center' }}>
                      <div style={{
                        color: '#ffffff',
                        fontWeight: 800,
                        fontSize: isMobile ? '14px' : '17px',
                        fontFamily: "'Outfit', sans-serif",
                        textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
                      }}>
                        {winnerName}{' '}
                        <span style={{ color: '#10b981' }}>+${Number(winner.amount_won).toLocaleString()}</span>
                      </div>
                      {winner.description ? (
                        <div style={{
                          color: '#facc15',
                          fontWeight: 700,
                          fontSize: isMobile ? '11px' : '13px',
                          fontFamily: "'Outfit', sans-serif",
                          marginTop: '3px',
                          letterSpacing: '0.3px',
                          padding: '2px 10px',
                          backgroundColor: 'rgba(212, 175, 55, 0.15)',
                          borderRadius: '6px',
                          border: '1px solid rgba(212, 175, 55, 0.3)',
                          display: 'inline-block',
                        }}>
                          ✨ {winner.description}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Flying Pot Animation to Winner Seat */}
            {aggregatedWinners.length > 0 && aggregatedWinners.map((winner, idx) => {
              const coords = getWinnerCoords(winner.seat);
              return (
                <div
                  key={`flying-pot-${winner.seat}-${idx}`}
                  className="flying-pot-anim"
                  style={{
                    position: 'absolute',
                    top: '46%',
                    left: '50%',
                    zIndex: 60,
                    pointerEvents: 'none',
                    '--target-x': `${coords.x}px`,
                    '--target-y': `${coords.y}px`,
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: isMobile ? '5px 12px' : '7px 16px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    border: '2px solid #34d399',
                    borderRadius: '999px',
                    boxShadow: '0 8px 24px rgba(16, 185, 129, 0.6), 0 0 12px rgba(255, 255, 255, 0.4)',
                    color: '#ffffff',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 800,
                    fontSize: isMobile ? '12px' : '15px',
                    letterSpacing: '0.5px',
                  }}>
                    <span>💰</span>
                    <span>+${Number(winner.amount_won).toLocaleString()}</span>
                  </div>
                </div>
              );
            })}

            {/* Dynamic Player Seats Positioned Around Perimeter */}
            {activeItems.map((item, i) => {
              const { player, originalSeatIndex } = item;

              // Rotate display position relative to hero so Hero is ALWAYS at position 0 (Bottom Center)
              const displayPosIndex =
                heroActiveIndex !== -1
                  ? (i - heroActiveIndex + count) % count
                  : i;

              const seatPos = layoutPositions[displayPosIndex] || layoutPositions[0];

              // Check if cards are known for this seat
              let cardsToReveal = null;
              if (revealedMap[originalSeatIndex]) {
                cardsToReveal = revealedMap[originalSeatIndex];
              } else if (originalSeatIndex === mySeat && myHoleCards.length > 0) {
                cardsToReveal = myHoleCards;
              }

              const winnerObj = winnerMap[originalSeatIndex];

              // Determine seat placement relative to table felt so bubbles/chips face inward towards center felt
              let seatPlacement = 'bottom';
              if (displayPosIndex === 0) {
                // Pos 0 is always Hero at Bottom Center -> action bubble points up towards center felt
                seatPlacement = 'bottom';
              } else {
                const topVal = seatPos.top !== undefined
                  ? (typeof seatPos.top === 'number' ? seatPos.top : parseFloat(seatPos.top))
                  : null;
                const bottomVal = seatPos.bottom !== undefined
                  ? (typeof seatPos.bottom === 'number' ? seatPos.bottom : parseFloat(seatPos.bottom))
                  : null;

                if (topVal !== null && topVal <= 30) {
                  // Top rail seats face downward into table
                  seatPlacement = 'top';
                } else if (bottomVal !== null && bottomVal <= 35) {
                  // Bottom rail seats face upward into table
                  seatPlacement = 'bottom';
                } else if (seatPos.left !== undefined && !String(seatPos.left).includes('50%')) {
                  // Left rail seats face rightward into table
                  seatPlacement = 'left';
                } else if (seatPos.right !== undefined) {
                  // Right rail seats face leftward into table
                  seatPlacement = 'right';
                } else if (topVal !== null && topVal < 50) {
                  seatPlacement = 'top';
                } else {
                  seatPlacement = 'bottom';
                }
              }

              return (
                <View key={originalSeatIndex} style={[styles.seatAbsoluteWrapper, seatPos]}>
                  <Seat
                    seatIndex={originalSeatIndex}
                    player={player}
                    isClientTurn={currentTurnSeat === originalSeatIndex}
                    isClientSeat={originalSeatIndex === mySeat}
                    isDealer={dealerSeat === originalSeatIndex}
                    isSmallBlind={sbSeat === originalSeatIndex}
                    isBigBlind={bbSeat === originalSeatIndex}
                    revealedCards={cardsToReveal}
                    onSit={onSit}
                    onAddBot={onAddBot}
                    gameStatus={gameStatus}
                    isMobile={isMobile}
                    displayPositionIndex={displayPosIndex}
                    seatPlacement={seatPlacement}
                    isWinner={!!winnerObj}
                    winAmount={winnerObj?.amount_won || 0}
                    winDescription={winnerObj?.description || ''}
                    lastAction={seatActions ? seatActions[originalSeatIndex] : null}
                  />
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {/* Floating Action Console at Bottom */}
      {mySeat !== null && (
        <View style={[styles.bottomConsoleWrapper, isMobile && styles.bottomConsoleWrapperMobile]}>
          <ActionConsole
            isMyTurn={isMyTurn}
            callAmount={callAmount}
            minRaise={minRaise}
            maxRaise={maxRaise}
            currentBet={myPlayer ? myPlayer.current_bet : 0}
            totalPot={totalPot}
            onAction={onPlayerAction}
            isMobile={isMobile}
            currentTurnPlayerName={currentTurnPlayer ? currentTurnPlayer.name : null}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  tableWrapper: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#12161f',
  },
  tableWrapperMobile: {
    padding: 4,
    justifyContent: 'flex-start',
    paddingTop: 8,
  },
  woodenRail: {
    width: '96%',
    maxWidth: 1100,
    height: '84%',
    maxHeight: 640,
    backgroundColor: '#271f17',
    borderRadius: 240,
    padding: 16,
    borderWidth: 5,
    borderColor: '#19140e',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.75,
    shadowRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  woodenRailMobile: {
    width: '98%',
    maxWidth: 440,
    height: '78%',
    maxHeight: 590,
    borderRadius: 140,
    padding: 7,
    borderWidth: 4,
  },
  woodenRailLandscape: {
    width: '98%',
    maxWidth: 820,
    height: '84%',
    maxHeight: 310,
    borderRadius: 140,
    padding: 5,
    borderWidth: 4,
  },
  goldBevel: {
    width: '100%',
    height: '100%',
    borderRadius: 220,
    padding: 4,
    borderWidth: 2,
    borderColor: Colors.gold,
    shadowColor: Colors.gold,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    overflow: 'visible',
  },
  goldBevelMobile: {
    borderRadius: 132,
    padding: 2,
    borderWidth: 1.5,
  },
  goldBevelLandscape: {
    borderRadius: 134,
    padding: 2,
    borderWidth: 1.5,
  },
  velvetFelt: {
    width: '100%',
    height: '100%',
    borderRadius: 216,
    backgroundColor: '#1b4332',
    borderWidth: 1,
    borderColor: 'rgba(223, 183, 108, 0.3)',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  velvetFeltMobile: {
    borderRadius: 128,
  },
  velvetFeltLandscape: {
    borderRadius: 130,
  },
  feltWatermark: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.08,
  },
  watermarkText: {
    fontFamily: 'Cinzel',
    fontSize: 28,
    fontWeight: '900',
    color: Colors.gold,
    letterSpacing: 4,
  },
  watermarkTextMobile: {
    fontSize: 16,
    letterSpacing: 2,
  },
  centerFelt: {
    alignItems: 'center',
    zIndex: 5,
  },
  centerFeltMobile: {
    marginTop: -32,
  },
  communityCardsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  communityCardsRowMobile: {
    gap: 3,
    padding: 3,
    borderRadius: 8,
  },
  cardSlot: {
    width: 60,
    height: 86,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSlotMobile: {
    width: 34,
    height: 50,
  },
  emptySlotPlaceholder: {
    width: 58,
    height: 84,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  emptySlotPlaceholderMobile: {
    width: 32,
    height: 48,
    borderRadius: 5,
    borderWidth: 1,
  },
  seatAbsoluteWrapper: {
    position: 'absolute',
    zIndex: 10,
  },
  bottomConsoleWrapper: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
    paddingHorizontal: 16,
  },
  bottomConsoleWrapperMobile: {
    bottom: 4,
    paddingHorizontal: 6,
  },
});
