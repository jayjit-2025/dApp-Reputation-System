#![no_std]
use soroban_sdk::{contract, contractimpl, contracterror, contracttype, symbol_short, Address, Env, String};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    SelfEndorsementNotAllowed = 1,
    InvalidScoreRange = 2,
    AlreadyEndorsed = 3,
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
    pub score: u32,
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
        score: u32,
    ) -> Result<(), Error> {
        sender.require_auth();

        if sender == target {
            return Err(Error::SelfEndorsementNotAllowed);
        }

        if score == 0 || score > 1000 {
            return Err(Error::InvalidScoreRange);
        }

        let key = EndorsementKey { target: target.clone(), sender: sender.clone() };

        if env.storage().persistent().has(&key) {
            return Err(Error::AlreadyEndorsed);
        }

        let endorsement = Endorsement { category: category.clone(), score };
        env.storage().persistent().set(&key, &endorsement);

        env.events().publish((symbol_short!("endorse"), target, sender), category);

        Ok(())
    }

    pub fn get_endorsement(env: Env, target: Address, sender: Address) -> Option<Endorsement> {
        let key = EndorsementKey { target, sender };
        env.storage().persistent().get(&key)
    }
}

mod test;
