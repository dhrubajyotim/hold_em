use crate::engine::bot::BotPersonality;
use crate::engine::card::Card;
use crate::engine::pot::Pot;
use crate::engine::tournament::BlindLevel;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum ClientMessage {
    JoinRoom {
        player_name: String,
        avatar: String,
    },
    SelectSeat {
        seat: usize,
        player_name: Option<String>,
    },
    SetPlayerName {
        player_name: String,
    },
    UpdateSettings {
        starting_chips: Option<u32>,
        blind_interval_hands: Option<u32>,
    },
    AddBot {
        seat: usize,
        personality: BotPersonality,
    },
    RemovePlayer {
        seat: usize,
    },
    LeaveTable,
    StartTournament,
    ResetTournament,
    PlayerAction {
        action: PlayerActionType,
        amount: Option<u32>,
    },
    SendChat {
        message: String,
    },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PlayerActionType {
    Fold,
    Check,
    Call,
    Raise,
    AllIn,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum ServerMessage {
    RoomState(RoomStatePayload),
    HandStarted {
        hand_number: u32,
        dealer_seat: usize,
        sb_seat: usize,
        bb_seat: usize,
        blinds: BlindLevel,
        your_cards: Option<Vec<Card>>,
    },
    PlayerTurn {
        seat: usize,
        call_amount: u32,
        min_raise: u32,
        max_raise: u32,
    },
    PlayerActed {
        seat: usize,
        action: String,
        amount: u32,
        chips_remaining: u32,
    },
    BoardUpdated {
        stage: String, // "Flop", "Turn", "River"
        community_cards: Vec<Card>,
        pots: Vec<Pot>,
        total_pot: u32,
    },
    Showdown {
        revealed_hands: Vec<PlayerShowdownHand>,
        winners: Vec<HandWinner>,
        pots: Vec<Pot>,
    },
    PlayerEliminated {
        seat: usize,
        player_name: String,
        rank: usize,
    },
    BlindLevelUp {
        level: u32,
        sb: u32,
        bb: u32,
        ante: u32,
    },
    TournamentOver {
        winner_name: String,
        standings: Vec<StandingRecord>,
    },
    ChatMessage {
        sender: String,
        message: String,
    },
    Error {
        message: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoomStatePayload {
    pub room_code: String,
    pub status: String, // "waiting", "playing", "finished"
    pub host_seat: Option<usize>,
    pub your_seat: Option<usize>,
    pub is_host: bool,
    pub seats: Vec<Option<PlayerView>>,
    pub blinds: BlindLevel,
    pub hands_played: u32,
    pub community_cards: Vec<Card>,
    pub pots: Vec<Pot>,
    pub total_pot: u32,
    pub current_turn: Option<usize>,
    pub starting_chips: u32,
    pub blind_interval_hands: u32,
    pub your_cards: Option<Vec<Card>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlayerView {
    pub seat: usize,
    pub name: String,
    pub avatar: String,
    pub chips: u32,
    pub current_bet: u32,
    pub has_folded: bool,
    pub is_all_in: bool,
    pub is_bot: bool,
    pub is_eliminated: bool,
    pub card_count: usize,
    #[serde(default = "default_true")]
    pub is_connected: bool,
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlayerShowdownHand {
    pub seat: usize,
    pub name: String,
    pub cards: Vec<Card>,
    pub hand_description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HandWinner {
    pub seat: usize,
    pub name: String,
    pub amount_won: u32,
    pub pot_index: usize,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StandingRecord {
    pub rank: usize,
    pub name: String,
    pub seat: usize,
    pub is_bot: bool,
}
