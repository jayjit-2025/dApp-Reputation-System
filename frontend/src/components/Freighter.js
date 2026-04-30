import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
  FREIGHTER_ID,
} from "@creit.tech/stellar-wallets-kit";
import * as StellarSdk from "@stellar/stellar-sdk";

const HORIZON_URL = "https://horizon-testnet.stellar.org";
const RPC_URL = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;
const server = new StellarSdk.Horizon.Server(HORIZON_URL);
const rpcServer = new StellarSdk.rpc.Server(RPC_URL);

// New Deployed Contract ID
const CONTRACT_ID = "CB424V2KWLZ4EXHLQQR4P63KR4RWKVE7S4UM2QUWT2P2RHDLLFSZWVDH";

const kit = new StellarWalletsKit({
  network: WalletNetwork.TESTNET,
  selectedWalletId: FREIGHTER_ID,
  modules: allowAllModules(),
});

/** Open Modal for Multi-Wallet Connection */
const connectKitWallet = async () => {
  return new Promise((resolve, reject) => {
    kit.openModal({
      onWalletSelected: async (option) => {
        try {
          kit.setWallet(option.id);
          const { address } = await kit.getAddress();
          resolve(address);
        } catch (e) {
          reject(e);
        }
      },
      onClosed: () => reject(new Error("Wallet connection cancelled")),
    });
  });
};

const checkConnection = async () => {
  return true; // Wallet kit handles it
};

const retrievePublicKey = async () => {
  const { address } = await kit.getAddress();
  return address;
};

const getBalance = async () => {
  try {
    const { address } = await kit.getAddress();
    const account = await server.loadAccount(address);
    const xlm = account.balances.find((b) => b.asset_type === "native");
    return xlm?.balance || "0";
  } catch (e) {
    console.error("[WalletKit] getBalance error:", e);
    return "0";
  }
};

const submitEndorsement = async (senderPubKey, targetAddress, category) => {
  try {
    const account = await server.loadAccount(senderPubKey);
    const contract = new StellarSdk.Contract(CONTRACT_ID);

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          "endorse",
          StellarSdk.nativeToScVal(senderPubKey, { type: "address" }),
          StellarSdk.nativeToScVal(targetAddress, { type: "address" }),
          StellarSdk.nativeToScVal(category, { type: "string" })
        )
      )
      .setTimeout(120)
      .build();

    const preparedTransaction = await rpcServer.prepareTransaction(tx);
    const { signedTxXdr } = await kit.signTransaction(preparedTransaction.toXDR());
    
    const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE);
    const result = await rpcServer.sendTransaction(signedTx);

    if (result.status === "ERROR") {
      throw new Error("Transaction submission failed: " + JSON.stringify(result.errorResultXdr));
    }

    let txResponse;
    let attempts = 0;
    while (attempts < 15) {
      txResponse = await rpcServer.getTransaction(result.hash);
      if (txResponse.status !== "NOT_FOUND") {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }

    if (txResponse && txResponse.status === "SUCCESS") {
      return {
        success: true,
        hash: result.hash,
        ledger: txResponse.latestLedger,
      };
    } else {
      throw new Error(
        txResponse?.resultMetaXdr 
          ? "Contract execution reverted." 
          : "Transaction failed on-chain."
      );
    }
  } catch (e) {
    console.error("[WalletKit] submitEndorsement error:", e);
    
    // Parse the 3 specific errors from simulation/execution
    let errorMsg = e?.message || "Transaction failed";
    if (errorMsg.includes("Error(Contract, #1)")) {
        errorMsg = "Self-endorsement is not allowed.";
    } else if (errorMsg.includes("Error(Contract, #2)")) {
        errorMsg = "Score must be between 1 and 1000.";
    } else if (errorMsg.includes("Error(Contract, #3)")) {
        errorMsg = "Wallet is already endorsed by you.";
    }

    return {
      success: false,
      error: errorMsg,
    };
  }
};

const fetchSorobanEvents = async () => {
    try {
        const currentLedger = await rpcServer.getLatestLedger();
        const startLedger = Math.max(1, currentLedger.sequence - 17280); // Past ~24 hours
        const events = await rpcServer.getEvents({
            startLedger,
            filters: [
                {
                    type: "contract",
                    contractIds: [CONTRACT_ID],
                    topics: [
                       [StellarSdk.nativeToScVal("endorse", { type: "symbol" }).toXDR("base64")]
                    ]
                }
            ],
            limit: 10
        });
        return events.events || [];
    } catch (e) {
        console.error("fetchSorobanEvents error:", e);
        return [];
    }
};

// Fetch endorsement events for a SPECIFIC target wallet address
const fetchEndorsementEvents = async (targetAddress) => {
    try {
        console.log(`[Endorsement Events] Fetching events for target: ${targetAddress}`);
        const currentLedger = await rpcServer.getLatestLedger();
        const startLedger = Math.max(1, currentLedger.sequence - 17280); // Past ~24 hours
        const targetScVal = StellarSdk.nativeToScVal(targetAddress, { type: "address" }).toXDR("base64");
        const events = await rpcServer.getEvents({
            startLedger,
            filters: [
                {
                    type: "contract",
                    contractIds: [CONTRACT_ID],
                    topics: [
                       [StellarSdk.nativeToScVal("endorse", { type: "symbol" }).toXDR("base64")],
                       [targetScVal]
                    ]
                }
            ],
            limit: 20
        });
        const result = events.events || [];
        console.log(`[Endorsement Events] Found ${result.length} events for ${targetAddress}`);
        return result;
    } catch (e) {
        console.error("[Endorsement Events] Error:", e);
        return [];
    }
};

// Keep existing methods for backward compatibility in lookup
const fetchRecentTransactions = async (publicKey, limit = 10) => {
  try {
    const txs = await server.transactions().forAccount(publicKey).order("desc").limit(limit).call();
    return txs.records.map((tx) => ({
      hash: tx.hash,
      createdAt: tx.created_at,
      memo: tx.memo || "",
      memoType: tx.memo_type,
      ledger: tx.ledger,
      feeCharged: tx.fee_charged,
      operationCount: tx.operation_count,
      sourceAccount: tx.source_account,
      successful: tx.successful,
    }));
  } catch (e) {
    return [];
  }
};

const fetchAccountData = async (publicKey) => {
  try {
    const account = await server.loadAccount(publicKey);
    return account.data_attr || {};
  } catch (e) {
    return {};
  }
};

const fetchOnChainScore = async (address) => {
  try {
    console.log(`[Score Fetch] Querying contract ${CONTRACT_ID} for address: ${address}`);
    const contract = new StellarSdk.Contract(CONTRACT_ID);
    const tx = new StellarSdk.TransactionBuilder(
      new StellarSdk.Account(address, "0"), 
      {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      }
    )
      .addOperation(
        contract.call(
          "get_score",
          StellarSdk.nativeToScVal(address, { type: "address" })
        )
      )
      .setTimeout(30)
      .build();

    const simResult = await rpcServer.simulateTransaction(tx);
    console.log(`[Score Fetch] simResult keys:`, Object.keys(simResult));
    console.log(`[Score Fetch] simResult.result:`, simResult.result);

    // Try SDK parsed path first
    if (simResult?.result?.retval) {
      const rawValue = StellarSdk.scValToNative(simResult.result.retval);
      console.log(`[Score Fetch] Address: ${address} | Parsed Score: ${rawValue}`);
      return typeof rawValue === 'number' ? rawValue : Number(rawValue);
    }

    // Fallback: try raw RPC response path (results[0].xdr)
    if (simResult?.results?.[0]?.xdr) {
      const scVal = StellarSdk.xdr.ScVal.fromXDR(simResult.results[0].xdr, 'base64');
      const rawValue = StellarSdk.scValToNative(scVal);
      console.log(`[Score Fetch] Address: ${address} | Parsed Score (from xdr): ${rawValue}`);
      return typeof rawValue === 'number' ? rawValue : Number(rawValue);
    }

    console.warn(`[Score Fetch] Address: ${address} | No retval in simulation`);
    return 0;
  } catch (e) {
    console.error("[Score Fetch] Error for address:", address, e);
    return 0;
  }
};

const fetchEndorsementCount = async (address) => {
  try {
    console.log(`[Endorsement Count] Querying for address: ${address}`);
    const contract = new StellarSdk.Contract(CONTRACT_ID);
    const tx = new StellarSdk.TransactionBuilder(
      new StellarSdk.Account(address, "0"), 
      {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      }
    )
      .addOperation(
        contract.call(
          "get_endorsement_count",
          StellarSdk.nativeToScVal(address, { type: "address" })
        )
      )
      .setTimeout(30)
      .build();

    const simResult = await rpcServer.simulateTransaction(tx);
    console.log(`[Endorsement Count] simResult keys:`, Object.keys(simResult));
    console.log(`[Endorsement Count] simResult.result:`, simResult.result);

    // Try SDK parsed path first
    if (simResult?.result?.retval) {
      const rawValue = StellarSdk.scValToNative(simResult.result.retval);
      console.log(`[Endorsement Count] Address: ${address} | Count: ${rawValue}`);
      return typeof rawValue === 'number' ? rawValue : Number(rawValue);
    }

    // Fallback: try raw RPC response path
    if (simResult?.results?.[0]?.xdr) {
      const scVal = StellarSdk.xdr.ScVal.fromXDR(simResult.results[0].xdr, 'base64');
      const rawValue = StellarSdk.scValToNative(scVal);
      console.log(`[Endorsement Count] Address: ${address} | Count (from xdr): ${rawValue}`);
      return typeof rawValue === 'number' ? rawValue : Number(rawValue);
    }

    console.warn(`[Endorsement Count] Address: ${address} | No retval`);
    return 0;
  } catch (e) {
    console.error("[Endorsement Count] Error:", e);
    return 0;
  }
};

export {
  connectKitWallet,
  checkConnection,
  retrievePublicKey,
  getBalance,
  submitEndorsement,
  fetchRecentTransactions,
  fetchAccountData,
  fetchSorobanEvents,
  fetchEndorsementEvents,
  fetchOnChainScore,
  fetchEndorsementCount,
  server,
  rpcServer,
  HORIZON_URL,
  RPC_URL,
  NETWORK_PASSPHRASE,
  CONTRACT_ID,
  kit
};