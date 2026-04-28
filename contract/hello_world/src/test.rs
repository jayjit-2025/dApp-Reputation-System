#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

#[test]
fn test_successful_endorsement_and_multiplier() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, ReputationContract);
    let client = ReputationContractClient::new(&env, &contract_id);

    let user_a = Address::generate(&env);
    let user_b = Address::generate(&env);
    let user_c = Address::generate(&env);
    
    // User A has 0 score. Multiplier should be 0.1x (1 point)
    let category = String::from_str(&env, "Test");
    client.endorse(&user_a, &user_b, &category);

    let endorsement1 = client.get_endorsement(&user_b, &user_a).unwrap();
    assert_eq!(endorsement1.weight_applied, 1);
    
    let score_b = client.get_score(&user_b);
    assert_eq!(score_b, 1); // User B gets 1 point

    // Now User B has 1 point. Multiplier is still 0.1x (1 point)
    client.endorse(&user_b, &user_c, &category);
    assert_eq!(client.get_score(&user_c), 1);

    // Let's artificially boost user C's score to test a higher multiplier
    // Since we don't have a direct setter, we'd need many endorsements, or we can just test the error paths next.
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

    client.endorse(&sender, &sender, &category);
}

#[test]
#[should_panic(expected = "HostError: Error(Contract, #2)")]
fn test_already_endorsed() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, ReputationContract);
    let client = ReputationContractClient::new(&env, &contract_id);

    let sender = Address::generate(&env);
    let target = Address::generate(&env);
    let category = String::from_str(&env, "Liquidity Provider");

    client.endorse(&sender, &target, &category);
    client.endorse(&sender, &target, &category);
}
