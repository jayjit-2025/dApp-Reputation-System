#![no_std]
use soroban_sdk::{contract, contractimpl, contracterror, contracttype, symbol_short, Address, Env, Map, String, Vec};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    SelfEndorsementNotAllowed = 1,
    AlreadyEndorsed = 2,
    EndorsementNotFound = 3,
    AlreadyRevoked = 4,
    ReviewTooLong = 5,
    AlreadyInitialized = 6,
    Unauthorized = 7,
    ContractPaused = 8,
    InvalidCategory = 9,
    InvalidConfig = 10,
}

pub fn is_valid_review_length(review: &String) -> bool {
    review.len() <= 200 && review.len() > 0
}

pub fn is_valid_category(cat: &String) -> bool {
    cat.len() > 0 && cat.len() <= 50
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

// Configurable decay parameters — admin can tune without redeployment
#[contracttype]
#[derive(Clone)]
pub struct Config {
    pub grace_period_days: u32,   // days before decay starts (default 30)
    pub decay_rate_pct: u32,      // % decay per period (default 10)
    pub decay_period_days: u32,   // days per decay period (default 7)
    pub floor_pct: u32,           // minimum % of weight retained (default 20)
    pub base_points: u32,         // base endorsement points (default 10)
}

impl Config {
    fn default() -> Self {
        Config {
            grace_period_days: 30,
            decay_rate_pct: 10,
            decay_period_days: 7,
            floor_pct: 20,
            base_points: 10,
        }
    }
}

// Data key for contract state
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    EndorsementCount(Address),
    Endorsers(Address),
    CategoryScores(Address),
    Admin,
    Paused,
    Initialized,
    Config,
}

#[contract]
pub struct ReputationContract;

#[contractimpl]
impl ReputationContract {
    // ─── Constructor & Initialization ────────────────────────────────────

    pub fn __constructor(env: Env, admin: Address) {
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Paused, &false);
        env.storage().instance().set(&DataKey::Initialized, &true);
        env.storage().instance().set(&DataKey::Config, &Config::default());
    }

    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        let initialized: bool = env.storage().instance().get(&DataKey::Initialized).unwrap_or(false);
        if initialized {
            return Err(Error::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Paused, &false);
        env.storage().instance().set(&DataKey::Initialized, &true);
        env.storage().instance().set(&DataKey::Config, &Config::default());
        Ok(())
    }

    // ─── Admin Functions ─────────────────────────────────────────────────

    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap_or_else(|| {
            panic!("contract not initialized")
        })
    }

    pub fn set_admin(env: Env, new_admin: Address) -> Result<(), Error> {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap_or_else(|| {
            panic!("contract not initialized")
        });
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &new_admin);
        Ok(())
    }

    // ─── Pause Mechanism ─────────────────────────────────────────────────

    pub fn pause(env: Env) -> Result<(), Error> {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap_or_else(|| {
            panic!("contract not initialized")
        });
        admin.require_auth();
        env.storage().instance().set(&DataKey::Paused, &true);
        Ok(())
    }

    pub fn unpause(env: Env) -> Result<(), Error> {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap_or_else(|| {
            panic!("contract not initialized")
        });
        admin.require_auth();
        env.storage().instance().set(&DataKey::Paused, &false);
        Ok(())
    }

    pub fn is_paused(env: Env) -> bool {
        env.storage().instance().get(&DataKey::Paused).unwrap_or(false)
    }

    fn require_not_paused(env: &Env) {
        let paused: bool = env.storage().instance().get(&DataKey::Paused).unwrap_or(false);
        if paused {
            panic!("contract is paused");
        }
    }

    // ─── Configurable Parameters ─────────────────────────────────────────

    pub fn set_config(
        env: Env,
        grace_period_days: u32,
        decay_rate_pct: u32,
        decay_period_days: u32,
        floor_pct: u32,
        base_points: u32,
    ) -> Result<(), Error> {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap_or_else(|| {
            panic!("contract not initialized")
        });
        admin.require_auth();

        if grace_period_days == 0 || decay_rate_pct == 0 || decay_rate_pct >= 100
            || decay_period_days == 0 || floor_pct >= 100 || base_points == 0
        {
            return Err(Error::InvalidConfig);
        }

        let config = Config {
            grace_period_days,
            decay_rate_pct,
            decay_period_days,
            floor_pct,
            base_points,
        };
        env.storage().instance().set(&DataKey::Config, &config);
        Ok(())
    }

    pub fn get_config(env: Env) -> Config {
        env.storage().instance().get(&DataKey::Config).unwrap_or(Config::default())
    }

    // ─── Category Score Queries ──────────────────────────────────────────

    pub fn get_category_score(env: Env, target: Address, category: String) -> u32 {
        let cat_scores_key = DataKey::CategoryScores(target);
        let cat_scores: Map<String, u32> = env.storage().persistent().get(&cat_scores_key).unwrap_or(Map::new(&env));
        cat_scores.get(category).unwrap_or(0)
    }

    pub fn get_category_breakdown(env: Env, target: Address) -> Map<String, u32> {
        let cat_scores_key = DataKey::CategoryScores(target);
        env.storage().persistent().get(&cat_scores_key).unwrap_or(Map::new(&env))
    }

    // ─── Core Endorsement Logic ──────────────────────────────────────────

    pub fn endorse(
        env: Env,
        sender: Address,
        target: Address,
        category: String,
        review: String,
    ) -> Result<(), Error> {
        sender.require_auth();

        Self::require_not_paused(&env);

        if !is_valid_category(&category) {
            return Err(Error::InvalidCategory);
        }

        if !is_valid_review_length(&review) {
            return Err(Error::ReviewTooLong);
        }

        if sender == target {
            return Err(Error::SelfEndorsementNotAllowed);
        }

        let key = EndorsementKey { target: target.clone(), sender: sender.clone() };

        // Allow re-endorsement after revocation: if the key exists but is inactive, overwrite it.
        // If it exists and is active, it's a duplicate.
        let existing: Option<Endorsement> = env.storage().persistent().get(&key);
        if let Some(ref prev) = existing {
            if prev.active {
                return Err(Error::AlreadyEndorsed);
            }
            // Previous endorsement was revoked — rebuild endorsers list without the sender.
            let endorsers_key = DataKey::Endorsers(target.clone());
            let endorsers: Vec<Address> = env.storage().persistent().get(&endorsers_key).unwrap_or(Vec::new(&env));
            let mut filtered: Vec<Address> = Vec::new(&env);
            for endorser in endorsers.iter() {
                if endorser != sender {
                    filtered.push_back(endorser);
                }
            }
            env.storage().persistent().set(&endorsers_key, &filtered);
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

        let config: Config = env.storage().instance().get(&DataKey::Config).unwrap_or(Config::default());
        let points_added = (config.base_points * multiplier) / 100;

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

        // Update category-specific score for target
        let cat_scores_key = DataKey::CategoryScores(target.clone());
        let mut cat_scores: Map<String, u32> = env.storage().persistent().get(&cat_scores_key).unwrap_or(Map::new(&env));
        let cat_score = cat_scores.get(category.clone()).unwrap_or(0);
        cat_scores.set(category.clone(), cat_score + points_added);
        env.storage().persistent().set(&cat_scores_key, &cat_scores);

        // Publish event with both category and points_added
        env.events().publish((symbol_short!("endorse"), target, sender), (category, points_added));

        Ok(())
    }

    fn calculate_decayed_weight(env: &Env, endorsement: &Endorsement) -> u32 {
        if !endorsement.active {
            return 0;
        }
        let config: Config = env.storage().instance().get(&DataKey::Config).unwrap_or(Config::default());
        let current_time = env.ledger().timestamp();
        if current_time <= endorsement.timestamp {
            return endorsement.weight_applied;
        }
        let elapsed = current_time - endorsement.timestamp;
        let grace_secs = config.grace_period_days as u64 * 24 * 60 * 60;
        if elapsed < grace_secs {
            return endorsement.weight_applied;
        }
        let overtime = elapsed - grace_secs;
        let period_secs = config.decay_period_days as u64 * 24 * 60 * 60;
        let periods = overtime / period_secs;
        let decay_pct = periods * config.decay_rate_pct as u64;
        if decay_pct >= (100 - config.floor_pct as u64) {
            (endorsement.weight_applied * config.floor_pct) / 100
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

        Self::require_not_paused(&env);

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

        // Deduct from category-specific score
        let cat_scores_key = DataKey::CategoryScores(target.clone());
        let mut cat_scores: Map<String, u32> = env.storage().persistent().get(&cat_scores_key).unwrap_or(Map::new(&env));
        let cat_score = cat_scores.get(endorsement.category.clone()).unwrap_or(0);
        let new_cat_score = cat_score.saturating_sub(endorsement.weight_applied);
        cat_scores.set(endorsement.category.clone(), new_cat_score);
        env.storage().persistent().set(&cat_scores_key, &cat_scores);

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

        Self::require_not_paused(&env);

        if !is_valid_category(&new_category) {
            return Err(Error::InvalidCategory);
        }

        if !is_valid_review_length(&new_review) {
            return Err(Error::ReviewTooLong);
        }

        let key = EndorsementKey { target: target.clone(), sender: sender.clone() };
        let mut endorsement: Endorsement = match env.storage().persistent().get(&key) {
            Some(e) => e,
            None => return Err(Error::EndorsementNotFound),
        };

        if !endorsement.active {
            return Err(Error::AlreadyRevoked);
        }

        let old_category = endorsement.category.clone();
        endorsement.category = new_category.clone();
        endorsement.review = new_review;
        env.storage().persistent().set(&key, &endorsement);

        // If category changed, adjust category scores: deduct from old, add to new
        if old_category != new_category {
            let cat_scores_key = DataKey::CategoryScores(target.clone());
            let mut cat_scores: Map<String, u32> = env.storage().persistent().get(&cat_scores_key).unwrap_or(Map::new(&env));

            let old_cat_score = cat_scores.get(old_category.clone()).unwrap_or(0);
            cat_scores.set(old_category, old_cat_score.saturating_sub(endorsement.weight_applied));

            let new_cat_score = cat_scores.get(new_category.clone()).unwrap_or(0);
            cat_scores.set(new_category.clone(), new_cat_score + endorsement.weight_applied);

            env.storage().persistent().set(&cat_scores_key, &cat_scores);
        }

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
