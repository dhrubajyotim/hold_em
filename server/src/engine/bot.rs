use super::card::Card;
use super::hand_eval::HandEvaluator;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum BotPersonality {
    Shark,         // Tight-Aggressive (TAG)
    Wildcard,      // Loose-Aggressive (LAG)
    Rock,          // Tight-Passive
    CallingStation,// Loose-Passive
    Mathematician, // Pot-Odds Driven
    Gambler,       // High Variance / Chaotic
}

impl BotPersonality {
    pub fn name(&self) -> &'static str {
        match self {
            BotPersonality::Shark => "The Shark",
            BotPersonality::Wildcard => "Wildcard",
            BotPersonality::Rock => "The Rock",
            BotPersonality::CallingStation => "Calling Station",
            BotPersonality::Mathematician => "The Prof",
            BotPersonality::Gambler => "The Gambler",
        }
    }
}

pub struct BotBrain;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum ActionDecision {
    Fold,
    Check,
    Call(u32),
    Raise(u32),
}

impl BotBrain {
    pub fn decide_action(
        personality: BotPersonality,
        hole_cards: &[Card],
        community_cards: &[Card],
        call_amount: u32,
        min_raise: u32,
        current_chips: u32,
        pot_size: u32,
    ) -> ActionDecision {
        use rand::Rng;
        let mut rng = rand::thread_rng();

        // 1. Hole card strength estimate
        let hole_strength = Self::preflop_strength(hole_cards);

        // 2. If community cards exist, evaluate current made hand
        let postflop_rank = if community_cards.len() >= 3 {
            let mut all = hole_cards.to_vec();
            all.extend_from_slice(community_cards);
            let eval = HandEvaluator::evaluate(&all);
            eval.rank as u8
        } else {
            0
        };

        // Combine preflop + postflop assessment
        let strength = if community_cards.is_empty() {
            hole_strength
        } else {
            (postflop_rank as f32 / 9.0).max(hole_strength * 0.4)
        };

        let can_check = call_amount == 0;

        match personality {
            BotPersonality::Rock => {
                if strength > 0.75 {
                    if can_check && rng.gen_bool(0.6) {
                        ActionDecision::Check
                    } else if current_chips >= min_raise && rng.gen_bool(0.7) {
                        ActionDecision::Raise(min_raise)
                    } else if current_chips >= call_amount {
                        ActionDecision::Call(call_amount)
                    } else {
                        ActionDecision::Call(current_chips)
                    }
                } else if can_check {
                    ActionDecision::Check
                } else if call_amount < current_chips / 10 && strength > 0.5 {
                    ActionDecision::Call(call_amount)
                } else {
                    ActionDecision::Fold
                }
            }

            BotPersonality::Shark => {
                if strength > 0.65 {
                    let raise_size = (min_raise + (pot_size / 2)).min(current_chips);
                    if current_chips >= min_raise && rng.gen_bool(0.75) {
                        ActionDecision::Raise(raise_size)
                    } else {
                        ActionDecision::Call(call_amount.min(current_chips))
                    }
                } else if strength > 0.4 || (can_check) {
                    if can_check {
                        ActionDecision::Check
                    } else if call_amount <= pot_size / 3 {
                        ActionDecision::Call(call_amount.min(current_chips))
                    } else {
                        ActionDecision::Fold
                    }
                } else {
                    if can_check {
                        ActionDecision::Check
                    } else {
                        ActionDecision::Fold
                    }
                }
            }

            BotPersonality::Wildcard => {
                // Frequent bluffs
                let bluff = rng.gen_bool(0.3);
                if strength > 0.5 || bluff {
                    let raise_size = (min_raise + (pot_size * 2 / 3)).min(current_chips);
                    if current_chips >= min_raise && rng.gen_bool(0.65) {
                        ActionDecision::Raise(raise_size)
                    } else if can_check && !bluff {
                        ActionDecision::Check
                    } else {
                        ActionDecision::Call(call_amount.min(current_chips))
                    }
                } else if can_check {
                    ActionDecision::Check
                } else if call_amount < current_chips / 5 {
                    ActionDecision::Call(call_amount.min(current_chips))
                } else {
                    ActionDecision::Fold
                }
            }

            BotPersonality::CallingStation => {
                // Rarely folds, rarely raises
                if can_check {
                    ActionDecision::Check
                } else if call_amount <= current_chips {
                    ActionDecision::Call(call_amount)
                } else {
                    ActionDecision::Call(current_chips) // all in call
                }
            }

            BotPersonality::Mathematician => {
                let pot_odds = if pot_size + call_amount > 0 {
                    call_amount as f32 / (pot_size + call_amount) as f32
                } else {
                    0.0
                };

                if can_check {
                    if strength > 0.7 && current_chips >= min_raise {
                        ActionDecision::Raise(min_raise)
                    } else {
                        ActionDecision::Check
                    }
                } else if strength > pot_odds {
                    if strength > 0.8 && current_chips >= min_raise {
                        ActionDecision::Raise(min_raise + pot_size / 2)
                    } else {
                        ActionDecision::Call(call_amount.min(current_chips))
                    }
                } else {
                    ActionDecision::Fold
                }
            }

            BotPersonality::Gambler => {
                if rng.gen_bool(0.15) && current_chips > 0 {
                    // All in splash
                    ActionDecision::Raise(current_chips)
                } else if strength > 0.35 || rng.gen_bool(0.5) {
                    if can_check && rng.gen_bool(0.5) {
                        ActionDecision::Check
                    } else if current_chips >= min_raise && rng.gen_bool(0.5) {
                        ActionDecision::Raise((min_raise * 2).min(current_chips))
                    } else {
                        ActionDecision::Call(call_amount.min(current_chips))
                    }
                } else if can_check {
                    ActionDecision::Check
                } else {
                    ActionDecision::Fold
                }
            }
        }
    }

    fn preflop_strength(hole_cards: &[Card]) -> f32 {
        if hole_cards.len() < 2 {
            return 0.2;
        }
        let c1 = &hole_cards[0];
        let c2 = &hole_cards[1];
        let high = c1.rank.max(c2.rank);
        let low = c1.rank.min(c2.rank);
        let is_pair = high == low;
        let is_suited = c1.suit == c2.suit;

        let mut score = (high as f32 * 2.0 + low as f32) / 42.0;
        if is_pair {
            score += 0.35;
        }
        if is_suited {
            score += 0.1;
        }
        score.min(1.0)
    }
}
