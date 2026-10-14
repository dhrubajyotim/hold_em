import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Colors } from '../styles/theme';
import { Play, Plus, Users, Shield, Copy, Check, Bot } from 'lucide-react';
import { soundManager } from '../services/sound';

export const Lobby = ({
  roomCode,
  seats = [],
  mySeat,
  isHost,
  onSit,
  onAddBot,
  onStartTournament,
  onCreateNewRoom,
  onJoinRoom,
  onUpdateName,
  startingChips = 1500,
  blindIntervalHands = 5,
  onUpdateSettings,
  isMobile = false,
}) => {
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('poker_player_name') || `Player ${Math.floor(Math.random() * 900) + 100}`;
  });
  const [inputRoomCode, setInputRoomCode] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    soundManager.playChip();
    navigator.clipboard?.writeText(window.location.origin + '?room=' + roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNameChange = (newName) => {
    setPlayerName(newName);
    if (onUpdateName) {
      onUpdateName(newName);
    }
  };

  const chipOptions = [3000, 5000, 10000, 20000];
  const intervalOptions = [3, 5, 8, 10];

  const seatedCount = seats.filter((s) => s !== null).length;
  const humanSeatedCount = seats.filter((s) => s !== null && !s.is_bot).length;

  return (
    <ScrollView style={{ flex: 1, width: '100%' }} contentContainerStyle={[styles.scrollContent, isMobile && styles.scrollContentMobile]}>
      <View style={[styles.cardContainer, isMobile && styles.cardContainerMobile]}>
        {/* Header */}
        <View style={[styles.header, isMobile && styles.headerMobile]}>
          <Shield size={isMobile ? 26 : 32} color={Colors.gold} />
          <Text style={[styles.headerTitle, isMobile && styles.headerTitleMobile]}>TOURNAMENT HOLD'EM</Text>
          <Text style={styles.headerSubtitle}>10-Player Elimination Poker</Text>
        </View>

        {/* Room Code Banner & Share */}
        <View style={[styles.roomCodeBox, isMobile && styles.roomCodeBoxMobile]}>
          <View>
            <Text style={styles.roomCodeLabel}>ROOM CODE</Text>
            <Text style={[styles.roomCode, isMobile && styles.roomCodeMobile]}>{roomCode}</Text>
          </View>
          <TouchableOpacity style={styles.copyBtn} onPress={handleCopyLink}>
            {copied ? <Check size={16} color={Colors.emerald} /> : <Copy size={16} color="#ffffff" />}
            <Text style={styles.copyBtnText}>{copied ? 'Copied!' : 'Invite'}</Text>
          </TouchableOpacity>
        </View>

        {/* Player Name Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>YOUR DISPLAY NAME</Text>
          <TextInput
            style={styles.textInput}
            value={playerName}
            onChangeText={handleNameChange}
            placeholder="Enter your name"
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        {/* Game Rules & Tournament Settings */}
        <View style={styles.settingsSection}>
          <Text style={styles.settingsHeader}>
            TOURNAMENT SETTINGS {isHost ? '(HOST CONTROLS)' : ''}
          </Text>

          {/* Starting Stack Chips */}
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Starting Stack:</Text>
            <View style={styles.optionPillsRow}>
              {chipOptions.map((chips) => {
                const selected = startingChips === chips;
                return (
                  <TouchableOpacity
                    key={chips}
                    style={[
                      styles.pillBtn,
                      selected && styles.pillBtnActive,
                      !isHost && styles.pillBtnDisabled,
                    ]}
                    onPress={() => isHost && onUpdateSettings && onUpdateSettings({ starting_chips: chips })}
                    disabled={!isHost}
                  >
                    <Text style={[styles.pillText, selected && styles.pillTextActive]}>
                      ${chips >= 1000 ? `${chips / 1000}k` : chips}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Blind Escalation Speed */}
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Blinds Up Every:</Text>
            <View style={styles.optionPillsRow}>
              {intervalOptions.map((interval) => {
                const selected = blindIntervalHands === interval;
                return (
                  <TouchableOpacity
                    key={interval}
                    style={[
                      styles.pillBtn,
                      selected && styles.pillBtnActive,
                      !isHost && styles.pillBtnDisabled,
                    ]}
                    onPress={() => isHost && onUpdateSettings && onUpdateSettings({ blind_interval_hands: interval })}
                    disabled={!isHost}
                  >
                    <Text style={[styles.pillText, selected && styles.pillTextActive]}>
                      {interval} Hands
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Table Seating Roster */}
        <View style={styles.seatingSection}>
          <View style={styles.seatingHeader}>
            <Users size={16} color={Colors.cyan} />
            <Text style={styles.seatingTitle}>TABLE SEATS ({seatedCount} / {seats.length || 10})</Text>
          </View>

          <View style={styles.seatsGrid}>
            {Array.from({ length: seats.length || 10 }).map((_, idx) => {
              const occupant = seats[idx];
              const isMine = mySeat === idx;

              return (
                <View key={idx} style={[styles.seatRow, isMine && styles.mySeatRow]}>
                  <View style={styles.seatNumBadge}>
                    <Text style={styles.seatNumText}>{idx + 1}</Text>
                  </View>

                  <View style={styles.seatDetails}>
                    {occupant ? (
                      <View style={styles.occupantRow}>
                        {occupant.is_bot && <Bot size={14} color="#a855f7" />}
                        <Text style={styles.occupantName} numberOfLines={1}>
                          {occupant.name} {isMine ? '(You)' : ''}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.openSeatText}>Open Seat</Text>
                    )}
                  </View>

                  {!occupant && (
                    <View style={styles.seatActions}>
                      <TouchableOpacity
                        style={styles.takeSeatBtn}
                        onPress={() => onSit(idx, playerName)}
                      >
                        <Text style={styles.takeSeatText}>Sit</Text>
                      </TouchableOpacity>
                      {isHost && (
                        <TouchableOpacity
                          style={styles.botSeatBtn}
                          onPress={() => onAddBot(idx)}
                        >
                          <Text style={styles.botSeatText}>+ Bot</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.bottomActions}>
          {isHost ? (
            <TouchableOpacity
              style={[styles.startBtn, (seatedCount < 2 || humanSeatedCount < 1) && styles.disabledBtn]}
              onPress={onStartTournament}
              disabled={seatedCount < 2 || humanSeatedCount < 1}
            >
              <Play size={18} color="#000000" />
              <Text style={styles.startBtnText}>
                {humanSeatedCount < 1
                  ? 'NEED AT LEAST 1 HUMAN'
                  : seatedCount < 2
                  ? 'NEED AT LEAST 2 PLAYERS'
                  : 'START TOURNAMENT'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.waitingNotice}>
              <Text style={styles.waitingText}>
                {mySeat !== null
                  ? 'Waiting for host to start the tournament...'
                  : 'Please pick an open seat above!'}
              </Text>
            </View>
          )}

          {/* Join Another Room Form */}
          <View style={styles.joinOtherRow}>
            <TextInput
              style={styles.joinInput}
              placeholder="ROOM CODE"
              placeholderTextColor={Colors.textMuted}
              value={inputRoomCode}
              onChangeText={(t) => setInputRoomCode(t.toUpperCase())}
            />
            <TouchableOpacity
              style={styles.joinBtn}
              onPress={() => inputRoomCode && onJoinRoom(inputRoomCode)}
            >
              <Text style={styles.joinBtnText}>Join Room</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
  },
  scrollContentMobile: {
    padding: 10,
    justifyContent: 'flex-start',
    paddingTop: 16,
    paddingBottom: 40,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: 'rgba(24, 32, 47, 0.94)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
  },
  cardContainerMobile: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerMobile: {
    marginBottom: 14,
  },
  headerTitle: {
    color: Colors.gold,
    fontFamily: 'Cinzel',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 6,
  },
  headerTitleMobile: {
    fontSize: 20,
    letterSpacing: 1.5,
  },
  headerSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  roomCodeBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(223, 183, 108, 0.25)',
    marginBottom: 16,
  },
  roomCodeBoxMobile: {
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
  },
  roomCodeLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  roomCode: {
    color: Colors.cyan,
    fontFamily: 'JetBrains Mono',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
  },
  roomCodeMobile: {
    fontSize: 17,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  copyBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  settingsSection: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
    gap: 10,
  },
  settingsHeader: {
    color: Colors.gold,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  settingRow: {
    flexDirection: 'column',
    gap: 6,
  },
  settingLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  optionPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pillBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillBtnActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    borderColor: Colors.gold,
  },
  pillBtnDisabled: {
    opacity: 0.6,
  },
  pillText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
  },
  pillTextActive: {
    color: Colors.gold,
    fontWeight: '800',
  },
  seatingSection: {
    marginBottom: 20,
  },
  seatingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  seatingTitle: {
    color: Colors.cyan,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  seatsGrid: {
    gap: 6,
  },
  seatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  mySeatRow: {
    borderColor: Colors.gold,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
  },
  seatNumBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  seatNumText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  seatDetails: {
    flex: 1,
  },
  occupantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  occupantName: {
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  openSeatText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
  },
  seatActions: {
    flexDirection: 'row',
    gap: 4,
  },
  takeSeatBtn: {
    backgroundColor: Colors.emerald,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 34,
  },
  takeSeatText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  botSeatBtn: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderWidth: 1,
    borderColor: '#a855f7',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 34,
  },
  botSeatText: {
    color: '#d8b4fe',
    fontSize: 12,
    fontWeight: '800',
  },
  bottomActions: {
    gap: 12,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.gold,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  startBtnText: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1.5,
  },
  waitingNotice: {
    padding: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
  },
  waitingText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  joinOtherRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  joinInput: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'JetBrains Mono',
    fontWeight: '700',
  },
  joinBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    justifyContent: 'center',
  },
  joinBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
