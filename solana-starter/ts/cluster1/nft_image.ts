import wallet from "../turbin3-wallet.json"
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { createGenericFile, createSignerFromKeypair, signerIdentity } from "@metaplex-foundation/umi"
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys"
import fs from "fs";

// Create a devnet connection
const umi = createUmi('https://api.devnet.solana.com');

let keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const signer = createSignerFromKeypair(umi, keypair);

umi.use(irysUploader());
umi.use(signerIdentity(signer));

(async () => {
    try {
        //1. Load image
        const imageFile = fs.readFileSync("./cluster1/assets/generug.png");
        //2. Convert image to generic file.
        const umiImageFile = createGenericFile(imageFile, "generug.png", {
            tags: [{ name: "Content-Type", value: "image/png" }],
        })
        //3. Upload image
        const image = await umi.uploader.upload([umiImageFile]);

        const [myUri] = image
        console.log("Image uploaded:", myUri);
    }
    catch(error) {
        console.log("Oops.. Something went wrong", error);
    }
})();
