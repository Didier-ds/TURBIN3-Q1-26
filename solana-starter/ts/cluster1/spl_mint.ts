import { Keypair, PublicKey, Connection, Commitment } from "@solana/web3.js";
import {getOrCreateAssociatedTokenAccount, mintTo, TOKEN_PROGRAM_ID} from '@solana/spl-token';
import wallet from "../turbin3-wallet.json"

// Import our keypair from the wallet file
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

//Create a Solana devnet connection
const commitment: Commitment = "confirmed";
const connection = new Connection("https://api.devnet.solana.com", commitment);

const token_decimals = 1_000_000n;

// Mint address
const mint = new PublicKey("2XQwvtpLpCBrm58TS38gZTdmWYaL4BxGg2mqiUopihGH");

(async () => {
    try {
        // Create an ATA
        const ata = await getOrCreateAssociatedTokenAccount(
            connection, // connection
            keypair, // fee payer
            mint, // mint
            keypair.publicKey, // owner
        );
        console.log(
            `Your ata is: ${ata.address.toBase58()}`
        );
        
        const mintAmount = 100000000000000000000n;
        const mintTx = await mintTo(
            connection,
            keypair,
            mint,
            ata.address,
            keypair, // Authority (mint authority)
            mintAmount,
            [],
            {
                commitment: "confirmed"
            },
            TOKEN_PROGRAM_ID
        );
        
        console.log("You minted txid:", mintTx);
    } catch(error) {
        console.log(`Oops, something went wrong: ${error}`)
    }
})()
