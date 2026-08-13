#![no_std]
use soroban_sdk::{contract, contractimpl, contracterror, contracttype, symbol_short, Address, Env, String, Vec};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    SelfEndorsementNotAllowed = 1,
    AlreadyEndorsed = 2,
    EndorsementNotFound = 3,
    AlreadyRevoked = 4,
    ReviewTooLong = 5,
}

pub fn is_valid_review_length(review: &String) -> bool {
    review.len() <= 200
}

#[contracttype]
#[derive(Clone)]
pub struct EndorsementKey {
    pub target: Address,
    pub sender: Address,
}

#[contracttype]
#[derive(Clone)]
pub struct Endorsement {
    pub category: String,
    pub weight_applied: u32,
    pub timestamp: u64,
    pub review: String,
    pub active: bool,
}

// Data key for tracking a user's total score
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    TotalScore(Address),
    EndorsementCount(Address),
    Endorsers(Address),
}

#[contract]
pub struct ReputationContract;

#[contractimpl]
impl ReputationContract {
    pub fn endorse(
        env: Env,
        sender: Address,
        target: Address,
        category: String,
        review: String,
    ) -> Result<(), Error> {
        sender.require_auth();

        if !is_valid_review_length(&review) {
            return Err(Error::ReviewTooLong);
        }

        if sender == target {
            return Err(Error::SelfEndorsementNotAllowed);
        }

        let key = EndorsementKey { target: target.clone(), sender: sender.clone() };

        if env.storage().persistent().has(&key) {
            return Err(Error::AlreadyEndorsed);
        }

        // Fetch sender's current score
        let sender_score = Self::get_score(env.clone(), sender.clone());

        // Calculate multiplier scaled by 100
        let multiplier: u32 = match sender_score {
            0..=200 => 10,     // 0.1x
            201..=400 => 30,   // 0.3x
            401..=600 => 60,   // 0.6x
            601..=800 => 100,  // 1.0x
            801..=950 => 150,  // 1.5x
            _ => 200,          // 2.0x
        };

        let base_points: u32 = 10;
        let points_added = (base_points * multiplier) / 100;

        // Update target's total score
        let target_score_key = DataKey::TotalScore(target.clone());
        let mut current_target_score: u32 = env.storage().persistent().get(&target_score_key).unwrap_or(0);
        current_target_score += points_added;
        env.storage().persistent().set(&target_score_key, &current_target_score);

        let timestamp = env.ledger().timestamp();
        let endorsement = Endorsement {
            category: category.clone(),
            weight_applied: points_added,
            timestamp,
            review: review.clone(),
            active: true,
        };
        env.storage().persistent().set(&key, &endorsement);

        // Increment endorsement count for target
        let count_key = DataKey::EndorsementCount(target.clone());
        let mut count: u32 = env.storage().persistent().get(&count_key).unwrap_or(0);
        count += 1;
        env.storage().persistent().set(&count_key, &count);

        // Add sender to endorsers list
        let endorsers_key = DataKey::Endorsers(target.clone());
        let mut endorsers: Vec<Address> = env.storage().persistent().get(&endorsers_key).unwrap_or(Vec::new(&env));
        endorsers.push_back(sender.clone());
        env.storage().persistent().set(&endorsers_key, &endorsers);

        // Publish event with both category and points_added
        env.events().publish((symbol_short!("endorse"), target, sender), (category, points_added));

        Ok(())
    }

    fn calculate_decayed_weight(env: &Env, endorsement: &Endorsement) -> u32 {
        if !endorsement.active {
            return 0;
        }
        let current_time = env.ledger().timestamp();
        if current_time <= endorsement.timestamp {
            return endorsement.weight_applied;
        }
        let elapsed = current_time - endorsement.timestamp;
        let thirty_days: u64 = 30 * 24 * 60 * 60; // 2,592,000 seconds
        if elapsed < thirty_days {
            return endorsement.weight_applied;
        }
        let overtime = elapsed - thirty_days;
        let seven_days: u64 = 7 * 24 * 60 * 60;
        let periods = overtime / seven_days; // Number of weeks decayed
        let decay_pct = periods * 10; // 10% per week
        if decay_pct >= 80 {
            // Minimum 20% remaining
            (endorsement.weight_applied * 20) / 100
        } else {
            (endorsement.weight_applied * (100 - decay_pct as u32)) / 100
        }
    }

    pub fn revoke_endorsement(
        env: Env,
        sender: Address,
        target: Address,
    ) -> Result<(), Error> {
        sender.require_auth();

        let key = EndorsementKey { target: target.clone(), sender: sender.clone() };
        let mut endorsement: Endorsement = match env.storage().persistent().get(&key) {
            Some(e) => e,
            None => return Err(Error::EndorsementNotFound),
        };

        if !endorsement.active {
            return Err(Error::AlreadyRevoked);
        }

        endorsement.active = false;
        env.storage().persistent().set(&key, &endorsement);

        // Deduct points from target's total score
        let target_score_key = DataKey::TotalScore(target.clone());
        let mut current_target_score: u32 = env.storage().persistent().get(&target_score_key).unwrap_or(0);
        if current_target_score >= endorsement.weight_applied {
            current_target_score -= endorsement.weight_applied;
        } else {
            current_target_score = 0;
        }
        env.storage().persistent().set(&target_score_key, &current_target_score);

        // Publish event
        env.events().publish((symbol_short!("revoke"), target, sender), endorsement.weight_applied);

        Ok(())
    }

    pub fn update_endorsement(
        env: Env,
        sender: Address,
        target: Address,
        new_category: String,
        new_review: String,
    ) -> Result<(), Error> {
        sender.require_auth();

        let key = EndorsementKey { target: target.clone(), sender: sender.clone() };
        let mut endorsement: Endorsement = match env.storage().persistent().get(&key) {
            Some(e) => e,
            None => return Err(Error::EndorsementNotFound),
        };

        if !endorsement.active {
            return Err(Error::AlreadyRevoked);
        }

        endorsement.category = new_category.clone();
        endorsement.review = new_review;
        env.storage().persistent().set(&key, &endorsement);

        // Publish event
        env.events().publish((symbol_short!("update"), target, sender), new_category);

        Ok(())
    }

    pub fn get_endorsement(env: Env, target: Address, sender: Address) -> Option<Endorsement> {
        let key = EndorsementKey { target, sender };
        env.storage().persistent().get(&key)
    }

    pub fn get_score(env: Env, target: Address) -> u32 {
        let endorsers_key = DataKey::Endorsers(target.clone());
        let endorsers: Vec<Address> = env.storage().persistent().get(&endorsers_key).unwrap_or(Vec::new(&env));
        let mut total_score: u32 = 0;
        for endorser in endorsers {
            let key = EndorsementKey { target: target.clone(), sender: endorser };
            if let Some(endorsement) = env.storage().persistent().get::<_, Endorsement>(&key) {
                total_score += Self::calculate_decayed_weight(&env, &endorsement);
            }
        }
        total_score
    }

    pub fn get_endorsement_count(env: Env, target: Address) -> u32 {
        let key = DataKey::EndorsementCount(target);
        env.storage().persistent().get(&key).unwrap_or(0)
    }
}

mod test;
