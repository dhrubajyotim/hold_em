use crate::engine::bot::BotPersonality;
use crate::engine::card::{Card, Deck};
use crate::engine::pot::PotManager;
use crate::engine::tournament::{EscalationRule, TournamentManager};
use crate::messages::*;
use std::collections::HashMap;
use tokio::sync::mpsc;

pub const MAX_SEATS: usize = 10;

#[derive(Debug, Clone)]
pub struct Player {
    pub id: String,
    pub name: String,
    pub avatar: String,
    pub seat: usize,
    pub chips: u32,
    pub current_bet: u32,
    pub has_folded: bool,
    pub is_all_in: bool,
    pub is_bot: bool,
    pub bot_personality: Option<BotPersonality>,
    pub is_eliminated: bool,
    pub hole_cards: Vec<Card>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum HandStage {
    PreFlop,
    Flop,
    Turn,
    River,
    Showdown,
}

pub struct Room {
    pub room_code: String,
    pub status: String, // "waiting", "playing", "finished"
    pub players: [Option<Player>; MAX_SEATS],
    pub clients: HashMap<String, mpsc::UnboundedSender<ServerMessage>>, // id -> sender
    pub host_id: Option<String>,
    pub tournament: TournamentManager,
    pub pot_manager: PotManager,
    pub deck: Deck,
    pub community_cards: Vec<Card>,
    pub stage: HandStage,
    pub dealer_seat: usize,
    pub current_turn_seat: Option<usize>,
    pub highest_bet: u32,
    pub min_raise: u32,
    pub last_raiser_seat: Option<usize>,
    pub last_full_raise_diff: u32,
    pub players_acted_this_round: Vec<usize>,
    pub winner_name: Option<String>,
    pub created_at: std::time::Instant,
    pub has_had_clients: bool,
}

impl Room {
    pub fn new(room_code: String, starting_chips: u32, rule: EscalationRule) -> Self {
        Self {
            room_code,
            status: "waiting".to_string(),
            players: Default::default(),
            clients: HashMap::new(),
            host_id: None,
            tournament: TournamentManager::new(starting_chips, rule),
            pot_manager: PotManager::new(MAX_SEATS),
            deck: Deck::new(),
            community_cards: Vec::new(),
            stage: HandStage::PreFlop,
            dealer_seat: 0,
            current_turn_seat: None,
            highest_bet: 0,
            min_raise: 0,
            last_raiser_seat: None,
            last_full_raise_diff: 0,
            players_acted_this_round: Vec::new(),
            winner_name: None,
            created_at: std::time::Instant::now(),
            has_had_clients: false,
        }
    }

    pub fn add_client(&mut self, player_id: String, sender: mpsc::UnboundedSender<ServerMessage>) {
        self.has_had_clients = true;
        if self.host_id.is_none() {
            self.host_id = Some(player_id.clone());
        }
        self.clients.insert(player_id, sender);
    }

    pub fn remove_client(&mut self, player_id: &str) {
        self.clients.remove(player_id);
        if self.host_id.as_deref() == Some(player_id) {
            // Randomly select someone else from remaining connected clients as host
            use rand::seq::IteratorRandom;
            let mut rng = rand::thread_rng();
            self.host_id = self.clients.keys().choose(&mut rng).cloned();
        }
    }

    pub fn find_seat_by_id(&self, player_id: &str) -> Option<usize> {
        self.players
            .iter()
            .position(|p| p.as_ref().map_or(false, |p| p.id == player_id))
    }

    pub fn assign_seat(&mut self, player_id: &str, seat: usize, name: &str, avatar: &str) -> bool {
        if seat >= MAX_SEATS || self.players[seat].is_some() || self.status != "waiting" {
            return false;
        }

        // Remove from any existing seat first
        if let Some(old_seat) = self.find_seat_by_id(player_id) {
            self.players[old_seat] = None;
        }

        self.players[seat] = Some(Player {
            id: player_id.to_string(),
            name: name.to_string(),
            avatar: avatar.to_string(),
            seat,
            chips: self.tournament.starting_chips,
            current_bet: 0,
            has_folded: false,
            is_all_in: false,
            is_bot: false,
            bot_personality: None,
            is_eliminated: false,
            hole_cards: Vec::new(),
        });

        true
    }

    pub fn add_bot(&mut self, seat: usize, personality: BotPersonality) -> bool {
        if seat >= MAX_SEATS || self.players[seat].is_some() || self.status != "waiting" {
            return false;
        }

        self.players[seat] = Some(Player {
            id: format!("bot_{}", seat),
            name: personality.name().to_string(),
            avatar: format!("avatar_bot_{}", seat),
            seat,
            chips: self.tournament.starting_chips,
            current_bet: 0,
            has_folded: false,
            is_all_in: false,
            is_bot: true,
            bot_personality: Some(personality),
            is_eliminated: false,
            hole_cards: Vec::new(),
        });

        true
    }

    pub fn remove_seat(&mut self, seat: usize) -> bool {
        if seat < MAX_SEATS {
            if self.status == "waiting" || self.status == "finished" {
                self.players[seat] = None;
                return true;
            } else if self.status == "playing" {
                // If game is in progress, mark player as folded and eliminated so game proceeds
                if let Some(ref mut p) = self.players[seat] {
                    p.has_folded = true;
                    p.is_eliminated = true;
                    p.chips = 0;
                    return true;
                }
            }
        }
        false
    }

    pub fn active_player_count(&self) -> usize {
        self.players
            .iter()
            .filter(|p| p.as_ref().map_or(false, |p| !p.is_eliminated))
            .count()
    }

    pub fn non_folded_player_count(&self) -> usize {
        self.players
            .iter()
            .filter(|p| p.as_ref().map_or(false, |p| !p.is_eliminated && !p.has_folded))
            .count()
    }

    pub fn broadcast_state(&self) {
        let active_seats: Vec<usize> = self
            .players
            .iter()
            .enumerate()
            .filter(|(_, p)| p.as_ref().map_or(false, |p| !p.has_folded && !p.is_eliminated))
            .map(|(i, _)| i)
            .collect();

        let pots = self.pot_manager.calculate_pots(&active_seats);
        let total_pot = self.pot_manager.total_pot();
        let blinds = self.tournament.current_blinds();

        for (client_id, sender) in &self.clients {
            let your_seat = self.find_seat_by_id(client_id);
            let seats = self
                .players
                .iter()
                .map(|opt| {
                    opt.as_ref().map(|p| PlayerView {
                        seat: p.seat,
                        name: p.name.clone(),
                        avatar: p.avatar.clone(),
                        chips: p.chips,
                        current_bet: p.current_bet,
                        has_folded: p.has_folded,
                        is_all_in: p.is_all_in,
                        is_bot: p.is_bot,
                        is_eliminated: p.is_eliminated,
                        card_count: p.hole_cards.len(),
                        is_connected: p.is_bot || self.clients.contains_key(&p.id),
                    })
                })
                .collect();

            let blind_interval_hands = match self.tournament.escalation_rule {
                crate::engine::tournament::EscalationRule::Hands(h) => h,
                _ => 5,
            };

            let is_this_client_host = self.host_id.as_deref() == Some(client_id.as_str());
            let your_cards = your_seat
                .and_then(|s| self.players[s].as_ref())
                .filter(|p| !p.hole_cards.is_empty())
                .map(|p| p.hole_cards.clone());

            let payload = RoomStatePayload {
                room_code: self.room_code.clone(),
                status: self.status.clone(),
                host_seat: self.host_id.as_ref().and_then(|id| self.find_seat_by_id(id)),
                your_seat,
                is_host: is_this_client_host,
                seats,
                blinds: blinds.clone(),
                hands_played: self.tournament.hands_played,
                community_cards: self.community_cards.clone(),
                pots: pots.clone(),
                total_pot,
                current_turn: self.current_turn_seat,
                starting_chips: self.tournament.starting_chips,
                blind_interval_hands,
                your_cards,
            };

            let _ = sender.send(ServerMessage::RoomState(payload));
        }
    }

    pub fn broadcast(&self, msg: &ServerMessage) {
        for sender in self.clients.values() {
            let _ = sender.send(msg.clone());
        }
    }

    pub fn next_active_seat(&self, from_seat: usize) -> Option<usize> {
        for step in 1..=MAX_SEATS {
            let idx = (from_seat + step) % MAX_SEATS;
            if let Some(ref p) = self.players[idx] {
                if !p.is_eliminated && !p.has_folded && !p.is_all_in {
                    return Some(idx);
                }
            }
        }
        None
    }

    pub fn next_occupied_seat(&self, from_seat: usize) -> Option<usize> {
        for step in 1..=MAX_SEATS {
            let idx = (from_seat + step) % MAX_SEATS;
            if let Some(ref p) = self.players[idx] {
                if !p.is_eliminated {
                    return Some(idx);
                }
            }
        }
        None
    }
}
