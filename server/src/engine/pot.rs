use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Pot {
    pub amount: u32,
    pub eligible_players: Vec<usize>, // Player seat indices
}

#[derive(Debug, Clone)]
pub struct PotManager {
    // Total contribution of each seat throughout the entire hand
    pub total_contributions: Vec<u32>,
    // Current round contribution of each seat
    pub round_contributions: Vec<u32>,
    // Number of seats
    num_seats: usize,
}

impl PotManager {
    pub fn new(num_seats: usize) -> Self {
        Self {
            total_contributions: vec![0; num_seats],
            round_contributions: vec![0; num_seats],
            num_seats,
        }
    }

    pub fn reset_hand(&mut self) {
        self.total_contributions.fill(0);
        self.round_contributions.fill(0);
    }

    pub fn start_new_round(&mut self) {
        self.round_contributions.fill(0);
    }

    pub fn add_bet(&mut self, seat: usize, amount: u32) {
        if seat < self.num_seats {
            self.total_contributions[seat] += amount;
            self.round_contributions[seat] += amount;
        }
    }

    pub fn total_pot(&self) -> u32 {
        self.total_contributions.iter().sum()
    }

    /// Calculate main pot and side pots based on total contributions and active players
    /// `active_players` are players who have not folded.
    pub fn calculate_pots(&self, active_players: &[usize]) -> Vec<Pot> {
        let mut pots = Vec::new();

        // Get all unique non-zero contribution levels from all players
        let mut contrib_pairs: Vec<(usize, u32)> = self
            .total_contributions
            .iter()
            .enumerate()
            .filter(|(_, &c)| c > 0)
            .map(|(i, &c)| (i, c))
            .collect();

        if contrib_pairs.is_empty() {
            return pots;
        }

        // Sort by contribution amount
        contrib_pairs.sort_by_key(|&(_, c)| c);

        let mut processed_amount = 0u32;

        // Iterate through unique contribution levels
        let unique_levels: Vec<u32> = {
            let mut levels: Vec<u32> = contrib_pairs.iter().map(|&(_, c)| c).collect();
            levels.dedup();
            levels
        };

        for level in unique_levels {
            let incremental_bet = level - processed_amount;
            if incremental_bet == 0 {
                continue;
            }

            let mut pot_amount = 0u32;
            let mut eligible = Vec::new();

            for seat in 0..self.num_seats {
                let contrib = self.total_contributions[seat];
                if contrib > processed_amount {
                    let pot_contrib = (contrib - processed_amount).min(incremental_bet);
                    pot_amount += pot_contrib;

                    // Player is eligible if they contributed up to this tier AND have not folded
                    if contrib >= level && active_players.contains(&seat) {
                        eligible.push(seat);
                    }
                }
            }

            if pot_amount > 0 && !eligible.is_empty() {
                pots.push(Pot {
                    amount: pot_amount,
                    eligible_players: eligible,
                });
            } else if pot_amount > 0 && eligible.is_empty() {
                // If everyone who contributed to this portion folded except possibly someone earlier,
                // roll this into the previous pot if exists
                if let Some(prev) = pots.last_mut() {
                    prev.amount += pot_amount;
                }
            }

            processed_amount = level;
        }

        // Merge contiguous pots that have the exact same eligible players
        let mut merged_pots: Vec<Pot> = Vec::new();
        for pot in pots {
            if let Some(last) = merged_pots.last_mut() {
                if last.eligible_players == pot.eligible_players {
                    last.amount += pot.amount;
                    continue;
                }
            }
            merged_pots.push(pot);
        }

        merged_pots
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_side_pot_calculation() {
        let mut pm = PotManager::new(3);
        // Seat 0 goes all in for 100
        // Seat 1 calls 300
        // Seat 2 calls 300
        pm.add_bet(0, 100);
        pm.add_bet(1, 300);
        pm.add_bet(2, 300);

        let active = vec![0, 1, 2];
        let pots = pm.calculate_pots(&active);

        // Main pot: 100*3 = 300 eligible for 0, 1, 2
        // Side pot: (300-100)*2 = 400 eligible for 1, 2
        assert_eq!(pots.len(), 2);
        assert_eq!(pots[0].amount, 300);
        assert_eq!(pots[0].eligible_players, vec![0, 1, 2]);

        assert_eq!(pots[1].amount, 400);
        assert_eq!(pots[1].eligible_players, vec![1, 2]);
    }
}
