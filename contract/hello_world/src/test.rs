#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, testutils::Ledger, testutils::LedgerInfo, Address, Env, String};

fn setup() -> (Env, ReputationContractClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let contract_id = env.register(ReputationContract, (&admin,));
    let client = ReputationContractClient::new(&env, &contract_id);
    (env, client, admin)
}

// ─── Day 1: Constructor & Admin Tests ───────────────────────────────────

#[test]
fn test_constructor_sets_admin() {
    let (_env, client, admin) = setup();
    let stored_admin = client.get_admin();
    assert_eq!(stored_admin, admin);
    assert!(!client.is_paused());
}

#[test]
#[should_panic(expected = "HostError: Error(Contract, #6)")]
fn test_initialize_prevents_reinit() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let contract_id = env.register(ReputationContract, (&admin,));
    let client = ReputationContractClient::new(&env, &contract_id);
    let new_admin = Address::generate(&env);
    client.initialize(&new_admin);
}

#[test]
fn test_set_admin_transfers_role() {
    let (env, client, _admin) = setup();
    let new_admin = Address::generate(&env);
    client.set_admin(&new_admin);
    let stored_admin = client.get_admin();
    assert_eq!(stored_admin, new_admin);
}

// ─── Day 1: Pause Mechanism Tests ───────────────────────────────────────

#[test]
#[should_panic(expected = "contract is paused")]
fn test_pause_blocks_endorse() {
    let (env, client, _admin) = setup();
    client.pause();
    let sender = Address::generate(&env);
    let target = Address::generate(&env);
    let category = String::from_str(&env, "Development Excellence");
    let review = String::from_str(&env, "Great work!");
    client.endorse(&sender, &target, &category, &review);
}

#[test]
#[should_panic(expected = "contract is paused")]
fn test_pause_blocks_revoke() {
    let (env, client, _admin) = setup();
    let sender = Address::generate(&env);
    let target = Address::generate(&env);
    let category = String::from_str(&env, "Liquidity Provider");
    let review = String::from_str(&env, "Good liquidity");
    client.endorse(&sender, &target, &category, &review);
    client.pause();
    client.revoke_endorsement(&sender, &target);
}

#[test]
#[should_panic(expected = "contract is paused")]
fn test_pause_blocks_update() {
    let (env, client, _admin) = setup();
    let sender = Address::generate(&env);
    let target = Address::generate(&env);
    let category = String::from_str(&env, "Liquidity Provider");
    let review = String::from_str(&env, "Good liquidity");
    client.endorse(&sender, &target, &category, &review);
    client.pause();
    let new_category = String::from_str(&env, "Top-tier Validator");
    let new_review = String::from_str(&env, "Updated review");
    client.update_endorsement(&sender, &target, &new_category, &new_review);
}

#[test]
fn test_unpause_allows_endorse() {
    let (env, client, _admin) = setup();
    client.pause();
    assert!(client.is_paused());
    client.unpause();
    assert!(!client.is_paused());
    let sender = Address::generate(&env);
    let target = Address::generate(&env);
    let category = String::from_str(&env, "Development Excellence");
    let review = String::from_str(&env, "Great work!");
    client.endorse(&sender, &target, &category, &review);
    let score = client.get_score(&target);
    assert_eq!(score, 1);
}

// ─── Core Endorsement Tests ─────────────────────────────────────────────

#[test]
fn test_successful_endorsement() {
    let (env, client, _admin) = setup();
    let sender = Address::generate(&env);
    let target = Address::generate(&env);
    let category = String::from_str(&env, "Development Excellence");
    let review = String::from_str(&env, "Great work!");
    client.endorse(&sender, &target, &category, &review);
    let endorsement = client.get_endorsement(&target, &sender).unwrap();
    assert_eq!(endorsement.weight_applied, 1);
    let score = client.get_score(&target);
    assert_eq!(score, 1);
    let count = client.get_endorsement_count(&target);
    assert_eq!(count, 1);
}

#[test]
fn test_successful_endorsement_and_multiplier() {
    let (env, client, _admin) = setup();
    let user_a = Address::generate(&env);
    let user_b = Address::generate(&env);
    let user_c = Address::generate(&env);
    let category = String::from_str(&env, "Test");
    let review = String::from_str(&env, "Good");
    client.endorse(&user_a, &user_b, &category, &review);
    let endorsement1 = client.get_endorsement(&user_b, &user_a).unwrap();
    assert_eq!(endorsement1.weight_applied, 1);
    let score_b = client.get_score(&user_b);
    assert_eq!(score_b, 1);
    client.endorse(&user_b, &user_c, &category, &review);
    assert_eq!(client.get_score(&user_c), 1);
}

#[test]
fn test_score_accumulates_across_multiple_endorsers() {
    let (env, client, _admin) = setup();
    let target = Address::generate(&env);
    let category = String::from_str(&env, "Community Contribution");
    for _ in 0..3 {
        let sender = Address::generate(&env);
        let review = String::from_str(&env, "Great work!");
        client.endorse(&sender, &target, &category, &review);
    }
    assert_eq!(client.get_score(&target), 3);
    assert_eq!(client.get_endorsement_count(&target), 3);
}

#[test]
#[should_panic(expected = "HostError: Error(Contract, #1)")]
fn test_self_endorsement_not_allowed() {
    let (env, client, _admin) = setup();
    let sender = Address::generate(&env);
    let category = String::from_str(&env, "Community Contribution");
    let review = String::from_str(&env, "Self");
    client.endorse(&sender, &sender, &category, &review);
}

#[test]
#[should_panic(expected = "HostError: Error(Contract, #2)")]
fn test_already_endorsed() {
    let (env, client, _admin) = setup();
    let sender = Address::generate(&env);
    let target = Address::generate(&env);
    let category = String::from_str(&env, "Liquidity Provider");
    let review = String::from_str(&env, "Great work!");
    client.endorse(&sender, &target, &category, &review);
    let review = String::from_str(&env, "Great work!");
    client.endorse(&sender, &target, &category, &review);
}

#[test]
fn test_custom_review_storage() {
    let (env, client, _admin) = setup();
    let sender = Address::generate(&env);
    let target = Address::generate(&env);
    let category = String::from_str(&env, "Community Contribution");
    let review = String::from_str(&env, "Excellent developer! High code quality.");
    client.endorse(&sender, &target, &category, &review);
    let endorsement = client.get_endorsement(&target, &sender).unwrap();
    assert_eq!(endorsement.review, review);
    assert!(endorsement.active);
}

// ─── Revocation Tests ───────────────────────────────────────────────────

#[test]
fn test_endorsement_revocation() {
    let (env, client, _admin) = setup();
    let sender = Address::generate(&env);
    let target = Address::generate(&env);
    let category = String::from_str(&env, "Liquidity Provider");
    let review = String::from_str(&env, "Good liquidity contribution");
    client.endorse(&sender, &target, &category, &review);
    assert_eq!(client.get_score(&target), 1);
    client.revoke_endorsement(&sender, &target);
    let endorsement = client.get_endorsement(&target, &sender).unwrap();
    assert!(!endorsement.active);
    assert_eq!(client.get_score(&target), 0);
}

// ─── Update Tests ───────────────────────────────────────────────────────

#[test]
fn test_endorsement_updates() {
    let (env, client, _admin) = setup();
    let sender = Address::generate(&env);
    let target = Address::generate(&env);
    let category = String::from_str(&env, "Liquidity Provider");
    let review = String::from_str(&env, "Good liquidity contribution");
    client.endorse(&sender, &target, &category, &review);
    let new_category = String::from_str(&env, "Top-tier Validator");
    let new_review = String::from_str(&env, "Superb uptime and validator performance!");
    client.update_endorsement(&sender, &target, &new_category, &new_review);
    let endorsement = client.get_endorsement(&target, &sender).unwrap();
    assert_eq!(endorsement.category, new_category);
    assert_eq!(endorsement.review, new_review);
}

// ─── Day 2: Re-endorsement After Revocation ─────────────────────────────

#[test]
fn test_re_endorsement_after_revocation() {
    let (env, client, _admin) = setup();
    let sender = Address::generate(&env);
    let target = Address::generate(&env);
    let category = String::from_str(&env, "Development Excellence");
    let review = String::from_str(&env, "Great work!");
    client.endorse(&sender, &target, &category, &review);
    assert_eq!(client.get_score(&target), 1);
    client.revoke_endorsement(&sender, &target);
    assert_eq!(client.get_score(&target), 0);
    let category2 = String::from_str(&env, "Top-tier Validator");
    let review2 = String::from_str(&env, "Even better the second time!");
    client.endorse(&sender, &target, &category2, &review2);
    let endorsement = client.get_endorsement(&target, &sender).unwrap();
    assert!(endorsement.active);
    assert_eq!(endorsement.category, category2);
    assert_eq!(endorsement.review, review2);
    assert_eq!(client.get_score(&target), 1);
}

// ─── Day 2: Validation Tests ────────────────────────────────────────────

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_review_length_limit() {
    let (env, client, _admin) = setup();
    let sender = Address::generate(&env);
    let target = Address::generate(&env);
    let category = String::from_str(&env, "Development");
    let long_review_str = "a".repeat(201);
    let review = String::from_str(&env, &long_review_str);
    client.endorse(&sender, &target, &category, &review);
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_empty_review_rejected() {
    let (env, client, _admin) = setup();
    let sender = Address::generate(&env);
    let target = Address::generate(&env);
    let category = String::from_str(&env, "Development");
    let review = String::from_str(&env, "");
    client.endorse(&sender, &target, &category, &review);
}

#[test]
#[should_panic(expected = "Error(Contract, #9)")]
fn test_invalid_category_empty() {
    let (env, client, _admin) = setup();
    let sender = Address::generate(&env);
    let target = Address::generate(&env);
    let category = String::from_str(&env, "");
    let review = String::from_str(&env, "Great work!");
    client.endorse(&sender, &target, &category, &review);
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_update_rejects_long_review() {
    let (env, client, _admin) = setup();
    let sender = Address::generate(&env);
    let target = Address::generate(&env);
    let category = String::from_str(&env, "Development");
    let review = String::from_str(&env, "Good work!");
    client.endorse(&sender, &target, &category, &review);
    let new_category = String::from_str(&env, "Development");
    let long_review = String::from_str(&env, &"x".repeat(201));
    client.update_endorsement(&sender, &target, &new_category, &long_review);
}

#[test]
#[should_panic(expected = "Error(Contract, #9)")]
fn test_update_rejects_invalid_category() {
    let (env, client, _admin) = setup();
    let sender = Address::generate(&env);
    let target = Address::generate(&env);
    let category = String::from_str(&env, "Development");
    let review = String::from_str(&env, "Good work!");
    client.endorse(&sender, &target, &category, &review);
    let bad_category = String::from_str(&env, "");
    let new_review = String::from_str(&env, "Updated review");
    client.update_endorsement(&sender, &target, &bad_category, &new_review);
}

// ─── Time Decay Tests ───────────────────────────────────────────────────

#[test]
fn test_reputation_decay() {
    let env = Env::default();
    env.mock_all_auths();
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
    let admin = Address::generate(&env);
    let contract_id = env.register(ReputationContract, (&admin,));
    let client = ReputationContractClient::new(&env, &contract_id);
    let sender = Address::generate(&env);
    let target = Address::generate(&env);
    let category = String::from_str(&env, "Community Contribution");
    let review = String::from_str(&env, "Good");
    client.endorse(&sender, &target, &category, &review);
    assert_eq!(client.get_score(&target), 1);
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

// ─── Edge Case Tests ────────────────────────────────────────────────────

#[test]
fn test_score_query_for_unendorsed_target() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let contract_id = env.register(ReputationContract, (&admin,));
    let client = ReputationContractClient::new(&env, &contract_id);
    let random_target = Address::generate(&env);
    assert_eq!(client.get_score(&random_target), 0);
    assert_eq!(client.get_endorsement_count(&random_target), 0);
}
