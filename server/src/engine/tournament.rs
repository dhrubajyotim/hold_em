use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlindLevel {
    pub level: u32,
    pub small_blind: u32,
    pub big_blind: u32,
    pub ante: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum EscalationRule {
    Hands(u32),   // e.g. every 5 hands
    Minutes(u32), // e.g. every 3 minutes
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TournamentManager {
    pub starting_chips: u32,
    pub current_level_index: usize,
    pub escalation_rule: EscalationRule,
    pub hands_played: u32,
    pub levels: Vec<BlindLevel>,
    pub eliminations: Vec<EliminationRecord>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EliminationRecord {
    pub player_name: String,
    pub seat: usize,
    pub rank: usize, // 7..=2
    pub eliminated_at_hand: u32,
}

impl TournamentManager {
    pub fn new(starting_chips: u32, escalation_rule: EscalationRule) -> Self {
        let levels = Self::generate_blind_levels(starting_chips);

        Self {
            starting_chips,
            current_level_index: 0,
            escalation_rule,
            hands_played: 0,
            levels,
            eliminations: Vec::new(),
        }
    }

    /// Generates a perfectly balanced 12-level tournament blind schedule
    /// where starting stack is consistently 100 Big Blinds (Level 1 BB = 1% of stack).
    pub fn generate_blind_levels(starting_chips: u32) -> Vec<BlindLevel> {
        match starting_chips {
            3000 => vec![
                BlindLevel { level: 1, small_blind: 15, big_blind: 30, ante: 0 },
                BlindLevel { level: 2, small_blind: 25, big_blind: 50, ante: 0 },
                BlindLevel { level: 3, small_blind: 50, big_blind: 100, ante: 10 },
                BlindLevel { level: 4, small_blind: 75, big_blind: 150, ante: 15 },
                BlindLevel { level: 5, small_blind: 100, big_blind: 200, ante: 20 },
                BlindLevel { level: 6, small_blind: 150, big_blind: 300, ante: 30 },
                BlindLevel { level: 7, small_blind: 250, big_blind: 500, ante: 50 },
                BlindLevel { level: 8, small_blind: 400, big_blind: 800, ante: 80 },
                BlindLevel { level: 9, small_blind: 600, big_blind: 1200, ante: 120 },
                BlindLevel { level: 10, small_blind: 1000, big_blind: 2000, ante: 200 },
                BlindLevel { level: 11, small_blind: 1500, big_blind: 3000, ante: 300 },
                BlindLevel { level: 12, small_blind: 2500, big_blind: 5000, ante: 500 },
            ],
            5000 => vec![
                BlindLevel { level: 1, small_blind: 25, big_blind: 50, ante: 0 },
                BlindLevel { level: 2, small_blind: 50, big_blind: 100, ante: 0 },
                BlindLevel { level: 3, small_blind: 75, big_blind: 150, ante: 15 },
                BlindLevel { level: 4, small_blind: 100, big_blind: 200, ante: 20 },
                BlindLevel { level: 5, small_blind: 150, big_blind: 300, ante: 30 },
                BlindLevel { level: 6, small_blind: 250, big_blind: 500, ante: 50 },
                BlindLevel { level: 7, small_blind: 400, big_blind: 800, ante: 80 },
                BlindLevel { level: 8, small_blind: 600, big_blind: 1200, ante: 120 },
                BlindLevel { level: 9, small_blind: 1000, big_blind: 2000, ante: 200 },
                BlindLevel { level: 10, small_blind: 1500, big_blind: 3000, ante: 300 },
                BlindLevel { level: 11, small_blind: 2500, big_blind: 5000, ante: 500 },
                BlindLevel { level: 12, small_blind: 4000, big_blind: 8000, ante: 800 },
            ],
            10000 => vec![
                BlindLevel { level: 1, small_blind: 50, big_blind: 100, ante: 0 },
                BlindLevel { level: 2, small_blind: 75, big_blind: 150, ante: 0 },
                BlindLevel { level: 3, small_blind: 100, big_blind: 200, ante: 20 },
                BlindLevel { level: 4, small_blind: 150, big_blind: 300, ante: 30 },
                BlindLevel { level: 5, small_blind: 250, big_blind: 500, ante: 50 },
                BlindLevel { level: 6, small_blind: 400, big_blind: 800, ante: 80 },
                BlindLevel { level: 7, small_blind: 600, big_blind: 1200, ante: 120 },
                BlindLevel { level: 8, small_blind: 1000, big_blind: 2000, ante: 200 },
                BlindLevel { level: 9, small_blind: 1500, big_blind: 3000, ante: 300 },
                BlindLevel { level: 10, small_blind: 2500, big_blind: 5000, ante: 500 },
                BlindLevel { level: 11, small_blind: 4000, big_blind: 8000, ante: 800 },
                BlindLevel { level: 12, small_blind: 6000, big_blind: 12000, ante: 1200 },
            ],
            20000 => vec![
                BlindLevel { level: 1, small_blind: 100, big_blind: 200, ante: 0 },
                BlindLevel { level: 2, small_blind: 150, big_blind: 300, ante: 0 },
                BlindLevel { level: 3, small_blind: 200, big_blind: 400, ante: 40 },
                BlindLevel { level: 4, small_blind: 300, big_blind: 600, ante: 60 },
                BlindLevel { level: 5, small_blind: 500, big_blind: 1000, ante: 100 },
                BlindLevel { level: 6, small_blind: 800, big_blind: 1600, ante: 160 },
                BlindLevel { level: 7, small_blind: 1200, big_blind: 2400, ante: 240 },
                BlindLevel { level: 8, small_blind: 2000, big_blind: 4000, ante: 400 },
                BlindLevel { level: 9, small_blind: 3000, big_blind: 6000, ante: 600 },
                BlindLevel { level: 10, small_blind: 5000, big_blind: 10000, ante: 1000 },
                BlindLevel { level: 11, small_blind: 8000, big_blind: 16000, ante: 1600 },
                BlindLevel { level: 12, small_blind: 12000, big_blind: 24000, ante: 2400 },
            ],
            _ => {
                // Dynamic scaling for any stack: starting stack = 100 Big Blinds
                let base_bb = (starting_chips / 100).max(20);
                let multipliers = [
                    (1.0, 0.0),
                    (1.5, 0.0),
                    (2.5, 0.25),
                    (4.0, 0.4),
                    (6.0, 0.6),
                    (10.0, 1.0),
                    (16.0, 1.6),
                    (25.0, 2.5),
                    (40.0, 4.0),
                    (65.0, 6.5),
                    (100.0, 10.0),
                    (160.0, 16.0),
                ];
                multipliers
                    .iter()
                    .enumerate()
                    .map(|(idx, &(bb_mult, ante_mult))| {
                        let bb = ((base_bb as f64 * bb_mult).round() as u32).max(20);
                        let sb = (bb / 2).max(10);
                        let ante = if ante_mult > 0.0 {
                            ((base_bb as f64 * ante_mult).round() as u32).max(5)
                        } else {
                            0
                        };
                        BlindLevel {
                            level: (idx + 1) as u32,
                            small_blind: sb,
                            big_blind: bb,
                            ante,
                        }
                    })
                    .collect()
            }
        }
    }

    pub fn update_starting_chips(&mut self, chips: u32) {
        self.starting_chips = chips;
        self.levels = Self::generate_blind_levels(chips);
        self.current_level_index = 0;
    }

    pub fn current_blinds(&self) -> BlindLevel {
        self.levels[self.current_level_index].clone()
    }

    pub fn next_blinds(&self) -> Option<BlindLevel> {
        if self.current_level_index + 1 < self.levels.len() {
            Some(self.levels[self.current_level_index + 1].clone())
        } else {
            None
        }
    }

    /// Called at the end of every completed hand
    /// Returns true if the blind level advanced
    pub fn on_hand_completed(&mut self) -> bool {
        self.hands_played += 1;
        match self.escalation_rule {
            EscalationRule::Hands(interval) => {
                if interval > 0 && self.hands_played % interval == 0 {
                    if self.current_level_index + 1 < self.levels.len() {
                        self.current_level_index += 1;
                        return true;
                    } else if let Some(last) = self.levels.last().cloned() {
                        // Dynamically extend blinds beyond level 12 if tournament is still ongoing
                        let next_bb = ((last.big_blind as f64 * 1.5) / 50.0).round() as u32 * 50;
                        let next_sb = next_bb / 2;
                        let next_ante = (next_bb / 10).max(10);
                        self.levels.push(BlindLevel {
                            level: last.level + 1,
                            small_blind: next_sb,
                            big_blind: next_bb,
                            ante: next_ante,
                        });
                        self.current_level_index += 1;
                        return true;
                    }
                }
            }
            EscalationRule::Minutes(_) => {}
        }
        false
    }

    pub fn record_elimination(&mut self, player_name: String, seat: usize, rank: usize) {
        self.eliminations.push(EliminationRecord {
            player_name,
            seat,
            rank,
            eliminated_at_hand: self.hands_played,
        });
    }
}
