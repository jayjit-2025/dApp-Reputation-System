#![no_std]
use soroban_sdk::{contract, contractimpl, contracterror, contracttype, symbol_short, Address, Env, String};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    SelfEndorsementNotAllowed = 1,
    AlreadyEndorsed = 2,
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
}

// Data key for tracking a user's total score
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    TotalScore(Address),
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
    ) -> Result<(), Error> {
        sender.require_auth();

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
        let endorsement = Endorsement { category: category.clone(), weight_applied: points_added, timestamp };
        env.storage().persistent().set(&key, &endorsement);

        // Publish event with both category and points_added
        env.events().publish((symbol_short!("endorse"), target, sender), (category, points_added));

        Ok(())
    }

    pub fn get_endorsement(env: Env, target: Address, sender: Address) -> Option<Endorsement> {
        let key = EndorsementKey { target, sender };
        env.storage().persistent().get(&key)
    }

    pub fn get_score(env: Env, target: Address) -> u32 {
        let key = DataKey::TotalScore(target);
        env.storage().persistent().get(&key).unwrap_or(0)
    }
}

mod test;
