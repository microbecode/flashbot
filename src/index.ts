// For everything you need to know about this file, see https://www.youtube.com/watch?v=1ve1YIpDs_I

import { providers, Wallet } from "ethers";
import { FlashbotsBundleProvider } from "@flashbots/ethers-provider-bundle";

// constants
const GWEI = 10n ** 9n;

// goerli
/* const FLASHBOTS_ENDPOINT = 'https://relay-goerli.flashbots.net'
const CHAIN_ID = 5 */

// mainnet
const FLASHBOTS_ENDPOINT = "https://relay.flashbots.net";
const CHAIN_ID = 1;

// Include these as env variables
// DON'T EVEN FUCKING THINK ABOUT PUTTING THESE IN A FILE

const INFURA_KEY = process.env.INFURA_KEY;

// Don't put much more than you need in this wallet
const FUNDING_WALLET_PRIVATE_KEY = process.env.FUNDING_WALLET_PRIVATE_KEY;

// This wallet is already fucked.
const COMPROMISED_WALLET_PRIVATE_KEY =
  process.env.COMPROMISED_WALLET_PRIVATE_KEY;

if (
  !(INFURA_KEY || FUNDING_WALLET_PRIVATE_KEY || COMPROMISED_WALLET_PRIVATE_KEY)
) {
  console.log(
    "Please include INFURA_KEY, FUNDING_WALLET_PRIVATE_KEY, and COMPROMISED_WALLET_PRIVATE_KEY as env variables."
  );
  process.exit(1);
}

// Create clients to interact with infura and your wallets
const provider = new providers.InfuraProvider(CHAIN_ID, INFURA_KEY);
const fundingWallet = new Wallet(FUNDING_WALLET_PRIVATE_KEY, provider);
const compromisedWallet = new Wallet(COMPROMISED_WALLET_PRIVATE_KEY, provider);

const BASE_FEE = 150;

// Cut down on some boilerplate
const funding_tx = (args) => ({
  chainId: CHAIN_ID,
  type: 2, // EIP 1559
  maxFeePerGas: GWEI * BigInt(BASE_FEE),
  maxPriorityFeePerGas: 1500000000,
  data: "0x",
  value: 0n,
  gasLimit: 21000,
  ...args,
});

// Cut down on some boilerplate
const transfer_tx = (args) => ({
  chainId: CHAIN_ID,
  type: 2, // EIP 1559
  maxFeePerGas: GWEI * BigInt(BASE_FEE),
  maxPriorityFeePerGas: 2500000000,
  value: 0n,
  gasLimit: 63655, // nft transfer gas limit higher than usual
  ...args,
});

/*
  The basic idea here is that you want to you group together the
  following transactions such that no one can get in the middle of
  things and siphon off the ETH:
    1. Fund the compromised wallet
    2. Perform all the actions you need on that wallet

  This means that you will be executing transactions signed by at least two different wallets,
  and will likely be transferring assets to a third wallet.

  The miner takes his bribe from the gas fees directly.

*/

const bundle = [
  // send the compromised wallet some eth
  {
    transaction: funding_tx({
      to: compromisedWallet.address,
      // Checked recent NFT transactions in the contract, and 60000 should be enough
      value: 8000000000000000,
    }),
    signer: fundingWallet,
  },

  // Transfer NFT
  {
    transaction: transfer_tx({
      // This data should include: function ID, compromised address, non-compromised address, nftID in hex format
      // Dry-run with Metamask to get the data
      data: "0X...", // transfer data
      to: "<contract address>", // nft contract address
    }),
    signer: compromisedWallet,
  },
];

let i = 0;
async function main() {
  console.log("Starting flashbot...");

  // Connect to the flashbots relayer -- this will communicate your bundle of transactions to
  // miners directly, and will bypass the mempool.
  let flashbotsProvider;
  try {
    console.log("Retreiving Flashbots Provider...");
    flashbotsProvider = await FlashbotsBundleProvider.create(
      provider,
      Wallet.createRandom(),
      FLASHBOTS_ENDPOINT
    );
  } catch (err) {
    console.error(err);
  }

  // Every time a new block has been detected, attempt to relay the bundle to miners for the next block
  // Since these transactions aren't in the mempool you need to submit this for every block until it
  // is filled. You don't have to worry about repeat transactions because nonce isn't changing. So you can
  // leave this running until it fills. I haven't found a good way to detect whether it's filled.
  provider.on("block", async (blockNumber) => {
    try {
      const nextBlock = blockNumber + 1;
      console.log(`Preparing bundle for block: ${nextBlock}`);

      const signedBundle = await flashbotsProvider.signBundle(bundle);
      const txBundle = await flashbotsProvider.sendRawBundle(
        signedBundle,
        nextBlock
      );

      if ("error" in txBundle) {
        console.log("bundle error:");
        console.warn(txBundle.error.message);
        return;
      }

      console.log("Submitting bundle");
      const response = await txBundle.simulate();
      if ("error" in response) {
        console.log("Simulate error");
        console.error(response.error);
        process.exit(1);
      }

      console.log("response:", response);

      console.log(`Try: ${i} -- block: ${nextBlock}`);
      i++;
    } catch (err) {
      console.log("Request error");
      console.error(err);
      process.exit(1);
    }
  });
}

// Bada bing, bada boom, beep boop. Run your flash bot
main();
