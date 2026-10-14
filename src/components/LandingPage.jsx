import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { Colors } from '../styles/theme';
import { Plus, Users, Copy, Check, Play, RefreshCw, Radio, Sparkles } from 'lucide-react';
import { soundManager } from '../services/sound';

export const LandingPage = ({ onJoinRoom, onRoomCreated, isMobile = false }) => {
  const [activeRooms, setActiveRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [customRoomInput, setCustomRoomInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);

  // New room settings
  const [startingChips, setStartingChips] = useState(3000);
  const [blindInterval, setBlindInterval] = useState(5);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchRooms = async (showLoading = false) => {
    if (showLoading) setIsRefreshing(true);
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        setActiveRooms(data);
      }
    } catch (err) {
      console.error('Failed to load active rooms:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRooms(true);
    // Smooth background polling without showing loader or flickering
    const timer = setInterval(() => {
      fetchRooms(false);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const handleCreateRoom = async () => {
    soundManager.playChip();
    setIsCreating(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          starting_chips: startingChips,
          escalation_rule: `hands_${blindInterval}`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onRoomCreated(data.room_code);
      }
    } catch (err) {
      console.error('Error creating room:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = (code) => {
    soundManager.playChip();
    const shareUrl = `${window.location.origin}${window.location.pathname}?room=${code}`;
    navigator.clipboard?.writeText(shareUrl);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const chipOptions = [3000, 5000, 10000, 20000];
  const intervalOptions = [3, 5, 8, 10];

  const activeRoomCode = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('poker_active_room') : null;
  const ongoingRoom = activeRoomCode ? activeRooms.find((r) => r.room_code === activeRoomCode) : null;

  return (
    <ScrollView
      style={{ flex: 1, width: '100%' }}
      contentContainerStyle={[styles.container, isMobile && styles.containerMobile]}
    >
      <View style={[styles.card, isMobile && styles.cardMobile]}>
        {/* Brand Banner */}
        <View style={styles.header}>
          <Sparkles size={isMobile ? 26 : 32} color={Colors.gold} />
          <Text style={[styles.title, isMobile && styles.titleMobile]}>HOLD'EM ARENA</Text>
          <Text style={styles.subtitle}>Multiplayer Texas Hold'em Tournament</Text>
        </View>

        {/* Rejoin Ongoing Game Banner */}
        {ongoingRoom && (
          <View style={styles.rejoinBanner}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.emerald }} />
                <Text style={styles.rejoinTitle}>ONGOING GAME IN PROGRESS</Text>
              </View>
              <Text style={styles.rejoinSub}>
                You have a seat reserved in table <Text style={{ color: Colors.gold, fontWeight: '700' }}>{ongoingRoom.room_code}</Text> ({ongoingRoom.status.toUpperCase()})
              </Text>
            </View>
            <TouchableOpacity
              style={styles.rejoinBannerBtn}
              onPress={() => onJoinRoom(ongoingRoom.room_code)}
            >
              <Play size={14} color="#000000" />
              <Text style={styles.rejoinBannerBtnText}>REJOIN TABLE</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Create Room Section */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>CREATE A NEW TOURNAMENT ROOM</Text>
          <Text style={styles.helperText}>Configure your table rules and invite players</Text>

          {/* Starting Stack */}
          <View style={styles.settingGroup}>
            <Text style={styles.settingLabel}>Starting Chip Stack:</Text>
            <View style={styles.pillRow}>
              {chipOptions.map((chips) => {
                const selected = startingChips === chips;
                return (
                  <TouchableOpacity
                    key={chips}
                    style={[styles.pillBtn, selected && styles.pillBtnActive]}
                    onPress={() => setStartingChips(chips)}
                  >
                    <Text style={[styles.pillText, selected && styles.pillTextActive]}>
                      ${chips >= 1000 ? `${chips / 1000}k` : chips}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Blind Escalation */}
          <View style={styles.settingGroup}>
            <Text style={styles.settingLabel}>Blinds Up Every:</Text>
            <View style={styles.pillRow}>
              {intervalOptions.map((interval) => {
                const selected = blindInterval === interval;
                return (
                  <TouchableOpacity
                    key={interval}
                    style={[styles.pillBtn, selected && styles.pillBtnActive]}
                    onPress={() => setBlindInterval(interval)}
                  >
                    <Text style={[styles.pillText, selected && styles.pillTextActive]}>
                      {interval} Hands
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.createBtn, isCreating && styles.btnDisabled]}
            onPress={handleCreateRoom}
            disabled={isCreating}
          >
            {isCreating ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <>
                <Plus size={18} color="#000000" />
                <Text style={styles.createBtnText}>CREATE ROOM & BECOME HOST</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Join By Room Code */}
        <View style={styles.joinCodeBox}>
          <TextInput
            style={styles.joinInput}
            placeholder="ENTER ROOM CODE (e.g. ROOM1234)"
            placeholderTextColor={Colors.textMuted}
            value={customRoomInput}
            onChangeText={(t) => setCustomRoomInput(t.toUpperCase())}
          />
          <TouchableOpacity
            style={[styles.joinBtn, !customRoomInput && styles.btnDisabled]}
            onPress={() => customRoomInput && onJoinRoom(customRoomInput.trim())}
            disabled={!customRoomInput}
          >
            <Text style={styles.joinBtnText}>Join</Text>
          </TouchableOpacity>
        </View>

        {/* Active Rooms List */}
        <View style={styles.roomsListHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Radio size={16} color={Colors.cyan} />
            <Text style={styles.roomsListTitle}>ACTIVE ROOMS ({activeRooms.length})</Text>
          </View>
          <TouchableOpacity
            style={[styles.refreshBtn, isRefreshing && { opacity: 0.6 }]}
            onPress={() => fetchRooms(true)}
            disabled={isRefreshing}
          >
            <RefreshCw size={14} color={isRefreshing ? Colors.cyan : '#94a3b8'} />
            <Text style={[styles.refreshText, isRefreshing && { color: Colors.cyan }]}>
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Text>
          </TouchableOpacity>
        </View>

        {isLoading && activeRooms.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={Colors.gold} />
            <Text style={styles.emptyText}>Loading tables...</Text>
          </View>
        ) : activeRooms.length === 0 ? (
          <View style={styles.emptyBox}>
            <Users size={28} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No Active Tables</Text>
            <Text style={styles.emptyText}>
              All empty rooms are automatically destroyed. Create one above to get started!
            </Text>
          </View>
        ) : (
          <View style={styles.roomsList}>
            {activeRooms.map((room) => {
              const isPlaying = room.status === 'playing';
              const isCopied = copiedCode === room.room_code;
              const maxSeats = room.max_seats ?? 10;
              const hasSpace = room.has_space ?? (room.occupied_seats < maxSeats);
              const isMyRoom = activeRoomCode && activeRoomCode === room.room_code;
              const canJoin = isMyRoom || hasSpace;
              const seatsLabel = `${room.occupied_seats ?? room.human_count}/${maxSeats} seats`;

              return (
                <View key={room.room_code} style={styles.roomCard}>
                  <View style={styles.roomInfo}>
                    <View style={styles.roomTopRow}>
                      <Text style={styles.roomCodeBadge}>{room.room_code}</Text>
                      <View style={[styles.statusTag, isPlaying ? styles.statusPlaying : styles.statusWaiting]}>
                        <Text style={[styles.statusText, isPlaying ? styles.statusTextPlaying : styles.statusTextWaiting]}>
                          {isPlaying ? 'IN PROGRESS' : 'WAITING'}
                        </Text>
                      </View>
                      <View style={[styles.seatsTag, !hasSpace && styles.seatsTagFull]}>
                        <Text style={[styles.seatsTagText, !hasSpace && styles.seatsTagTextFull]}>
                          {hasSpace ? seatsLabel : 'TABLE FULL'}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.roomSpecs}>
                      {room.human_count} player{room.human_count !== 1 ? 's' : ''}
                      {room.bot_count > 0 ? ` + ${room.bot_count} bot${room.bot_count !== 1 ? 's' : ''}` : ''} • ${room.starting_chips >= 1000 ? `${room.starting_chips / 1000}k` : room.starting_chips} stack • {room.blind_interval_hands}h blinds
                    </Text>
                  </View>

                  <View style={styles.roomActions}>
                    <TouchableOpacity
                      style={styles.shareBtn}
                      onPress={() => handleCopyLink(room.room_code)}
                      title="Share Room Link"
                    >
                      {isCopied ? <Check size={14} color={Colors.emerald} /> : <Copy size={14} color="#cbd5e1" />}
                      <Text style={[styles.shareBtnText, isCopied && { color: Colors.emerald }]}>
                        {isCopied ? 'Copied' : 'Share'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.enterBtn,
                        !canJoin && styles.enterBtnDisabled,
                        isMyRoom && { backgroundColor: Colors.emerald },
                      ]}
                      onPress={() => canJoin && onJoinRoom(room.room_code)}
                      disabled={!canJoin}
                    >
                      <Play size={14} color="#000000" />
                      <Text style={styles.enterBtnText}>
                        {isMyRoom ? 'Rejoin' : hasSpace ? 'Join' : 'Full'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
  },
  containerMobile: {
    padding: 12,
    justifyContent: 'flex-start',
    paddingTop: 16,
    paddingBottom: 40,
  },
  card: {
    width: '100%',
    maxWidth: 540,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    gap: 16,
  },
  cardMobile: {
    padding: 16,
    borderRadius: 20,
    gap: 14,
  },
  header: {
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    color: Colors.gold,
    fontFamily: 'Cinzel',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 6,
  },
  titleMobile: {
    fontSize: 20,
    letterSpacing: 1.5,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  sectionBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    color: Colors.gold,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  helperText: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: -8,
  },
  settingGroup: {
    gap: 6,
  },
  settingLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pillBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillBtnActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.25)',
    borderColor: Colors.gold,
  },
  pillText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
  },
  pillTextActive: {
    color: Colors.gold,
    fontWeight: '800',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.gold,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 6,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  createBtnText: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 1.2,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  joinCodeBox: {
    flexDirection: 'row',
    gap: 8,
  },
  joinInput: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'JetBrains Mono',
    fontWeight: '700',
  },
  joinBtn: {
    backgroundColor: Colors.cyan,
    paddingHorizontal: 18,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinBtnText: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 13,
  },
  roomsListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 2,
  },
  roomsListTitle: {
    color: Colors.cyan,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  refreshText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  roomsList: {
    gap: 8,
  },
  roomCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
  },
  roomInfo: {
    flex: 1,
    gap: 4,
  },
  roomTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roomCodeBadge: {
    color: '#ffffff',
    fontFamily: 'JetBrains Mono',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
  },
  statusTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusWaiting: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: Colors.emerald,
  },
  statusPlaying: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: Colors.crimson,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusTextWaiting: {
    color: Colors.emerald,
  },
  statusTextPlaying: {
    color: Colors.crimson,
  },
  roomSpecs: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  roomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 10,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 8,
  },
  shareBtnText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
  },
  enterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.gold,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  enterBtnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    opacity: 0.5,
  },
  enterBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
  },
  seatsTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  seatsTagFull: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  seatsTagText: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  seatsTagTextFull: {
    color: Colors.crimson,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 6,
  },
  emptyTitle: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    maxWidth: 280,
  },
  loadingBox: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  rejoinBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  rejoinTitle: {
    color: Colors.emerald,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  rejoinSub: {
    color: '#cbd5e1',
    fontSize: 12,
    marginTop: 2,
  },
  rejoinBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.emerald,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
    shadowColor: Colors.emerald,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  rejoinBannerBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
