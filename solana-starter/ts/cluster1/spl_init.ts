import { Keypair, Connection, Commitment } from "@solana/web3.js";
import { createMint, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import wallet from "../turbin3-wallet.json"

// Import our keypair from the wallet file
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

//Create a Solana devnet connection
const commitment: Commitment = "confirmed";
const connection = new Connection("https://api.devnet.solana.com", commitment);

(async () => {
    try {
        const mint = await createMint(
            connection,
            keypair,            // Fee Payer (Your actual wallet)
            keypair.publicKey,  // Mint Authority
            keypair.publicKey,  // Freeze Authority
            9,                  // Decimals
            undefined,
            {
                commitment: "confirmed"
            },
            TOKEN_PROGRAM_ID
        );

        console.log("Success! New Mint Address:", mint.toBase58());
    } catch(error) {
        console.log(`Oops, something went wrong: ${error}`)
    }
})()
