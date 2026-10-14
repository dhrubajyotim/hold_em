use super::card::{Card, Suit};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum HandRank {
    HighCard,
    OnePair,
    TwoPair,
    ThreeOfAKind,
    Straight,
    Flush,
    FullHouse,
    FourOfAKind,
    StraightFlush,
    RoyalFlush,
}

impl HandRank {
    pub fn description(&self) -> &'static str {
        match self {
            HandRank::HighCard => "High Card",
            HandRank::OnePair => "One Pair",
            HandRank::TwoPair => "Two Pair",
            HandRank::ThreeOfAKind => "Three of a Kind",
            HandRank::Straight => "Straight",
            HandRank::Flush => "Flush",
            HandRank::FullHouse => "Full House",
            HandRank::FourOfAKind => "Four of a Kind",
            HandRank::StraightFlush => "Straight Flush",
            HandRank::RoyalFlush => "Royal Flush",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct EvaluatedHand {
    pub rank: HandRank,
    pub score: Vec<u8>, // Lexicographically comparable: [HandRank as u8, kicker1, kicker2, ...]
    pub description: String,
    pub best_cards: Vec<Card>,
}

impl PartialOrd for EvaluatedHand {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for EvaluatedHand {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        self.score.cmp(&other.score)
    }
}

pub struct HandEvaluator;

impl HandEvaluator {
    /// Evaluates the best 5-card hand out of up to 7 cards (2 hole + up to 5 community)
    pub fn evaluate(cards: &[Card]) -> EvaluatedHand {
        assert!(cards.len() >= 5, "Need at least 5 cards to evaluate a hand");

        let mut best: Option<EvaluatedHand> = None;
        let combinations = combinations_5(cards);

        for five_cards in combinations {
            let eval = Self::evaluate_five(&five_cards);
            if best.as_ref().map_or(true, |b| eval > *b) {
                best = Some(eval);
            }
        }

        best.expect("Combinations should not be empty")
    }

    fn evaluate_five(cards: &[Card]) -> EvaluatedHand {
        assert_eq!(cards.len(), 5);
        let mut sorted = cards.to_vec();
        // Sort descending by rank
        sorted.sort_by(|a, b| b.rank.cmp(&a.rank));

        let is_flush = sorted.iter().all(|c| c.suit == sorted[0].suit);

        // Check straight
        let straight_high = Self::check_straight(&sorted);

        if is_flush && straight_high.is_some() {
            let high = straight_high.unwrap();
            if high == 14 {
                return EvaluatedHand {
                    rank: HandRank::RoyalFlush,
                    score: vec![HandRank::RoyalFlush as u8, 14],
                    description: "Royal Flush".to_string(),
                    best_cards: sorted,
                };
            } else {
                return EvaluatedHand {
                    rank: HandRank::StraightFlush,
                    score: vec![HandRank::StraightFlush as u8, high],
                    description: format!("Straight Flush, {} High", card_rank_name(high)),
                    best_cards: sorted,
                };
            }
        }

        // Count ranks
        let mut counts = [0u8; 15]; // rank 2..=14
        for c in &sorted {
            counts[c.rank as usize] += 1;
        }

        let mut pairs = Vec::new();
        let mut trips = Vec::new();
        let mut quads = Vec::new();
        let mut singles = Vec::new();

        for rank in (2..=14).rev() {
            match counts[rank as usize] {
                4 => quads.push(rank),
                3 => trips.push(rank),
                2 => pairs.push(rank),
                1 => singles.push(rank),
                _ => {}
            }
        }

        if !quads.is_empty() {
            let quad_rank = quads[0];
            let kicker = singles[0];
            return EvaluatedHand {
                rank: HandRank::FourOfAKind,
                score: vec![HandRank::FourOfAKind as u8, quad_rank, kicker],
                description: format!("Four of a Kind, {}s", card_rank_name(quad_rank)),
                best_cards: sorted,
            };
        }

        if !trips.is_empty() && !pairs.is_empty() {
            let trip_rank = trips[0];
            let pair_rank = pairs[0];
            return EvaluatedHand {
                rank: HandRank::FullHouse,
                score: vec![HandRank::FullHouse as u8, trip_rank, pair_rank],
                description: format!("Full House, {}s full of {}s", card_rank_name(trip_rank), card_rank_name(pair_rank)),
                best_cards: sorted,
            };
        }

        if is_flush {
            let mut score = vec![HandRank::Flush as u8];
            score.extend(sorted.iter().map(|c| c.rank));
            return EvaluatedHand {
                rank: HandRank::Flush,
                score,
                description: format!("Flush, {} High", card_rank_name(sorted[0].rank)),
                best_cards: sorted,
            };
        }

        if let Some(high) = straight_high {
            return EvaluatedHand {
                rank: HandRank::Straight,
                score: vec![HandRank::Straight as u8, high],
                description: format!("Straight, {} High", card_rank_name(high)),
                best_cards: sorted,
            };
        }

        if !trips.is_empty() {
            let trip_rank = trips[0];
            let mut score = vec![HandRank::ThreeOfAKind as u8, trip_rank];
            score.extend(&singles);
            let kicker_str = if !singles.is_empty() {
                format!(" + {} High", card_rank_name(singles[0]))
            } else {
                "".to_string()
            };
            return EvaluatedHand {
                rank: HandRank::ThreeOfAKind,
                score,
                description: format!("Three of a Kind, {}s{}", card_rank_name(trip_rank), kicker_str),
                best_cards: sorted,
            };
        }

        if pairs.len() == 2 {
            let high_pair = pairs[0];
            let low_pair = pairs[1];
            let kicker = singles[0];
            return EvaluatedHand {
                rank: HandRank::TwoPair,
                score: vec![HandRank::TwoPair as u8, high_pair, low_pair, kicker],
                description: format!("Two Pair, {}s & {}s + {} High", card_rank_name(high_pair), card_rank_name(low_pair), card_rank_name(kicker)),
                best_cards: sorted,
            };
        }

        if pairs.len() == 1 {
            let pair_rank = pairs[0];
            let mut score = vec![HandRank::OnePair as u8, pair_rank];
            score.extend(&singles);
            let kicker_str = if !singles.is_empty() {
                format!(" + {} High", card_rank_name(singles[0]))
            } else {
                "".to_string()
            };
            return EvaluatedHand {
                rank: HandRank::OnePair,
                score,
                description: format!("One Pair of {}s{}", card_rank_name(pair_rank), kicker_str),
                best_cards: sorted,
            };
        }

        let mut score = vec![HandRank::HighCard as u8];
        score.extend(sorted.iter().map(|c| c.rank));
        let kicker_str = if sorted.len() > 1 {
            format!(" + {} Kicker", card_rank_name(sorted[1].rank))
        } else {
            "".to_string()
        };
        EvaluatedHand {
            rank: HandRank::HighCard,
            score,
            description: format!("High Card, {}{}", card_rank_name(sorted[0].rank), kicker_str),
            best_cards: sorted,
        }
    }

    fn check_straight(cards: &[Card]) -> Option<u8> {
        let ranks: Vec<u8> = cards.iter().map(|c| c.rank).collect();
        // Regular straight check
        if ranks[0] == ranks[1] + 1
            && ranks[1] == ranks[2] + 1
            && ranks[2] == ranks[3] + 1
            && ranks[3] == ranks[4] + 1
        {
            return Some(ranks[0]);
        }
        // Wheel straight: A-5-4-3-2
        if ranks == vec![14, 5, 4, 3, 2] {
            return Some(5);
        }
        None
    }
}

fn card_rank_name(rank: u8) -> &'static str {
    match rank {
        2 => "2",
        3 => "3",
        4 => "4",
        5 => "5",
        6 => "6",
        7 => "7",
        8 => "8",
        9 => "9",
        10 => "10",
        11 => "Jack",
        12 => "Queen",
        13 => "King",
        14 => "Ace",
        _ => "?",
    }
}

fn combinations_5(cards: &[Card]) -> Vec<Vec<Card>> {
    let mut result = Vec::new();
    let n = cards.len();
    if n < 5 {
        return result;
    }
    for i in 0..n {
        for j in (i + 1)..n {
            for k in (j + 1)..n {
                for l in (k + 1)..n {
                    for m in (l + 1)..n {
                        result.push(vec![cards[i], cards[j], cards[k], cards[l], cards[m]]);
                    }
                }
            }
        }
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_royal_flush() {
        let cards = vec![
            Card::new(14, Suit::Hearts),
            Card::new(13, Suit::Hearts),
            Card::new(12, Suit::Hearts),
            Card::new(11, Suit::Hearts),
            Card::new(10, Suit::Hearts),
            Card::new(2, Suit::Clubs),
            Card::new(3, Suit::Diamonds),
        ];
        let eval = HandEvaluator::evaluate(&cards);
        assert_eq!(eval.rank, HandRank::RoyalFlush);
    }

    #[test]
    fn test_wheel_straight() {
        let cards = vec![
            Card::new(14, Suit::Hearts),
            Card::new(2, Suit::Clubs),
            Card::new(3, Suit::Diamonds),
            Card::new(4, Suit::Spades),
            Card::new(5, Suit::Hearts),
            Card::new(9, Suit::Clubs),
            Card::new(10, Suit::Diamonds),
        ];
        let eval = HandEvaluator::evaluate(&cards);
        assert_eq!(eval.rank, HandRank::Straight);
        assert_eq!(eval.score[1], 5);
    }

    #[test]
    fn test_full_house_vs_flush() {
        let fh_cards = vec![
            Card::new(10, Suit::Hearts),
            Card::new(10, Suit::Diamonds),
            Card::new(10, Suit::Clubs),
            Card::new(4, Suit::Spades),
            Card::new(4, Suit::Hearts),
        ];
        let flush_cards = vec![
            Card::new(14, Suit::Spades),
            Card::new(12, Suit::Spades),
            Card::new(9, Suit::Spades),
            Card::new(7, Suit::Spades),
            Card::new(3, Suit::Spades),
        ];
        let eval_fh = HandEvaluator::evaluate(&fh_cards);
        let eval_flush = HandEvaluator::evaluate(&flush_cards);
        assert!(eval_fh > eval_flush);
    }
}
