#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

#[test]
fn test_successful_endorsement() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(ReputationContract, ());
    let client = ReputationContractClient::new(&env, &contract_id);

    let sender = Address::generate(&env);
    let target = Address::generate(&env);
    let category = String::from_str(&env, "Development Excellence");

    // Fresh sender has score 0 → multiplier 0.1x → 1 point added
    client.endorse(&sender, &target, &category);

    // Endorsement record must exist
    let endorsement = client.get_endorsement(&target, &sender).unwrap();
    assert_eq!(endorsement.weight_applied, 1);

    // Target score must be 1
    let score = client.get_score(&target);
    assert_eq!(score, 1);

    // Endorsement count must be 1
    let count = client.get_endorsement_count(&target);
    assert_eq!(count, 1);
}

#[test]
fn test_successful_endorsement_and_multiplier() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(ReputationContract, ());
    let client = ReputationContractClient::new(&env, &contract_id);

    let user_a = Address::generate(&env);
    let user_b = Address::generate(&env);
    let user_c = Address::generate(&env);

    // User A has 0 score. Multiplier should be 0.1x → 1 point
    let category = String::from_str(&env, "Test");
    client.endorse(&user_a, &user_b, &category);

    let endorsement1 = client.get_endorsement(&user_b, &user_a).unwrap();
    assert_eq!(endorsement1.weight_applied, 1);

    let score_b = client.get_score(&user_b);
    assert_eq!(score_b, 1); // User B gets 1 point

    // User B has 1 point. Multiplier is still 0.1x → 1 point added to C
    client.endorse(&user_b, &user_c, &category);
    assert_eq!(client.get_score(&user_c), 1);
}

#[test]
fn test_score_accumulates_across_multiple_endorsers() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(ReputationContract, ());
    let client = ReputationContractClient::new(&env, &contract_id);

    let target = Address::generate(&env);
    let category = String::from_str(&env, "Community Contribution");

    // Three independent senders each with score 0 endorse the same target
    for _ in 0..3 {
        let sender = Address::generate(&env);
        client.endorse(&sender, &target, &category);
    }

    // Each sender adds 1 point (0.1x multiplier on score 0), total = 3
    assert_eq!(client.get_score(&target), 3);
    assert_eq!(client.get_endorsement_count(&target), 3);
}

#[test]
#[should_panic(expected = "HostError: Error(Contract, #1)")]
fn test_self_endorsement_not_allowed() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(ReputationContract, ());
    let client = ReputationContractClient::new(&env, &contract_id);

    let sender = Address::generate(&env);
    let category = String::from_str(&env, "Community Contribution");

    client.endorse(&sender, &sender, &category);
}

#[test]
#[should_panic(expected = "HostError: Error(Contract, #2)")]
fn test_already_endorsed() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(ReputationContract, ());
    let client = ReputationContractClient::new(&env, &contract_id);

    let sender = Address::generate(&env);
    let target = Address::generate(&env);
    let category = String::from_str(&env, "Liquidity Provider");

    // First endorsement succeeds
    client.endorse(&sender, &target, &category);
    // Second endorsement from the same sender must panic with AlreadyEndorsed (#2)
    client.endorse(&sender, &target, &category);
}
