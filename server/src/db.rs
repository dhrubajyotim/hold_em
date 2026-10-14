use rusqlite::{params, Connection, Result};

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new(db_path: &str) -> Result<Self> {
        let conn = Connection::open(db_path)?;
        let db = Self { conn };
        db.init_tables()?;
        Ok(db)
    }

    fn init_tables(&self) -> Result<()> {
        self.conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS tournaments (
                id TEXT PRIMARY KEY,
                room_code TEXT UNIQUE NOT NULL,
                status TEXT NOT NULL,
                starting_chips INTEGER NOT NULL,
                blind_rule TEXT NOT NULL,
                winner_name TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS tournament_players (
                id TEXT PRIMARY KEY,
                tournament_id TEXT NOT NULL,
                name TEXT NOT NULL,
                seat INTEGER NOT NULL,
                is_bot INTEGER NOT NULL,
                chips INTEGER NOT NULL,
                elimination_rank INTEGER,
                FOREIGN KEY(tournament_id) REFERENCES tournaments(id)
            );

            CREATE TABLE IF NOT EXISTS hand_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tournament_id TEXT NOT NULL,
                hand_number INTEGER NOT NULL,
                blind_level INTEGER NOT NULL,
                pot_size INTEGER NOT NULL,
                board_cards TEXT NOT NULL,
                summary TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            ",
        )?;
        Ok(())
    }

    pub fn save_tournament(&self, id: &str, room_code: &str, starting_chips: u32, blind_rule: &str) -> Result<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO tournaments (id, room_code, status, starting_chips, blind_rule)
             VALUES (?1, ?2, 'waiting', ?3, ?4)",
            params![id, room_code, starting_chips, blind_rule],
        )?;
        Ok(())
    }

    pub fn update_tournament_status(&self, id: &str, status: &str, winner: Option<&str>) -> Result<()> {
        self.conn.execute(
            "UPDATE tournaments SET status = ?1, winner_name = ?2 WHERE id = ?3",
            params![status, winner, id],
        )?;
        Ok(())
    }

    pub fn record_hand(&self, tournament_id: &str, hand_num: u32, level: u32, pot: u32, board: &str, summary: &str) -> Result<()> {
        self.conn.execute(
            "INSERT INTO hand_records (tournament_id, hand_number, blind_level, pot_size, board_cards, summary)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![tournament_id, hand_num, level, pot, board, summary],
        )?;
        Ok(())
    }
}
