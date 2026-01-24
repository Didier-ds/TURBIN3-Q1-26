import { Commitment, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js"
import wallet from "../turbin3-wallet.json"
import { getOrCreateAssociatedTokenAccount, transfer } from "@solana/spl-token";

// We're going to import our keypair from the wallet file
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

//Create a Solana devnet connection
const commitment: Commitment = "confirmed";
const connection = new Connection("https://api.devnet.solana.com", commitment);

// Mint address
const mint = new PublicKey("2XQwvtpLpCBrm58TS38gZTdmWYaL4BxGg2mqiUopihGH");

// Recipient address
const to = new PublicKey("53Q6QfKe8uJSn4sqDfq9iMPje2d1r7326mmwAxQAyLh8");

(async () => {
    try {
        // Get the token account of the fromWallet address, and if it does not exist, create it
        const tokenAccount = await getOrCreateAssociatedTokenAccount(
            connection, // connection
            keypair, // fee payer
            mint, // mint
            keypair.publicKey, // owner
        );

        console.log(`Token Account: ${tokenAccount.address.toBase58()}`);

        // Get the token account of the toWallet address, and if it does not exist, create it
        const toTokenAccount = await getOrCreateAssociatedTokenAccount(
            connection, // connection
            keypair, // fee payer
            mint, // mint
            to,
        );

        // Transfer the new token to the "toTokenAccount" we just created
        const signature = await transfer(
            connection,
            keypair, // payer
            tokenAccount.address, // from token account
            toTokenAccount.address, // to token account
            keypair, // owner of from token account
            5000000000n, // amount to transfer (in smallest unit)
            [],
            {
                commitment: "confirmed"
            }
        );
        
        console.log(`Transfer successful! Check out your TX here:\nhttps://explorer.solana.com/tx/${signature}?cluster=devnet`);
    } catch(e) {
        console.error(`Oops, something went wrong: ${e}`)
    }
})();
