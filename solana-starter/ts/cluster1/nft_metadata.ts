import wallet from "../turbin3-wallet.json"
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { createGenericFile, createSignerFromKeypair, signerIdentity } from "@metaplex-foundation/umi"
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys"

// Create a devnet connection
const umi = createUmi('https://api.devnet.solana.com');

let keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const signer = createSignerFromKeypair(umi, keypair);

umi.use(irysUploader());
umi.use(signerIdentity(signer));

(async () => {
    try {
        // Follow this JSON structure
        // https://docs.metaplex.com/programs/token-metadata/changelog/v1.0#json-structure

        const image = "https://gateway.irys.xyz/2FNHWJReuumtPQLmf2aUKozkLHKnnjx12ADouMKEkDTW"
        const metadata = {
            name: "Rugmat",
            symbol: "RUG",
            description: "Rugmat explores repetition, structure, and digital permanence through a muted architectural grid. What appears stable at first glance reveals subtle inconsistencies—an abstract reflection on order, control, and the thin line between foundation and collapse in digital systems.",
            image,
            attributes: [
                {
                    "trait_type": "Structure",
                    "value": "Grid"
                },
            ],
            properties: {
                files: [
                    {
                        "type": "image/png",
                        "uri": image
                    }
                ]
            },
            creators: []
        };

        const myUri = await umi.uploader.uploadJson(metadata);
        console.log("Your metadata URI: ", myUri);
    }
    catch(error) {
        console.log("Oops.. Something went wrong", error);
    }
})();
