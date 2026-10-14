use crate::engine::bot::{ActionDecision, BotBrain, BotPersonality};
use crate::engine::card::Deck;
use crate::engine::hand_eval::HandEvaluator;
use crate::messages::*;
use crate::room::{HandStage, Room, MAX_SEATS};
use futures::future::BoxFuture;
use futures::FutureExt;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::time::{sleep, Duration};

pub struct GameController;

impl GameController {
    /// Starts the tournament if at least 2 players exist and at least 1 human is seated
    pub async fn start_tournament(room_arc: Arc<Mutex<Room>>) -> Result<(), String> {
        {
            let mut room = room_arc.lock().await;
            if room.status != "waiting" {
                return Err("Tournament already running or finished".to_string());
            }
            if room.active_player_count() < 2 {
                return Err("Need at least 2 players to start tournament".to_string());
            }
            let human_count = room.players.iter().flatten().filter(|p| !p.is_bot).count();
            if human_count == 0 {
                return Err("Cannot start tournament with only bots. At least one human player must be seated.".to_string());
            }
            room.status = "playing".to_string();

            // Set initial dealer seat to first occupied seat
            if let Some(first) = room.next_occupied_seat(MAX_SEATS - 1) {
                room.dealer_seat = first;
            }
        }

        Self::start_new_hand(room_arc).await;
        Ok(())
    }

    pub fn start_new_hand(room_arc: Arc<Mutex<Room>>) -> BoxFuture<'static, ()> {
        async move {
            {
                let mut room = room_arc.lock().await;

                // Stop game and do not let room continue if no humans remain in the room
                let connected_humans = room.clients.len();
                let seated_humans = room.players.iter().flatten().filter(|p| !p.is_bot).count();
                let active_humans = room.players.iter().flatten().filter(|p| !p.is_bot && !p.is_eliminated).count();

                if connected_humans == 0 || seated_humans == 0 {
                    room.status = "finished".to_string();
                    room.broadcast_state();
                    return;
                }

                // Check if only 1 player remains (Champion!)
                let remaining_players: Vec<(usize, String)> = room
                    .players
                    .iter()
                    .filter_map(|p| p.as_ref().filter(|p| !p.is_eliminated).map(|p| (p.seat, p.name.clone())))
                    .collect();

                // If only 1 player remains OR all human players are eliminated (so only bots remain):
                if remaining_players.len() <= 1 || active_humans == 0 {
                    room.status = "finished".to_string();
                    let winner = remaining_players.first().map(|(_, n)| n.clone()).unwrap_or_else(|| "Champion".to_string());
                    let winner_seat = remaining_players.first().map(|(s, _)| *s).unwrap_or(0);
                    let winner_is_bot = room.players[winner_seat].as_ref().map_or(false, |p| p.is_bot);
                    room.winner_name = Some(winner.clone());

                    let mut standings = Vec::new();
                    standings.push(StandingRecord {
                        rank: 1,
                        name: winner.clone(),
                        seat: winner_seat,
                        is_bot: winner_is_bot,
                    });
                    for elim in room.tournament.eliminations.iter().rev() {
                        standings.push(StandingRecord {
                            rank: elim.rank,
                            name: elim.player_name.clone(),
                            seat: elim.seat,
                            is_bot: false,
                        });
                    }

                    room.broadcast(&ServerMessage::TournamentOver {
                        winner_name: winner,
                        standings,
                    });
                    room.broadcast_state();
                    return;
                }

                // Move dealer seat clockwise to next active player
                if room.tournament.hands_played > 0 {
                    if let Some(next_d) = room.next_occupied_seat(room.dealer_seat) {
                        room.dealer_seat = next_d;
                    }
                }

                // Reset pots, deck, community cards
                room.pot_manager.reset_hand();
                room.deck = Deck::new();
                room.deck.shuffle();
                room.community_cards.clear();
                room.stage = HandStage::PreFlop;
                room.players_acted_this_round.clear();

                for seat in 0..MAX_SEATS {
                    if let Some(ref mut p) = room.players[seat] {
                        p.current_bet = 0;
                        p.has_folded = p.is_eliminated;
                        p.is_all_in = false;
                        p.hole_cards.clear();
                    }
                }

                let dealer_seat = room.dealer_seat;
                let blinds = room.tournament.current_blinds();

                // Heads-up rule: Dealer is SB, next is BB
                let is_heads_up = remaining_players.len() == 2;
                let sb_seat = if is_heads_up {
                    dealer_seat
                } else {
                    room.next_occupied_seat(dealer_seat).unwrap()
                };
                let bb_seat = room.next_occupied_seat(sb_seat).unwrap();

                // Deal 2 cards to each active player
                for _ in 0..2 {
                    for seat in 0..MAX_SEATS {
                        let is_active = room.players[seat].as_ref().map_or(false, |p| !p.is_eliminated);
                        if is_active {
                            if let Some(card) = room.deck.deal() {
                                if let Some(ref mut p) = room.players[seat] {
                                    p.hole_cards.push(card);
                                }
                            }
                        }
                    }
                }

                // Post Ante if any
                if blinds.ante > 0 {
                    for seat in 0..MAX_SEATS {
                        let ante_paid = if let Some(ref mut p) = room.players[seat] {
                            if !p.is_eliminated {
                                let paid = blinds.ante.min(p.chips);
                                p.chips -= paid;
                                if p.chips == 0 {
                                    p.is_all_in = true;
                                }
                                paid
                            } else {
                                0
                            }
                        } else {
                            0
                        };
                        if ante_paid > 0 {
                            room.pot_manager.add_bet(seat, ante_paid);
                        }
                    }
                }

                // Post Small Blind
                let sb_amount = if let Some(ref mut sb_p) = room.players[sb_seat] {
                    let amount = blinds.small_blind.min(sb_p.chips);
                    sb_p.chips -= amount;
                    sb_p.current_bet = amount;
                    if sb_p.chips == 0 {
                        sb_p.is_all_in = true;
                    }
                    amount
                } else {
                    0
                };
                if sb_amount > 0 {
                    room.pot_manager.add_bet(sb_seat, sb_amount);
                }

                // Post Big Blind
                let bb_amount = if let Some(ref mut bb_p) = room.players[bb_seat] {
                    let amount = blinds.big_blind.min(bb_p.chips);
                    bb_p.chips -= amount;
                    bb_p.current_bet = amount;
                    if bb_p.chips == 0 {
                        bb_p.is_all_in = true;
                    }
                    amount
                } else {
                    0
                };
                if bb_amount > 0 {
                    room.pot_manager.add_bet(bb_seat, bb_amount);
                }

                room.highest_bet = blinds.big_blind;
                room.min_raise = blinds.big_blind * 2;
                room.last_raiser_seat = Some(bb_seat);

                // First to act pre-flop is seat after BB (UTG)
                let utg = room.next_active_seat(bb_seat);
                room.current_turn_seat = utg;

                // Broadcast HandStarted individually so hole cards remain private!
                for (client_id, sender) in &room.clients {
                    let your_cards = room
                        .find_seat_by_id(client_id)
                        .and_then(|s| room.players[s].as_ref().map(|p| p.hole_cards.clone()));

                    let _ = sender.send(ServerMessage::HandStarted {
                        hand_number: room.tournament.hands_played + 1,
                        dealer_seat,
                        sb_seat,
                        bb_seat,
                        blinds: blinds.clone(),
                        your_cards,
                    });
                }

                room.broadcast_state();
            }

            // Notify turn or execute bot move
            Self::prompt_or_execute_turn(room_arc).await;
        }
        .boxed()
    }

    pub async fn handle_player_leave(room_arc: Arc<Mutex<Room>>, player_id: &str) {
        let (seat, is_playing, was_their_turn) = {
            let mut room = room_arc.lock().await;
            let seat = room.find_seat_by_id(player_id);
            let is_playing = room.status == "playing";
            let was_their_turn = seat.is_some() && room.current_turn_seat == seat;

            if let Some(s) = seat {
                room.remove_seat(s);
            }
            room.remove_client(player_id);
            room.broadcast_state();

            (seat, is_playing, was_their_turn)
        };

        if is_playing {
            if let Some(s) = seat {
                let room = room_arc.lock().await;
                room.broadcast(&ServerMessage::PlayerActed {
                    seat: s,
                    action: "Left Table (Fold)".to_string(),
                    amount: 0,
                    chips_remaining: 0,
                });
                room.broadcast_state();
            }

            let human_count = {
                let room = room_arc.lock().await;
                room.players
                    .iter()
                    .flatten()
                    .filter(|p| !p.is_bot && !p.is_eliminated)
                    .count()
            };

            // If no active humans remain, do not reset room to waiting; room will be destroyed by main.rs
            if human_count == 0 {
                return;
            }

            if was_their_turn {
                Self::advance_game(room_arc).await;
            } else {
                let should_end = {
                    let room = room_arc.lock().await;
                    room.non_folded_player_count() <= 1
                };
                if should_end {
                    Self::conclude_hand(room_arc).await;
                }
            }
        }
    }

    pub async fn handle_action(
        room_arc: Arc<Mutex<Room>>,
        player_id: &str,
        action: PlayerActionType,
        amount: Option<u32>,
    ) -> Result<(), String> {
        let seat = {
            let room = room_arc.lock().await;
            room.find_seat_by_id(player_id).ok_or("Player not seated")?
        };

        Self::execute_player_action(room_arc, seat, action, amount).await
    }

    pub fn execute_player_action(
        room_arc: Arc<Mutex<Room>>,
        seat: usize,
        action: PlayerActionType,
        amount: Option<u32>,
    ) -> BoxFuture<'static, Result<(), String>> {
        async move {
            let (action_str, amount_paid, chips_left) = {
                let mut room = room_arc.lock().await;
                if room.current_turn_seat != Some(seat) {
                    return Err("Not your turn".to_string());
                }

                let highest = room.highest_bet;
                let current_bet = room.players[seat].as_ref().map_or(0, |p| p.current_bet);
                let to_call = highest.saturating_sub(current_bet);
                let chips = room.players[seat].as_ref().map_or(0, |p| p.chips);

                let (action_label, paid, new_total_bet) = match action {
                    PlayerActionType::Fold => {
                        if let Some(ref mut p) = room.players[seat] {
                            p.has_folded = true;
                        }
                        ("Fold".to_string(), 0, current_bet)
                    }
                    PlayerActionType::Check => {
                        if to_call > 0 {
                            return Err(format!("Cannot check, must call {}", to_call));
                        }
                        ("Check".to_string(), 0, current_bet)
                    }
                    PlayerActionType::Call => {
                        let call_amount = to_call.min(chips);
                        let is_all_in = chips <= to_call;
                        if let Some(ref mut p) = room.players[seat] {
                            p.chips -= call_amount;
                            p.current_bet += call_amount;
                            if p.chips == 0 {
                                p.is_all_in = true;
                            }
                        }
                        (if is_all_in { "All-In Call" } else { "Call" }.to_string(), call_amount, current_bet + call_amount)
                    }
                    PlayerActionType::Raise | PlayerActionType::AllIn => {
                        // All amounts are "raise TO" totals (including chips already in front)
                        let max_total = current_bet + chips;
                        let target_bet = if action == PlayerActionType::AllIn {
                            max_total
                        } else {
                            amount
                                .unwrap_or(room.min_raise)
                                .max(room.min_raise)
                                .min(max_total)
                        };
                        let additional = target_bet.saturating_sub(current_bet).min(chips);
                        let final_bet = current_bet + additional;
                        let is_all_in = chips <= additional;

                        if let Some(ref mut p) = room.players[seat] {
                            p.chips -= additional;
                            p.current_bet = final_bet;
                            if p.chips == 0 {
                                p.is_all_in = true;
                            }
                        }

                        (if is_all_in { "All-In" } else { "Raise" }.to_string(), additional, final_bet)
                    }
                };

                if paid > 0 {
                    room.pot_manager.add_bet(seat, paid);
                }

                if new_total_bet > room.highest_bet {
                    let raise_diff = new_total_bet - room.highest_bet;
                    room.min_raise = new_total_bet + raise_diff.max(room.tournament.current_blinds().big_blind);
                    room.highest_bet = new_total_bet;
                    room.last_raiser_seat = Some(seat);
                    room.players_acted_this_round.clear();
                }

                if !room.players_acted_this_round.contains(&seat) {
                    room.players_acted_this_round.push(seat);
                }

                let chips_left = room.players[seat].as_ref().map_or(0, |p| p.chips);
                (action_label, paid, chips_left)
            };

            // Broadcast action
            {
                let room = room_arc.lock().await;
                room.broadcast(&ServerMessage::PlayerActed {
                    seat,
                    action: action_str,
                    amount: amount_paid,
                    chips_remaining: chips_left,
                });
                room.broadcast_state();
            }

            // Advance to next action / round
            Self::advance_game(room_arc).await;
            Ok(())
        }
        .boxed()
    }

    pub fn advance_game(room_arc: Arc<Mutex<Room>>) -> BoxFuture<'static, ()> {
        async move {
            let should_finish_hand;
            let should_advance_street;

            {
                let mut room = room_arc.lock().await;

                // 1. If only 1 player is left (all others folded), hand ends immediately
                if room.non_folded_player_count() <= 1 {
                    should_finish_hand = true;
                    should_advance_street = false;
                } else {
                    // Check if betting round complete
                    let highest = room.highest_bet;
                    let active_must_act: Vec<usize> = room
                        .players
                        .iter()
                        .enumerate()
                        .filter_map(|(i, p)| {
                            if let Some(ref p) = p {
                                if !p.is_eliminated && !p.has_folded && !p.is_all_in {
                                    if !room.players_acted_this_round.contains(&i) || p.current_bet < highest {
                                        return Some(i);
                                    }
                                }
                            }
                            None
                        })
                        .collect();

                    if active_must_act.is_empty() {
                        should_advance_street = true;
                        should_finish_hand = false;
                    } else {
                        let current = room.current_turn_seat.unwrap_or(0);
                        room.current_turn_seat = room.next_active_seat(current);
                        should_advance_street = false;
                        should_finish_hand = false;
                    }
                }
            }

            if should_finish_hand {
                Self::conclude_hand(room_arc).await;
            } else if should_advance_street {
                // Brief pause so players can clearly see the closing action bubble (Check/Call/Bet) before cards are dealt
                sleep(Duration::from_millis(700)).await;
                Self::advance_street(room_arc).await;
            } else {
                Self::prompt_or_execute_turn(room_arc).await;
            }
        }
        .boxed()
    }

    pub fn advance_street(room_arc: Arc<Mutex<Room>>) -> BoxFuture<'static, ()> {
        async move {
            let next_stage;
            let deal_count;

            {
                let mut room = room_arc.lock().await;
                room.pot_manager.start_new_round();
                for seat in 0..MAX_SEATS {
                    if let Some(ref mut p) = room.players[seat] {
                        p.current_bet = 0;
                    }
                }
                room.highest_bet = 0;
                room.min_raise = room.tournament.current_blinds().big_blind;
                room.last_raiser_seat = None;
                room.players_acted_this_round.clear();

                match room.stage {
                    HandStage::PreFlop => {
                        next_stage = HandStage::Flop;
                        deal_count = 3;
                    }
                    HandStage::Flop => {
                        next_stage = HandStage::Turn;
                        deal_count = 1;
                    }
                    HandStage::Turn => {
                        next_stage = HandStage::River;
                        deal_count = 1;
                    }
                    HandStage::River => {
                        next_stage = HandStage::Showdown;
                        deal_count = 0;
                    }
                    HandStage::Showdown => {
                        next_stage = HandStage::Showdown;
                        deal_count = 0;
                    }
                }

                room.stage = next_stage.clone();

                for _ in 0..deal_count {
                    if let Some(c) = room.deck.deal() {
                        room.community_cards.push(c);
                    }
                }

                room.current_turn_seat = room.next_active_seat(room.dealer_seat);

                let stage_name = match room.stage {
                    HandStage::Flop => "Flop",
                    HandStage::Turn => "Turn",
                    HandStage::River => "River",
                    _ => "Showdown",
                };

                let active_seats: Vec<usize> = room
                    .players
                    .iter()
                    .enumerate()
                    .filter(|(_, p)| p.as_ref().map_or(false, |p| !p.has_folded && !p.is_eliminated))
                    .map(|(i, _)| i)
                    .collect();

                let pots = room.pot_manager.calculate_pots(&active_seats);
                let total_pot = room.pot_manager.total_pot();

                room.broadcast(&ServerMessage::BoardUpdated {
                    stage: stage_name.to_string(),
                    community_cards: room.community_cards.clone(),
                    pots,
                    total_pot,
                });
                room.broadcast_state();
            }

            if next_stage == HandStage::Showdown {
                Self::conclude_hand(room_arc).await;
            } else {
                let players_with_chips = {
                    let room = room_arc.lock().await;
                    room.players
                        .iter()
                        .filter(|p| p.as_ref().map_or(false, |p| !p.has_folded && !p.is_eliminated && !p.is_all_in))
                        .count()
                };

                if players_with_chips <= 1 {
                    sleep(Duration::from_millis(1000)).await;
                    Self::advance_street(room_arc).await;
                } else {
                    Self::prompt_or_execute_turn(room_arc).await;
                }
            }
        }
        .boxed()
    }

    pub fn conclude_hand(room_arc: Arc<Mutex<Room>>) -> BoxFuture<'static, ()> {
        async move {
            sleep(Duration::from_millis(800)).await;

            let mut eliminated_players = Vec::new();

            {
                let mut room = room_arc.lock().await;

                let non_folded: Vec<usize> = room
                    .players
                    .iter()
                    .enumerate()
                    .filter_map(|(i, p)| p.as_ref().filter(|p| !p.is_eliminated && !p.has_folded).map(|_| i))
                    .collect();

                let mut revealed = Vec::new();
                let mut winners = Vec::new();

                if non_folded.len() == 1 {
                    let winner_seat = non_folded[0];
                    let total = room.pot_manager.total_pot();
                    if let Some(ref mut p) = room.players[winner_seat] {
                        p.chips += total;
                        winners.push(HandWinner {
                            seat: winner_seat,
                            name: p.name.clone(),
                            amount_won: total,
                            pot_index: 0,
                            description: "Won uncontested (all others folded)".to_string(),
                        });
                    }
                } else {
                    let community = room.community_cards.clone();
                    let mut hand_scores = HashMap::new();

                    for &seat in &non_folded {
                        if let Some(ref p) = room.players[seat] {
                            let mut all_cards = p.hole_cards.clone();
                            all_cards.extend(community.clone());
                            let eval = HandEvaluator::evaluate(&all_cards);

                            revealed.push(PlayerShowdownHand {
                                seat,
                                name: p.name.clone(),
                                cards: p.hole_cards.clone(),
                                hand_description: eval.description.clone(),
                            });

                            hand_scores.insert(seat, eval);
                        }
                    }

                    let pots = room.pot_manager.calculate_pots(&non_folded);
                    for (pot_idx, pot) in pots.iter().enumerate() {
                        let mut best_score: Option<&crate::engine::hand_eval::EvaluatedHand> = None;
                        let mut pot_winners: Vec<usize> = Vec::new();

                        for &seat in &pot.eligible_players {
                            if let Some(eval) = hand_scores.get(&seat) {
                                match best_score {
                                    None => {
                                        best_score = Some(eval);
                                        pot_winners = vec![seat];
                                    }
                                    Some(best) => {
                                        if eval > best {
                                            best_score = Some(eval);
                                            pot_winners = vec![seat];
                                        } else if eval == best {
                                            pot_winners.push(seat);
                                        }
                                    }
                                }
                            }
                        }

                        if !pot_winners.is_empty() {
                            let split_amount = pot.amount / pot_winners.len() as u32;
                            let remainder = pot.amount % pot_winners.len() as u32;

                            for (i, &winner_seat) in pot_winners.iter().enumerate() {
                                let payout = split_amount + if i == 0 { remainder } else { 0 };
                                if let Some(ref mut p) = room.players[winner_seat] {
                                    p.chips += payout;
                                    let desc = hand_scores.get(&winner_seat).map_or("", |e| &e.description);
                                    winners.push(HandWinner {
                                        seat: winner_seat,
                                        name: p.name.clone(),
                                        amount_won: payout,
                                        pot_index: pot_idx,
                                        description: desc.to_string(),
                                    });
                                }
                            }
                        }
                    }
                }

                let pots = room.pot_manager.calculate_pots(&non_folded);
                room.broadcast(&ServerMessage::Showdown {
                    revealed_hands: revealed,
                    winners,
                    pots,
                });

                let remaining_count = room
                    .players
                    .iter()
                    .filter(|p| p.as_ref().map_or(false, |p| !p.is_eliminated))
                    .count();

                for seat in 0..MAX_SEATS {
                    if let Some(ref mut p) = room.players[seat] {
                        if !p.is_eliminated && p.chips == 0 {
                            p.is_eliminated = true;
                            eliminated_players.push((p.seat, p.name.clone(), remaining_count));
                        }
                    }
                }

                for (seat, name, rank) in &eliminated_players {
                    room.tournament.record_elimination(name.clone(), *seat, *rank);
                    room.broadcast(&ServerMessage::PlayerEliminated {
                        seat: *seat,
                        player_name: name.clone(),
                        rank: *rank,
                    });
                }

                let leveled_up = room.tournament.on_hand_completed();
                if leveled_up {
                    let blinds = room.tournament.current_blinds();
                    room.broadcast(&ServerMessage::BlindLevelUp {
                        level: blinds.level,
                        sb: blinds.small_blind,
                        bb: blinds.big_blind,
                        ante: blinds.ante,
                    });
                }

                room.broadcast_state();
            }

            // Wait 5.5 seconds (extended by 1s) for showdown celebration and card reveal before starting next hand
            sleep(Duration::from_millis(5500)).await;

            Self::start_new_hand(room_arc).await;
        }
        .boxed()
    }

    pub fn prompt_or_execute_turn(room_arc: Arc<Mutex<Room>>) -> BoxFuture<'static, ()> {
        async move {
            let turn_seat;
            let is_bot;
            let is_connected;
            let bot_personality;
            let hole_cards;
            let community_cards;
            let call_amount;
            let min_raise;
            let current_chips;
            let pot_size;

            {
                let room = room_arc.lock().await;
                turn_seat = match room.current_turn_seat {
                    Some(s) => s,
                    None => return,
                };

                let player = match room.players[turn_seat].as_ref() {
                    Some(p) => p,
                    None => return,
                };

                is_bot = player.is_bot;
                is_connected = player.is_bot || room.clients.contains_key(&player.id);
                bot_personality = player.bot_personality.unwrap_or(BotPersonality::Shark);
                hole_cards = player.hole_cards.clone();
                community_cards = room.community_cards.clone();
                let highest = room.highest_bet;
                call_amount = highest.saturating_sub(player.current_bet);
                min_raise = room.min_raise;
                current_chips = player.chips;
                pot_size = room.pot_manager.total_pot();

                room.broadcast(&ServerMessage::PlayerTurn {
                    seat: turn_seat,
                    call_amount,
                    min_raise,
                    // Raise-to cap: stack behind + what's already committed this street
                    max_raise: player.chips + player.current_bet,
                });
                room.broadcast_state();
            }

            if is_bot {
                let delay_ms = {
                    use rand::Rng;
                    rand::thread_rng().gen_range(700..1400)
                };
                sleep(Duration::from_millis(delay_ms)).await;

                let decision = BotBrain::decide_action(
                    bot_personality,
                    &hole_cards,
                    &community_cards,
                    call_amount,
                    min_raise,
                    current_chips,
                    pot_size,
                );

                let (act_type, amt) = match decision {
                    ActionDecision::Fold => (PlayerActionType::Fold, None),
                    ActionDecision::Check => (PlayerActionType::Check, None),
                    ActionDecision::Call(_) => (PlayerActionType::Call, None),
                    ActionDecision::Raise(val) => (PlayerActionType::Raise, Some(val)),
                };

                let _ = Self::execute_player_action(room_arc, turn_seat, act_type, amt).await;
            } else if !is_connected {
                // Disconnected human: give 8 seconds to reconnect before auto-acting
                sleep(Duration::from_secs(8)).await;

                let should_auto_act = {
                    let room = room_arc.lock().await;
                    if room.current_turn_seat == Some(turn_seat) {
                        if let Some(ref p) = room.players[turn_seat] {
                            !room.clients.contains_key(&p.id)
                        } else {
                            false
                        }
                    } else {
                        false
                    }
                };

                if should_auto_act {
                    let auto_action = if call_amount == 0 {
                        PlayerActionType::Check
                    } else {
                        PlayerActionType::Fold
                    };
                    let _ = Self::execute_player_action(room_arc, turn_seat, auto_action, None).await;
                }
            }
        }
        .boxed()
    }
}
