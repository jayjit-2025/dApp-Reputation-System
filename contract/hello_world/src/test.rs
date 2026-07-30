#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, testutils::Ledger, testutils::LedgerInfo, Address, Env, String};

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
    let review = String::from_str(&env, "Great work!");
    client.endorse(&sender, &target, &category, &review);

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
    let review = String::from_str(&env, "Good");
    client.endorse(&user_a, &user_b, &category, &review);

    let endorsement1 = client.get_endorsement(&user_b, &user_a).unwrap();
    assert_eq!(endorsement1.weight_applied, 1);

    let score_b = client.get_score(&user_b);
    assert_eq!(score_b, 1); // User B gets 1 point

    // User B has 1 point. Multiplier is still 0.1x → 1 point added to C
    client.endorse(&user_b, &user_c, &category, &review);
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
        let review = String::from_str(&env, "Great work!");
    client.endorse(&sender, &target, &category, &review);
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

    let review = String::from_str(&env, "Self");
    client.endorse(&sender, &sender, &category, &review);
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
    let review = String::from_str(&env, "Great work!");
    client.endorse(&sender, &target, &category, &review);
    // Second endorsement from the same sender must panic with AlreadyEndorsed (#2)
    let review = String::from_str(&env, "Great work!");
    client.endorse(&sender, &target, &category, &review);
}

#[test]
fn test_custom_review_storage() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(ReputationContract, ());
    let client = ReputationContractClient::new(&env, &contract_id);

    let sender = Address::generate(&env);
    let target = Address::generate(&env);
    let category = String::from_str(&env, "Community Contribution");
    let review = String::from_str(&env, "Excellent developer! High code quality.");

    client.endorse(&sender, &target, &category, &review);

    let endorsement = client.get_endorsement(&target, &sender).unwrap();
    assert_eq!(endorsement.review, review);
    assert!(endorsement.active);
}

#[test]
fn test_endorsement_revocation() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(ReputationContract, ());
    let client = ReputationContractClient::new(&env, &contract_id);

    let sender = Address::generate(&env);
    let target = Address::generate(&env);
    let category = String::from_str(&env, "Liquidity Provider");
    let review = String::from_str(&env, "Good liquidity contribution");

    client.endorse(&sender, &target, &category, &review);

    // Score is initially 1
    assert_eq!(client.get_score(&target), 1);

    // Revoke
    client.revoke_endorsement(&sender, &target);

    // Endorsement should now be inactive
    let endorsement = client.get_endorsement(&target, &sender).unwrap();
    assert!(!endorsement.active);

    // Score should be deducted back to 0
    assert_eq!(client.get_score(&target), 0);
}

#[test]
fn test_endorsement_updates() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(ReputationContract, ());
    let client = ReputationContractClient::new(&env, &contract_id);

    let sender = Address::generate(&env);
    let target = Address::generate(&env);
    let category = String::from_str(&env, "Liquidity Provider");
    let review = String::from_str(&env, "Good liquidity contribution");

    client.endorse(&sender, &target, &category, &review);

    // Update the category and review text
    let new_category = String::from_str(&env, "Top-tier Validator");
    let new_review = String::from_str(&env, "Superb uptime and validator performance!");
    client.update_endorsement(&sender, &target, &new_category, &new_review);

    // Verify it updated correctly
    let endorsement = client.get_endorsement(&target, &sender).unwrap();
    assert_eq!(endorsement.category, new_category);
    assert_eq!(endorsement.review, new_review);
}

#[test]
fn test_reputation_decay() {
    let env = Env::default();
    env.mock_all_auths();

    // Set initial timestamp
    let initial_time: u64 = 1000000;
    env.ledger().set(LedgerInfo {
        timestamp: initial_time,
        protocol_version: 22,
        sequence_number: 1,
        network_id: [0; 32],
        base_reserve: 10000000,
        min_temp_entry_ttl: 16,
        min_persistent_entry_ttl: 4096,
        max_entry_ttl: 6312000,
    });

    let contract_id = env.register(ReputationContract, ());
    let client = ReputationContractClient::new(&env, &contract_id);

    let sender = Address::generate(&env);
    let target = Address::generate(&env);
    let category = String::from_str(&env, "Community Contribution");
    let review = String::from_str(&env, "Good");

    client.endorse(&sender, &target, &category, &review);

    // Initial score must be 1 point
    assert_eq!(client.get_score(&target), 1);

    // Advance time by 29 days (less than 30 days cliff) -> should still be 1
    let twenty_nine_days: u64 = 29 * 24 * 60 * 60;
    env.ledger().set(LedgerInfo {
        timestamp: initial_time + twenty_nine_days,
        protocol_version: 22,
        sequence_number: 2,
        network_id: [0; 32],
        base_reserve: 10000000,
        min_temp_entry_ttl: 16,
        min_persistent_entry_ttl: 4096,
        max_entry_ttl: 6312000,
    });
    assert_eq!(client.get_score(&target), 1);

    // Advance time by 44 days (30 days cliff + 2 weeks) -> 20% decay -> 1 * 80 / 100 = 0
    let forty_four_days: u64 = 44 * 24 * 60 * 60;
    env.ledger().set(LedgerInfo {
        timestamp: initial_time + forty_four_days,
        protocol_version: 22,
        sequence_number: 3,
        network_id: [0; 32],
        base_reserve: 10000000,
        min_temp_entry_ttl: 16,
        min_persistent_entry_ttl: 4096,
        max_entry_ttl: 6312000,
    });
    assert_eq!(client.get_score(&target), 0);
}
