mod db;
mod engine;
mod game_controller;
mod messages;
mod room;

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Path, Query, State,
    },
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use db::Database;
use engine::tournament::EscalationRule;
use futures::{SinkExt, StreamExt};
use messages::{ClientMessage, ServerMessage};
use room::Room;
use serde::Deserialize;
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::{mpsc, Mutex};
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::ServeDir;
use uuid::Uuid;

#[derive(Clone)]
pub struct AppState {
    pub rooms: Arc<Mutex<HashMap<String, Arc<Mutex<Room>>>>>,
    pub db: Arc<Mutex<Database>>,
}

#[derive(Deserialize)]
struct CreateRoomRequest {
    starting_chips: Option<u32>,
    escalation_rule: Option<String>,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let db = Database::new("poker.db").expect("Failed to initialize SQLite database");
    let state = AppState {
        rooms: Arc::new(Mutex::new(HashMap::new())),
        db: Arc::new(Mutex::new(db)),
    };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let dist_dir = if std::path::Path::new("dist").exists() {
        "dist"
    } else {
        "../dist"
    };

    let bg_rooms = state.rooms.clone();

    let app = Router::new()
        .route("/api/health", get(|| async { "OK" }))
        .route("/api/rooms", axum::routing::get(list_rooms).post(create_room))
        .route("/ws/:room_code", get(ws_handler))
        .nest_service("/", ServeDir::new(dist_dir))
        .layer(cors)
        .with_state(state);

    let addr = SocketAddr::from(([127, 0, 0, 1], 3001));
    println!(">>> Poker Backend listening on http://{}", addr);

    // Background task: prune empty or bot-only rooms every 10 seconds
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(tokio::time::Duration::from_secs(10)).await;
            let mut rooms = bg_rooms.lock().await;
            let mut to_remove = Vec::new();
            for (code, room_arc) in rooms.iter() {
                if let Ok(room) = room_arc.try_lock() {
                    let human_count = room.players.iter().flatten().filter(|p| !p.is_bot).count();
                    let connected_count = room.clients.len();
                    if connected_count == 0 || human_count == 0 {
                        if room.has_had_clients || human_count == 0 || room.created_at.elapsed().as_secs() > 15 {
                            to_remove.push(code.clone());
                        }
                    }
                }
            }
            for code in to_remove {
                rooms.remove(&code);
            }
        }
    });

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn list_rooms(
    State(state): State<AppState>,
) -> impl IntoResponse {
    let mut rooms = state.rooms.lock().await;

    // Prune rooms where everyone has left, that were never joined, or that have only bots
    let mut to_remove = Vec::new();
    for (code, room_arc) in rooms.iter() {
        let room = room_arc.lock().await;
        let human_count = room.players.iter().flatten().filter(|p| !p.is_bot).count();
        if room.clients.is_empty() || human_count == 0 {
            if room.has_had_clients || human_count == 0 {
                // Was joined previously, or only bots remain! Prune!
                to_remove.push(code.clone());
            } else if room.created_at.elapsed().as_secs() > 15 {
                // Created but nobody ever connected within 15s. Prune!
                to_remove.push(code.clone());
            }
        }
    }
    for code in to_remove {
        rooms.remove(&code);
    }

    let mut room_list = Vec::new();
    for (code, room_arc) in rooms.iter() {
        let room = room_arc.lock().await;
        let human_count = room.players.iter().flatten().filter(|p| !p.is_bot).count();
        let total_clients = room.clients.len();

        // Never list empty rooms or bot-only rooms in the active rooms list
        if room.clients.is_empty() || total_clients == 0 || human_count == 0 {
            continue;
        }

        let occupied_seats = room.players.iter().filter(|p| p.is_some()).count();
        let bot_count = room.players.iter().flatten().filter(|p| p.is_bot).count();
        let blind_interval_hands = match room.tournament.escalation_rule {
            crate::engine::tournament::EscalationRule::Hands(h) => h,
            _ => 5,
        };

        let has_space = occupied_seats < room::MAX_SEATS;

        room_list.push(serde_json::json!({
            "room_code": code,
            "status": room.status,
            "total_clients": total_clients,
            "human_count": human_count,
            "bot_count": bot_count,
            "occupied_seats": occupied_seats,
            "max_seats": room::MAX_SEATS,
            "has_space": has_space,
            "starting_chips": room.tournament.starting_chips,
            "blind_interval_hands": blind_interval_hands,
        }));
    }

    Json(room_list)
}

async fn create_room(
    State(state): State<AppState>,
    Json(payload): Json<CreateRoomRequest>,
) -> impl IntoResponse {
    let room_code: String = {
        use rand::Rng;
        let s: String = rand::thread_rng()
            .sample_iter(&rand::distributions::Alphanumeric)
            .filter(|c| c.is_ascii_alphabetic())
            .take(6)
            .map(char::from)
            .collect();
        s.to_uppercase()
    };

    let starting_chips = payload.starting_chips.unwrap_or(3000);
    let rule = match payload.escalation_rule.as_deref() {
        Some("minutes_3") => EscalationRule::Minutes(3),
        Some(s) if s.starts_with("hands_") => EscalationRule::Hands(
            s["hands_".len()..].parse::<u32>().ok().filter(|n| (1..=50).contains(n)).unwrap_or(5),
        ),
        _ => EscalationRule::Hands(5),
    };

    let room_id = Uuid::new_v4().to_string();
    {
        let db = state.db.lock().await;
        let _ = db.save_tournament(&room_id, &room_code, starting_chips, "hands_5");
    }

    let room = Arc::new(Mutex::new(Room::new(room_code.clone(), starting_chips, rule)));
    {
        let mut rooms = state.rooms.lock().await;
        rooms.insert(room_code.clone(), room);
    }

    Json(serde_json::json!({
        "room_code": room_code,
        "starting_chips": starting_chips
    }))
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    Path(room_code): Path<String>,
    Query(params): Query<HashMap<String, String>>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    // Persistent per-tab player id so a page refresh reconnects to the same seat
    let client_id = params
        .get("pid")
        .filter(|p| !p.is_empty() && p.len() <= 64 && p.chars().all(|c| c.is_ascii_alphanumeric() || c == '-'))
        .map(|p| format!("p_{}", p))
        .unwrap_or_else(|| format!("p_{}", Uuid::new_v4()));
    let room_code = room_code.to_uppercase();
    let room_arc = {
        let rooms = state.rooms.lock().await;
        match rooms.get(&room_code) {
            Some(r) => r.clone(),
            None => {
                return (
                    axum::http::StatusCode::NOT_FOUND,
                    Json(serde_json::json!({ "error": "Room not found or no longer active" })),
                )
                    .into_response();
            }
        }
    };

    let state_clone = state.clone();
    let code_clone = room_code.clone();
    ws.on_upgrade(move |socket| handle_socket(socket, room_arc, state_clone, code_clone, client_id))
        .into_response()
}

async fn handle_socket(
    socket: WebSocket,
    room_arc: Arc<Mutex<Room>>,
    app_state: AppState,
    room_code: String,
    client_id: String,
) {
    let (mut sender, mut receiver) = socket.split();
    let (tx, mut rx) = mpsc::unbounded_channel::<ServerMessage>();
    // Kept to detect whether this connection is still the active one for client_id
    let tx_check = tx.clone();

    // Register client in room (replaces any previous connection with the same id)
    {
        let mut room = room_arc.lock().await;
        room.add_client(client_id.clone(), tx);
        room.broadcast_state();
    }

    // Task to forward outgoing messages to WebSocket
    let client_id_clone = client_id.clone();
    let write_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if let Ok(json_str) = serde_json::to_string(&msg) {
                if sender.send(Message::Text(json_str)).await.is_err() {
                    break;
                }
            }
        }
    });

    // Handle incoming messages from WebSocket
    let client_id_recv = client_id.clone();
    let room_arc_recv = room_arc.clone();

    while let Some(Ok(msg)) = receiver.next().await {
        if let Message::Text(text) = msg {
            if let Ok(client_msg) = serde_json::from_str::<ClientMessage>(&text) {
                match client_msg {
                    ClientMessage::JoinRoom { player_name: _, avatar: _ } => {
                        let room = room_arc_recv.lock().await;
                        // Client is connected and registered; do not auto-force into seat 0
                        // Instead, broadcast state so they see the current lobby/seats
                        room.broadcast_state();
                    }
                    ClientMessage::SelectSeat { seat, player_name } => {
                        let mut room = room_arc_recv.lock().await;
                        let name = player_name.unwrap_or_else(|| {
                            room.find_seat_by_id(&client_id_recv)
                                .and_then(|s| room.players[s].as_ref().map(|p| p.name.clone()))
                                .unwrap_or_else(|| "Player".to_string())
                        });
                        let avatar = format!("avatar_{}", (seat % 6) + 1);
                        room.assign_seat(&client_id_recv, seat, &name, &avatar);
                        room.broadcast_state();
                    }
                    ClientMessage::SetPlayerName { player_name } => {
                        let mut room = room_arc_recv.lock().await;
                        if let Some(seat) = room.find_seat_by_id(&client_id_recv) {
                            if let Some(ref mut p) = room.players[seat] {
                                p.name = player_name;
                            }
                            room.broadcast_state();
                        }
                    }
                    ClientMessage::UpdateSettings { starting_chips, blind_interval_hands } => {
                        let mut room = room_arc_recv.lock().await;
                        if room.status == "waiting" {
                            if let Some(chips) = starting_chips {
                                if chips >= 100 && chips <= 100_000 {
                                    room.tournament.update_starting_chips(chips);
                                    for p in room.players.iter_mut().flatten() {
                                        p.chips = chips;
                                    }
                                }
                            }
                            if let Some(interval) = blind_interval_hands {
                                if interval >= 1 && interval <= 50 {
                                    room.tournament.escalation_rule = crate::engine::tournament::EscalationRule::Hands(interval);
                                }
                            }
                            room.broadcast_state();
                        }
                    }
                    ClientMessage::AddBot { seat, personality } => {
                        let mut room = room_arc_recv.lock().await;
                        room.add_bot(seat, personality);
                        room.broadcast_state();
                    }
                    ClientMessage::RemovePlayer { seat } => {
                        let mut room = room_arc_recv.lock().await;
                        room.remove_seat(seat);
                        room.broadcast_state();
                    }
                    ClientMessage::LeaveTable => {
                        game_controller::GameController::handle_player_leave(
                            room_arc_recv.clone(),
                            &client_id_recv,
                        )
                        .await;

                        // If room is now empty or only bots remain, destroy immediately
                        let should_destroy = {
                            let room = room_arc_recv.lock().await;
                            let human_count = room.players.iter().flatten().filter(|p| !p.is_bot).count();
                            room.clients.is_empty() || human_count == 0
                        };
                        if should_destroy {
                            let mut rooms = app_state.rooms.lock().await;
                            if rooms.get(&room_code).map_or(false, |r| Arc::ptr_eq(r, &room_arc_recv)) {
                                rooms.remove(&room_code);
                            }
                        }
                    }
                    ClientMessage::StartTournament => {
                        let _ = game_controller::GameController::start_tournament(
                            room_arc_recv.clone(),
                        )
                        .await;
                    }
                    ClientMessage::ResetTournament => {
                        let mut room = room_arc_recv.lock().await;
                        if room.status == "finished" {
                            room.status = "waiting".to_string();
                            room.current_turn_seat = None;
                            room.community_cards.clear();
                            room.pot_manager.reset_hand();
                            room.winner_name = None;
                            room.tournament.hands_played = 0;
                            room.tournament.current_level_index = 0;
                            room.tournament.eliminations.clear();
                            let starting = room.tournament.starting_chips;
                            for s in 0..room::MAX_SEATS {
                                if let Some(ref mut p) = room.players[s] {
                                    p.chips = starting;
                                    p.current_bet = 0;
                                    p.has_folded = false;
                                    p.is_all_in = false;
                                    p.is_eliminated = false;
                                    p.hole_cards.clear();
                                }
                            }
                            room.broadcast_state();
                        }
                    }
                    ClientMessage::PlayerAction { action, amount } => {
                        let _ = game_controller::GameController::handle_action(
                            room_arc_recv.clone(),
                            &client_id_recv,
                            action,
                            amount,
                        )
                        .await;
                    }
                    ClientMessage::SendChat { message } => {
                        let room = room_arc_recv.lock().await;
                        let sender_name = room
                            .find_seat_by_id(&client_id_recv)
                            .and_then(|s| room.players[s].as_ref().map(|p| p.name.clone()))
                            .unwrap_or_else(|| "Spectator".to_string());
                        room.broadcast(&ServerMessage::ChatMessage {
                            sender: sender_name,
                            message,
                        });
                    }
                }
            }
        }
    }

    // Client disconnected (app/tab closed or connection dropped)
    write_task.abort();

    let (was_current, room_status) = {
        let mut room = room_arc.lock().await;
        let is_curr = room.clients.get(&client_id).map_or(false, |s| s.same_channel(&tx_check));
        if is_curr {
            room.remove_client(&client_id);
        }
        let status = room.status.clone();
        (is_curr, status)
    };

    if !was_current {
        return; // Replaced by a newer connection or already explicitly removed
    }

    if room_status == "waiting" {
        // In waiting lobby: closing the app means leaving the room immediately!
        {
            let mut room = room_arc.lock().await;
            if let Some(seat) = room.find_seat_by_id(&client_id) {
                room.remove_seat(seat);
            }
            room.broadcast_state();
        }

        // If everyone has left the waiting room, destroy it immediately!
        let is_empty = room_arc.lock().await.clients.is_empty();
        if is_empty {
            let mut rooms = app_state.rooms.lock().await;
            if rooms.get(&room_code).map_or(false, |r| Arc::ptr_eq(r, &room_arc)) {
                rooms.remove(&room_code);
            }
        }
    } else {
        // In playing / finished tournament:
        // Player disconnected: preserve seat and cards so they can rejoin!
        {
            let room = room_arc.lock().await;
            room.broadcast_state();
        }

        // If NO humans are connected anywhere in this room:
        let is_empty = room_arc.lock().await.clients.is_empty();
        if is_empty {
            // Check if any human players are even seated:
            let has_human_players = room_arc.lock().await.players.iter().flatten().any(|p| !p.is_bot);
            if !has_human_players {
                // Only bots remain: destroy immediately!
                let mut rooms = app_state.rooms.lock().await;
                if rooms.get(&room_code).map_or(false, |r| Arc::ptr_eq(r, &room_arc)) {
                    rooms.remove(&room_code);
                }
            } else {
                // Give 15 seconds for a potential rejoin / refresh:
                tokio::time::sleep(std::time::Duration::from_secs(15)).await;

                let is_still_empty = room_arc.lock().await.clients.is_empty();
                if is_still_empty {
                    // Every player has left and no one returned: destroy room!
                    let mut rooms = app_state.rooms.lock().await;
                    if rooms.get(&room_code).map_or(false, |r| Arc::ptr_eq(r, &room_arc)) {
                        rooms.remove(&room_code);
                    }
                }
            }
        }
    }
}
