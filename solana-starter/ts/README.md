# Solana Starter

A comprehensive Solana development starter kit with TypeScript implementations for various blockchain operations.

## Progress

| File | Status |
|------|--------|
| cluster1/spl_init.ts | ✅ |
| cluster1/spl_mint.ts | ✅ |
| cluster1/spl_transfer.ts | ❌ |
| cluster1/spl_metadata.ts | ❌ |
| cluster1/nft_image.ts | ✅ |
| cluster1/nft_metadata.ts | ✅ |
| cluster1/nft_mint.ts | ✅ |
| cluster1/vault_init.ts | ❌ |
| cluster1/vault_deposit.ts | ❌ |
| cluster1/vault_withdraw.ts | ❌ |
| cluster1/vault_deposit_spl.ts | ❌ |
| cluster1/vault_withdraw_spl.ts | ❌ |
| cluster1/vault_deposit_nft.ts | ❌ |
| cluster1/vault_withdraw_nft.ts | ❌ |
| cluster1/vault_close.ts | ❌ |

## NFT Collection

### Generug NFT

![Generug NFT](./cluster1/assets/generug.png)

## Available Scripts

### SPL Token Operations
- `npm run spl_init` - Initialize SPL token
- `npm run spl_mint` - Mint SPL tokens
- `npm run spl_transfer` - Transfer SPL tokens
- `npm run spl_metadata` - Handle token metadata

### NFT Operations
- `npm run nft_image` - Upload NFT image
- `npm run nft_metadata` - Create NFT metadata
- `npm run nft_mint` - Mint NFT

### Vault Operations
- `npm run vault_init` - Initialize vault
- `npm run vault_deposit` - Deposit SOL
- `npm run vault_withdraw` - Withdraw SOL
- `npm run vault_deposit_spl` - Deposit SPL tokens
- `npm run vault_withdraw_spl` - Withdraw SPL tokens
- `npm run vault_deposit_nft` - Deposit NFT
- `npm run vault_withdraw_nft` - Withdraw NFT
- `npm run vault_close` - Close vault

### Utilities
- `npm run airdrop_to_wallet` - Airdrop to specific wallet
- `npm run base58_to_wallet` - Convert base58 to wallet
- `npm run wallet_to_base58` - Convert wallet to base58

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up your wallet configuration

3. Run the desired scripts using npm run commands

## Dependencies

- @solana/web3.js
- @solana/spl-token
- @coral-xyz/anchor
- @metaplex-foundation packages
- TypeScript