import {
  signTransaction,
  setAllowed,
  getAddress,
} from "@stellar/freighter-api";
import * as StellarSdk from "@stellar/stellar-sdk";

const HORIZON_URL = "https://horizon-testnet.stellar.org";
const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;
const server = new StellarSdk.Horizon.Server(HORIZON_URL);

/** Ask Freighter for permission. Returns true if allowed. */
const checkConnection = async () => {
  try {
    const result = await setAllowed();
    return result;
  } catch (e) {
    console.error("[Freighter] checkConnection error:", e);
    return { error: e?.message || "Permission denied" };
  }
};

/** Get the connected wallet public key. */
const retrievePublicKey = async () => {
  const { address, error } = await getAddress();
  if (error) throw new Error(error);
  return address;
};

/** Fetch the native XLM balance of the connected wallet. */
const getBalance = async () => {
  await setAllowed();
  const { address, error } = await getAddress();
  if (error) throw new Error(error);
  const account = await server.loadAccount(address);
  const xlm = account.balances.find((b) => b.asset_type === "native");
  return xlm?.balance || "0";
};

/** Sign an XDR transaction with Freighter. */
const userSignTransaction = async (xdr, network, signWith) => {
  return await signTransaction(xdr, {
    network,
    accountToSign: signWith,
  });
};

/**
 * Submit an endorsement on-chain.
 * Creates a Stellar tx with a manageData op storing the endorsement,
 * plus a memo with endorsement info.
 * Returns the tx hash on success.
 */
const submitEndorsement = async (senderPubKey, targetAddress, category, score) => {
  try {
    const account = await server.loadAccount(senderPubKey);

    const dataKey = `repute:${targetAddress.slice(0, 8)}`;
    const dataValue = `${category}:${score}:${Date.now()}`;

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        StellarSdk.Operation.manageData({
          name: dataKey,
          value: dataValue,
        })
      )
      .addMemo(StellarSdk.Memo.text(`endorse:${targetAddress.slice(0, 12)}`))
      .setTimeout(120)
      .build();

    const xdr = tx.toXDR();

    const signedResult = await signTransaction(xdr, {
      networkPassphrase: NETWORK_PASSPHRASE,
    });

    const signedXdr =
      typeof signedResult === "string"
        ? signedResult
        : signedResult.signedTxXdr || signedResult;

    const signedTx = StellarSdk.TransactionBuilder.fromXDR(
      signedXdr,
      NETWORK_PASSPHRASE
    );

    const result = await server.submitTransaction(signedTx);
    return {
      success: true,
      hash: result.hash,
      ledger: result.ledger,
    };
  } catch (e) {
    console.error("[Freighter] submitEndorsement error:", e);
    return {
      success: false,
      error: e?.message || "Transaction failed",
    };
  }
};

/**
 * Fetch recent transactions for a given wallet from Horizon.
 * Returns an array of simplified transaction objects.
 */
const fetchRecentTransactions = async (publicKey, limit = 10) => {
  try {
    const txs = await server
      .transactions()
      .forAccount(publicKey)
      .order("desc")
      .limit(limit)
      .call();

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
    console.error("[Freighter] fetchRecentTransactions error:", e);
    return [];
  }
};

/**
 * Fetch account data entries (manageData) for a given wallet.
 * These contain the endorsement information.
 */
const fetchAccountData = async (publicKey) => {
  try {
    const account = await server.loadAccount(publicKey);
    return account.data_attr || {};
  } catch (e) {
    console.error("[Freighter] fetchAccountData error:", e);
    return {};
  }
};

export {
  checkConnection,
  retrievePublicKey,
  getBalance,
  userSignTransaction,
  submitEndorsement,
  fetchRecentTransactions,
  fetchAccountData,
  server,
  HORIZON_URL,
  NETWORK_PASSPHRASE,
};