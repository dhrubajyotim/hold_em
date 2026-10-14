import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Table } from './components/Table';
import { TournamentHUD } from './components/TournamentHUD';
import { Lobby } from './components/Lobby';
import { LandingPage } from './components/LandingPage';
import { WinnerModal } from './components/WinnerModal';
import { soundManager } from './services/sound';

export const App = () => {
  const { width, height } = useWindowDimensions();
  const isMobile = width < 768 || height < 520;

  const [roomCode, setRoomCode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const existing = params.get('room');
    return existing ? existing.toUpperCase().trim() : null;
  });

  const [connected, setConnected] = useState(false);
  const [roomState, setRoomState] = useState(null);
  const [myHoleCards, setMyHoleCards] = useState([]);
  const [revealedHands, setRevealedHands] = useState([]);
  const [turnInfo, setTurnInfo] = useState({ callAmount: 0, minRaise: 0, maxRaise: 0 });
  const [roundWinners, setRoundWinners] = useState(null);
  const [winnerInfo, setWinnerInfo] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [dealerSeat, setDealerSeat] = useState(0);
  const [sbSeat, setSbSeat] = useState(0);
  const [bbSeat, setBbSeat] = useState(0);

  const [roomError, setRoomError] = useState(null);
  const [seatActions, setSeatActions] = useState({});
  const [displayedCommunityCards, setDisplayedCommunityCards] = useState([]);
  const displayedCommunityCardsRef = useRef([]);

  const updateDisplayedCommunityCards = (cards) => {
    displayedCommunityCardsRef.current = cards;
    setDisplayedCommunityCards(cards);
  };

  const wsRef = useRef(null);
  const showdownTimersRef = useRef([]);
  const boardTimersRef = useRef([]);

  const clearShowdownTimers = () => {
    showdownTimersRef.current.forEach((t) => clearTimeout(t));
    showdownTimersRef.current = [];
  };

  const clearBoardTimers = () => {
    boardTimersRef.current.forEach((t) => clearTimeout(t));
    boardTimersRef.current = [];
  };

  // Auto-clear round winners banner after 5.2 seconds if next hand hasn't started yet
  useEffect(() => {
    if (roundWinners && roundWinners.length > 0) {
      const timer = setTimeout(() => {
        setRoundWinners(null);
      }, 5200);
      return () => clearTimeout(timer);
    }
  }, [roundWinners]);

  // Initialize and connect WebSocket only when inside a room
  useEffect(() => {
    if (!roomCode) {
      setConnected(false);
      setRoomState(null);
      setRoomError(null);
      return;
    }

    sessionStorage.setItem('poker_active_room', roomCode);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let pid = sessionStorage.getItem('poker_pid');
    if (!pid) {
      pid = (crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^a-zA-Z0-9-]/g, '');
      sessionStorage.setItem('poker_pid', pid);
    }
    const wsUrl = `${protocol}//${window.location.host}/ws/${roomCode}?pid=${pid}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    let isCleanedUp = false;

    ws.onopen = () => {
      if (isCleanedUp) return;
      setConnected(true);
      setRoomError(null);
      const savedName =
        localStorage.getItem('poker_player_name') ||
        `Player ${Math.floor(Math.random() * 900) + 100}`;
      localStorage.setItem('poker_player_name', savedName);
      ws.send(
        JSON.stringify({
          type: 'JoinRoom',
          payload: { player_name: savedName, avatar: 'avatar_1' },
        })
      );
    };

    ws.onmessage = (event) => {
      if (isCleanedUp) return;
      try {
        const msg = JSON.parse(event.data);
        handleServerMessage(msg);
      } catch (err) {
        console.error('Error parsing WS message:', err);
      }
    };

    ws.onerror = () => {
      if (isCleanedUp) return;
      setRoomError((prev) => prev || 'Unable to connect to table. It may have ended or does not exist.');
    };

    ws.onclose = () => {
      if (isCleanedUp) return;
      setConnected(false);
      setRoomError((prev) => prev || 'Table has ended or is no longer available.');
    };

    return () => {
      isCleanedUp = true;
      ws.close();
    };
  }, [roomCode]);

  const handleServerMessage = (msg) => {
    switch (msg.type) {
      case 'RoomState':
        setRoomState(msg.payload);
        if (msg.payload.your_cards && msg.payload.your_cards.length > 0) {
          setMyHoleCards(msg.payload.your_cards);
        }
        if (msg.payload.community_cards && boardTimersRef.current.length === 0) {
          const sCards = msg.payload.community_cards;
          const curr = displayedCommunityCardsRef.current;
          const isSame =
            curr.length === sCards.length &&
            sCards.every((c, i) => curr[i] && curr[i].rank === c.rank && curr[i].suit === c.suit);
          if (!isSame) {
            updateDisplayedCommunityCards(sCards);
          }
        }
        break;

      case 'HandStarted':
        clearShowdownTimers();
        clearBoardTimers();
        updateDisplayedCommunityCards([]);
        soundManager.playCard();
        setDealerSeat(msg.payload.dealer_seat);
        setSbSeat(msg.payload.sb_seat);
        setBbSeat(msg.payload.bb_seat);
        if (msg.payload.your_cards) {
          setMyHoleCards(msg.payload.your_cards);
        }
        setRevealedHands([]);
        setRoundWinners(null);
        setSeatActions({});
        break;

      case 'PlayerTurn':
        setTurnInfo({
          callAmount: msg.payload.call_amount,
          minRaise: msg.payload.min_raise,
          maxRaise: msg.payload.max_raise,
        });
        break;

      case 'PlayerActed': {
        const { seat, action, amount } = msg.payload;
        const actionTimestamp = Date.now();
        setSeatActions((prev) => ({
          ...prev,
          [seat]: { action, amount, timestamp: actionTimestamp },
        }));

        setTimeout(() => {
          setSeatActions((prev) => {
            if (prev[seat]?.timestamp === actionTimestamp) {
              const copy = { ...prev };
              delete copy[seat];
              return copy;
            }
            return prev;
          });
        }, 3500);

        if (action.includes('Fold')) {
          soundManager.playFold();
        } else if (action.includes('Check')) {
          soundManager.playCheck();
        } else if (action.includes('All-In')) {
          soundManager.playAllIn();
        } else if (action.includes('Raise')) {
          soundManager.playRaise();
        } else {
          soundManager.playChip();
        }
        break;
      }

      case 'BoardUpdated': {
        clearBoardTimers();
        const targetCards = msg.payload.community_cards || [];
        const currentCount = displayedCommunityCardsRef.current.length;
        const targetCount = targetCards.length;

        // Keep recent seat actions visible so players can clearly see checks, calls, and bets
        // even as community cards are dealt. Actions expire naturally via their own 3500ms timer.

        if (currentCount === 0 && targetCount >= 3) {
          // FLOP DEALT: Unfold the 3 flop cards one by one!
          // 1st flop card:
          updateDisplayedCommunityCards(targetCards.slice(0, 1));
          soundManager.playCard();

          // 2nd flop card after 280ms:
          const t1 = setTimeout(() => {
            updateDisplayedCommunityCards(targetCards.slice(0, 2));
            soundManager.playCard();
          }, 280);
          boardTimersRef.current.push(t1);

          // 3rd flop card after 560ms:
          const t2 = setTimeout(() => {
            updateDisplayedCommunityCards(targetCards.slice(0, 3));
            soundManager.playCard();
            boardTimersRef.current = [];
          }, 560);
          boardTimersRef.current.push(t2);
        } else {
          // Turn or River: incremental card dealt without re-triggering flop
          updateDisplayedCommunityCards(targetCards);
          soundManager.playCard();
        }
        break;
      }

      case 'Showdown': {
        clearShowdownTimers();
        clearBoardTimers();
        const revealedList = msg.payload.revealed_hands || [];
        const winnersList = msg.payload.winners || [];

        // Ensure board community cards are complete
        if (msg.payload.community_cards && msg.payload.community_cards.length > 0) {
          updateDisplayedCommunityCards(msg.payload.community_cards);
        }

        // Reveal all showdown players' cards at once!
        setRevealedHands(revealedList);

        if (revealedList.length > 0) {
          // Play card reveal snap sound immediately as cards flip open together
          soundManager.playCardReveal();
          // Sequence pot win cascade after 550ms
          const tWin = setTimeout(() => {
            setRoundWinners(winnersList);
            soundManager.playWinPot();
          }, 550);
          showdownTimersRef.current.push(tWin);
        } else {
          setRoundWinners(winnersList);
          soundManager.playWinPot();
        }
        break;
      }

      case 'TournamentOver':
        setWinnerInfo({
          winnerName: msg.payload.winner_name,
          standings: msg.payload.standings,
        });
        soundManager.playTournamentWin();
        break;

      default:
        break;
    }
  };

  const handleToggleMute = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  const handleUpdateName = (name) => {
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    localStorage.setItem('poker_player_name', trimmed);
    wsRef.current?.send(
      JSON.stringify({
        type: 'SetPlayerName',
        payload: { player_name: trimmed },
      })
    );
  };

  const handleUpdateSettings = (settings) => {
    soundManager.playChip();
    wsRef.current?.send(
      JSON.stringify({
        type: 'UpdateSettings',
        payload: settings,
      })
    );
  };

  const handleSit = (seatIndex, name) => {
    soundManager.playChip();
    const effectiveName = name?.trim() || localStorage.getItem('poker_player_name') || `Player ${seatIndex + 1}`;
    localStorage.setItem('poker_player_name', effectiveName);
    wsRef.current?.send(
      JSON.stringify({
        type: 'SelectSeat',
        payload: { seat: seatIndex, player_name: effectiveName },
      })
    );
  };

  const handleAddBot = (seatIndex) => {
    soundManager.playChip();
    const personalities = ['Shark', 'Wildcard', 'Rock', 'CallingStation', 'Mathematician', 'Gambler'];
    const chosen = personalities[seatIndex % personalities.length];
    wsRef.current?.send(
      JSON.stringify({
        type: 'AddBot',
        payload: { seat: seatIndex, personality: chosen },
      })
    );
  };

  const handleStartTournament = () => {
    soundManager.playChip();
    wsRef.current?.send(
      JSON.stringify({
        type: 'StartTournament',
        payload: null,
      })
    );
  };

  const handlePlayerAction = (action, amount) => {
    wsRef.current?.send(
      JSON.stringify({
        type: 'PlayerAction',
        payload: {
          action,
          amount: amount !== undefined ? amount : null,
        },
      })
    );
  };

  const handleJoinRoom = (newCode) => {
    const clean = newCode.toUpperCase().trim();
    window.history.pushState({}, '', `?room=${clean}`);
    setRoomError(null);
    setRoomState(null);
    setRoomCode(clean);
  };

  const handleRoomCreated = (newCode) => {
    const clean = newCode.toUpperCase().trim();
    window.history.pushState({}, '', `?room=${clean}`);
    setRoomError(null);
    setRoomState(null);
    setRoomCode(clean);
  };

  const handlePlayAgain = () => {
    wsRef.current?.send(
      JSON.stringify({
        type: 'ResetTournament',
        payload: null,
      })
    );
    setWinnerInfo(null);
    setRevealedHands([]);
    setRoundWinners(null);
  };

  const handleLeaveTable = () => {
    sessionStorage.removeItem('poker_active_room');
    try {
      wsRef.current?.send(
        JSON.stringify({
          type: 'LeaveTable',
          payload: null,
        })
      );
    } catch (_) {}
    // Clean return to main landing page
    window.location.href = window.location.pathname;
  };

  // If on landing page (no room specified in URL)
  if (!roomCode) {
    return (
      <View style={styles.container}>
        <LandingPage
          onJoinRoom={handleJoinRoom}
          onRoomCreated={handleRoomCreated}
          isMobile={isMobile}
        />
      </View>
    );
  }

  // Room not found or destroyed screen
  if (roomError && !roomState) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <View style={{
          backgroundColor: '#0f172a',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: 'rgba(239, 68, 68, 0.3)',
          padding: 32,
          maxWidth: 440,
          width: '100%',
          alignItems: 'center',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
        }}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>🚪</Text>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#f8fafc', marginBottom: 8, textAlign: 'center' }}>
            Room {roomCode} Not Found
          </Text>
          <Text style={{ fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>
            {roomError}
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: '#eab308',
              paddingVertical: 12,
              paddingHorizontal: 28,
              borderRadius: 8,
              width: '100%',
              alignItems: 'center',
            }}
            onPress={() => {
              sessionStorage.removeItem('poker_active_room');
              window.location.href = window.location.pathname;
            }}
          >
            <Text style={{ color: '#000', fontWeight: '800', fontSize: 14, letterSpacing: 0.5 }}>
              RETURN TO LOBBY
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isHost = roomState?.is_host ?? (roomState?.your_seat !== null && roomState?.host_seat === roomState?.your_seat);
  const isPlaying = roomState?.status === 'playing' || roomState?.status === 'finished';

  return (
    <View style={styles.container}>
      {/* Top Tournament HUD */}
      <TournamentHUD
        roomCode={roomCode}
        blinds={roomState?.blinds}
        handsPlayed={roomState?.hands_played || 0}
        activePlayersCount={
          roomState?.seats.filter((s) => s && !s.is_eliminated).length || 0
        }
        totalSeats={
          roomState?.seats.filter(Boolean).length || 0
        }
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        isMobile={isMobile}
        onLeaveTable={handleLeaveTable}
        isPlaying={isPlaying}
        blindIntervalHands={roomState?.blind_interval_hands || 5}
      />

      {/* Main Screen: Lobby or Table */}
      {!isPlaying ? (
        <Lobby
          roomCode={roomCode}
          seats={roomState?.seats || Array(10).fill(null)}
          mySeat={roomState?.your_seat ?? null}
          isHost={isHost || roomState?.host_seat === null}
          onSit={handleSit}
          onUpdateName={handleUpdateName}
          onAddBot={handleAddBot}
          onStartTournament={handleStartTournament}
          onJoinRoom={handleJoinRoom}
          startingChips={roomState?.starting_chips || 1500}
          blindIntervalHands={roomState?.blind_interval_hands || 5}
          onUpdateSettings={handleUpdateSettings}
          isMobile={isMobile}
        />
      ) : (
        <Table
          seats={roomState?.seats || []}
          communityCards={displayedCommunityCards.length > 0 ? displayedCommunityCards : (roomState?.community_cards || [])}
          pots={roomState?.pots || []}
          totalPot={roomState?.total_pot || 0}
          currentTurnSeat={roomState?.current_turn}
          mySeat={roomState?.your_seat}
          dealerSeat={dealerSeat}
          sbSeat={sbSeat}
          bbSeat={bbSeat}
          revealedHands={revealedHands}
          roundWinners={roundWinners}
          gameStatus={roomState?.status}
          myHoleCards={myHoleCards}
          callAmount={turnInfo.callAmount}
          minRaise={turnInfo.minRaise}
          maxRaise={turnInfo.maxRaise}
          onSit={handleSit}
          onAddBot={handleAddBot}
          onPlayerAction={handlePlayerAction}
          isMobile={isMobile}
          seatActions={seatActions}
        />
      )}

      {/* Champion Modal */}
      {winnerInfo && (
        <WinnerModal
          winnerName={winnerInfo.winnerName}
          standings={winnerInfo.standings}
          onPlayAgain={handlePlayAgain}
          onLeaveTable={handleLeaveTable}
          isMobile={isMobile}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#07090e',
  },
});
