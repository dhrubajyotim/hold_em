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

    /// Calculate main pot and side pots based on total contributions and active players.
    /// Returns (pots, refunds) where refunds maps seat -> uncalled chips returned to them.
    /// `active_players` are players who have not folded.
    pub fn calculate_pots(&self, active_players: &[usize]) -> Vec<Pot> {
        let (pots, _) = self.calculate_pots_and_refunds(active_players);
        pots
    }

    /// Calculates pots and identifies any uncalled chips that must be refunded directly
    /// to the player who made the uncalled bet/raise.
    pub fn calculate_pots_and_refunds(&self, active_players: &[usize]) -> (Vec<Pot>, Vec<(usize, u32)>) {
        let mut pots = Vec::new();
        let mut refunds = Vec::new();

        // Get all unique non-zero contribution levels from all players
        let mut contrib_pairs: Vec<(usize, u32)> = self
            .total_contributions
            .iter()
            .enumerate()
            .filter(|(_, &c)| c > 0)
            .map(|(i, &c)| (i, c))
            .collect();

        if contrib_pairs.is_empty() {
            return (pots, refunds);
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
            let mut contributors = Vec::new();

            for seat in 0..self.num_seats {
                let contrib = self.total_contributions[seat];
                if contrib > processed_amount {
                    let pot_contrib = (contrib - processed_amount).min(incremental_bet);
                    pot_amount += pot_contrib;
                    contributors.push(seat);

                    // Player is eligible if they contributed up to this tier AND have not folded
                    if contrib >= level && active_players.contains(&seat) {
                        eligible.push(seat);
                    }
                }
            }

            if pot_amount > 0 {
                if eligible.len() == 1 {
                    let sole_eligible = eligible[0];
                    // If this active player is the only contributor at this tier,
                    // their incremental bet was completely uncalled and is refunded.
                    if contributors == vec![sole_eligible] {
                        refunds.push((sole_eligible, pot_amount));
                    } else {
                        // There are folded contributors who put money in this tier,
                        // so the sole eligible active player wins this contested tier.
                        pots.push(Pot {
                            amount: pot_amount,
                            eligible_players: eligible,
                        });
                    }
                } else if eligible.len() > 1 {
                    pots.push(Pot {
                        amount: pot_amount,
                        eligible_players: eligible,
                    });
                } else if eligible.is_empty() {
                    // Everyone who contributed to this tier folded (dead money).
                    // Award this dead money to the highest active pot previously formed.
                    if let Some(prev) = pots.last_mut() {
                        prev.amount += pot_amount;
                    }
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

        (merged_pots, refunds)
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

    #[test]
    fn test_uncalled_bet_refund() {
        let mut pm = PotManager::new(3);
        // Seat 0 all in for 100
        // Seat 1 raises to 500
        // Seat 2 folds (not active)
        pm.add_bet(0, 100);
        pm.add_bet(1, 500);

        let active = vec![0, 1];
        let (pots, refunds) = pm.calculate_pots_and_refunds(&active);

        // Only main pot of 200 (100 from seat 0 + 100 from seat 1)
        assert_eq!(pots.len(), 1);
        assert_eq!(pots[0].amount, 200);
        assert_eq!(pots[0].eligible_players, vec![0, 1]);

        // Seat 1 gets 400 uncalled refunded
        assert_eq!(refunds, vec![(1, 400)]);
    }

    #[test]
    fn test_dead_money_contested() {
        let mut pm = PotManager::new(3);
        // Seat 0 all in for 50
        // Seat 1 bets 200 and then folds
        // Seat 2 calls 200 and remains active
        pm.add_bet(0, 50);
        pm.add_bet(1, 200);
        pm.add_bet(2, 200);

        let active = vec![0, 2];
        let (pots, refunds) = pm.calculate_pots_and_refunds(&active);

        // Tier 50: 50*3 = 150 (eligible 0, 2)
        // Tier 200: (200-50)*2 = 300 (Seat 1 folded, Seat 2 active contributor -> contested by Seat 1's dead money -> eligible [2])
        assert_eq!(refunds.is_empty(), true);
        assert_eq!(pots.len(), 2);
        assert_eq!(pots[0].amount, 150);
        assert_eq!(pots[0].eligible_players, vec![0, 2]);
        assert_eq!(pots[1].amount, 300);
        assert_eq!(pots[1].eligible_players, vec![2]);
    }
}
