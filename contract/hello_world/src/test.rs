#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

#[test]
fn test_successful_endorsement() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, ReputationContract);
    let client = ReputationContractClient::new(&env, &contract_id);

    let sender = Address::generate(&env);
    let target = Address::generate(&env);
    let category = String::from_str(&env, "Top-tier Validator");

    client.endorse(&sender, &target, &category, &800);

    let endorsement = client.get_endorsement(&target, &sender).unwrap();
    assert_eq!(endorsement.category, category);
    assert_eq!(endorsement.score, 800);
}

#[test]
#[should_panic(expected = "HostError: Error(Contract, #1)")]
fn test_self_endorsement_not_allowed() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, ReputationContract);
    let client = ReputationContractClient::new(&env, &contract_id);

    let sender = Address::generate(&env);
    let category = String::from_str(&env, "Community Contribution");

    client.endorse(&sender, &sender, &category, &500);
}

#[test]
#[should_panic(expected = "HostError: Error(Contract, #2)")]
fn test_invalid_score_range() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, ReputationContract);
    let client = ReputationContractClient::new(&env, &contract_id);

    let sender = Address::generate(&env);
    let target = Address::generate(&env);
    let category = String::from_str(&env, "Development Excellence");

    client.endorse(&sender, &target, &category, &1500);
}

#[test]
#[should_panic(expected = "HostError: Error(Contract, #3)")]
fn test_already_endorsed() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, ReputationContract);
    let client = ReputationContractClient::new(&env, &contract_id);

    let sender = Address::generate(&env);
    let target = Address::generate(&env);
    let category = String::from_str(&env, "Liquidity Provider");

    client.endorse(&sender, &target, &category, &700);
    client.endorse(&sender, &target, &category, &800);
}
