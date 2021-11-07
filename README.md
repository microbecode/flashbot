# Flashbot recovery example
- The problem: One of your wallets has been compromised, and any ETH you put on ther is siphoned off immediately. You would like to retrieve some assets or transfer contract ownership, but that all costs gas and your gas tank is stuck on empty.
- The solution: Flashbots!
- The code for this repo provides an example of how
- This is the actual code I used (with added comments) to recover assets from a compromised wallet
- Most of the code comes from <a href='https://github.com/scyclow/flashbot'>the original repository</a>

## Preparations
1. Run `npm install`
1. Create an account at a node service provider: Infura is used in this example.
1. Construct a list of transactions. You can get the gasLimit and tx data by doing a dry run with metamask and/or etherscan
1. Test out on Goerli testnet (if possible)
1. Prepare a mainnet wallet which has just enough Ethers for the bundle, and no other assets

## Running the script
### Linux / Mac users
Pass everything in as environment variables, like so:
- `INFURA_KEY=<...> FUNDING_WALLET_PRIVATE_KEY=<...> COMPROMISED_WALLET_PRIVATE_KEY=<...> npm run start`. Remember
- For example: `INFURA_KEY='blah' FUNDING_WALLET_PRIVATE_KEY='abc' COMPROMISED_WALLET_PRIVATE_KEY='def' npm run start`

### Windows users
Either modify the script to use the <a href='https://github.com/motdotla/dotenv'>dotenv package</a> or *carefully* insert the data manually in the script. **NEVER EVER UPLOAD THE SCRIPT WITH THE PRIVATE DATA ANYWHERE ONLINE**