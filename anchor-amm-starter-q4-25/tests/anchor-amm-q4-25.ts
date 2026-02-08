import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AnchorAmmQ425 } from "../target/types/anchor_amm_q4_25";
import { expect } from "chai";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createMint,
  mintTo,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

describe("anchor-amm-q4-25", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.AnchorAmmQ425 as Program<AnchorAmmQ425>;
  const user = provider.wallet.publicKey;

  const SEED = 12345;
  const FEE_BPS = 100; // 1%
  const DECIMALS = 6;
  const TOKEN_SUPPLY = 1_000_000 * 10 ** DECIMALS;

  let mintX: anchor.web3.PublicKey;
  let mintY: anchor.web3.PublicKey;
  let configPda: anchor.web3.PublicKey;
  let mintLpPda: anchor.web3.PublicKey;
  let vaultX: anchor.web3.PublicKey;
  let vaultY: anchor.web3.PublicKey;
  let userX: anchor.web3.PublicKey;
  let userY: anchor.web3.PublicKey;
  let userLp: anchor.web3.PublicKey;

  before(async () => {
    // Airdrop SOL
    await provider.connection.requestAirdrop(
      user,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );
    await new Promise((r) => setTimeout(r, 1000));

    // Create token mints (6 decimals)
    mintX = await createMint(
      provider.connection,
      provider.wallet.payer,
      user,
      null,
      DECIMALS
    );
    mintY = await createMint(
      provider.connection,
      provider.wallet.payer,
      user,
      null,
      DECIMALS
    );

    // Derive PDAs
    const seedBuffer = Buffer.alloc(8);
    seedBuffer.writeBigUInt64LE(BigInt(SEED));

    [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("config"), seedBuffer],
      program.programId
    );

    [mintLpPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("lp"), configPda.toBuffer()],
      program.programId
    );

    vaultX = getAssociatedTokenAddressSync(mintX, configPda, true);
    vaultY = getAssociatedTokenAddressSync(mintY, configPda, true);
    userX = getAssociatedTokenAddressSync(mintX, user);
    userY = getAssociatedTokenAddressSync(mintY, user);
    userLp = getAssociatedTokenAddressSync(mintLpPda, user);

    // Create user ATAs and mint tokens
    const setupTx = new anchor.web3.Transaction().add(
      createAssociatedTokenAccountInstruction(user, userX, user, mintX),
      createAssociatedTokenAccountInstruction(user, userY, user, mintY)
    );
    await provider.sendAndConfirm(setupTx);
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      mintX,
      userX,
      provider.wallet.payer,
      TOKEN_SUPPLY
    );
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      mintY,
      userY,
      provider.wallet.payer,
      TOKEN_SUPPLY
    );
  });

  it("initializes the pool", async () => {
    await program.methods
      .initialize(new anchor.BN(SEED), FEE_BPS, null)
      .accounts({
        initializer: user,
        mintX,
        mintY,
        mintLp: mintLpPda,
        vaultX,
        vaultY,
        config: configPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const config = await program.account.config.fetch(configPda);
    expect(config.seed.toNumber()).to.equal(SEED);
    expect(config.fee).to.equal(FEE_BPS);
    expect(config.mintX.toBase58()).to.equal(mintX.toBase58());
    expect(config.mintY.toBase58()).to.equal(mintY.toBase58());
    expect(config.locked).to.be.false;

    const vaultXBalance = (
      await provider.connection.getTokenAccountBalance(vaultX)
    ).value.amount;
    expect(vaultXBalance).to.equal("0");

    const vaultYBalance = (
      await provider.connection.getTokenAccountBalance(vaultY)
    ).value.amount;
    expect(vaultYBalance).to.equal("0");
  });

  it("deposits liquidity (first deposit)", async () => {
    const amountLp = 100_000 * 10 ** DECIMALS; // 100k LP tokens
    const maxX = 100_000 * 10 ** DECIMALS; // 100k X
    const maxY = 100_000 * 10 ** DECIMALS; // 100k Y

    await program.methods
      .deposit(
        new anchor.BN(amountLp),
        new anchor.BN(maxX),
        new anchor.BN(maxY)
      )
      .accounts({
        user,
        mintX,
        mintY,
        config: configPda,
        mintLp: mintLpPda,
        vaultX,
        vaultY,
        userX,
        userY,
        userLp,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .rpc();

    const vaultXBalance = (
      await provider.connection.getTokenAccountBalance(vaultX)
    ).value.amount;
    expect(vaultXBalance).to.equal(maxX.toString());

    const vaultYBalance = (
      await provider.connection.getTokenAccountBalance(vaultY)
    ).value.amount;
    expect(vaultYBalance).to.equal(maxY.toString());

    const userLpBalance = (
      await provider.connection.getTokenAccountBalance(userLp)
    ).value.amount;
    expect(userLpBalance).to.equal(amountLp.toString());
  });

  it("swaps X for Y", async () => {
    const amountIn = 10_000 * 10 ** DECIMALS; // 10k X in
    const minAmountOut = 1; // accept any output (happy path)

    const vaultXBefore = (
      await provider.connection.getTokenAccountBalance(vaultX)
    ).value.amount;
    const vaultYBefore = (
      await provider.connection.getTokenAccountBalance(vaultY)
    ).value.amount;
    const userYBefore = (
      await provider.connection.getTokenAccountBalance(userY)
    ).value.amount;

    await program.methods
      .swap(true, new anchor.BN(amountIn), new anchor.BN(minAmountOut))
      .accounts({
        user,
        mintX,
        mintY,
        config: configPda,
        vaultX,
        vaultY,
        userX,
        userY,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .rpc();

    const vaultXAfter = (
      await provider.connection.getTokenAccountBalance(vaultX)
    ).value.amount;
    const vaultYAfter = (
      await provider.connection.getTokenAccountBalance(vaultY)
    ).value.amount;
    const userYAfter = (
      await provider.connection.getTokenAccountBalance(userY)
    ).value.amount;

    // Vault X should increase
    expect(Number(vaultXAfter)).to.be.greaterThan(Number(vaultXBefore || 0));
    // Vault Y should decrease
    expect(Number(vaultYAfter)).to.be.lessThan(Number(vaultYBefore));
    // User Y should increase
    expect(Number(userYAfter)).to.be.greaterThan(Number(userYBefore));
  });

  it("swaps Y for X", async () => {
    const amountIn = 5_000 * 10 ** DECIMALS; // 5k Y in
    const minAmountOut = 1;

    const vaultXBefore = (
      await provider.connection.getTokenAccountBalance(vaultX)
    ).value.amount;
    const userXBefore = (
      await provider.connection.getTokenAccountBalance(userX)
    ).value.amount;

    await program.methods
      .swap(false, new anchor.BN(amountIn), new anchor.BN(minAmountOut))
      .accounts({
        user,
        mintX,
        mintY,
        config: configPda,
        vaultX,
        vaultY,
        userX,
        userY,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .rpc();

    const userXAfter = (
      await provider.connection.getTokenAccountBalance(userX)
    ).value.amount;

    expect(Number(userXAfter)).to.be.greaterThan(Number(userXBefore));
  });

  it("withdraws liquidity", async () => {
    const amountLp = 50_000 * 10 ** DECIMALS; // withdraw half of LP
    const minX = 1;
    const minY = 1;

    const userXBefore = (
      await provider.connection.getTokenAccountBalance(userX)
    ).value.amount;
    const userYBefore = (
      await provider.connection.getTokenAccountBalance(userY)
    ).value.amount;
    const userLpBefore = (
      await provider.connection.getTokenAccountBalance(userLp)
    ).value.amount;

    await program.methods
      .withdraw(
        new anchor.BN(amountLp),
        new anchor.BN(minX),
        new anchor.BN(minY)
      )
      .accounts({
        user,
        mintX,
        mintY,
        config: configPda,
        mintLp: mintLpPda,
        vaultX,
        vaultY,
        userX,
        userY,
        userLp,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .rpc();

    const userXAfter = (
      await provider.connection.getTokenAccountBalance(userX)
    ).value.amount;
    const userYAfter = (
      await provider.connection.getTokenAccountBalance(userY)
    ).value.amount;
    const userLpAfter = (
      await provider.connection.getTokenAccountBalance(userLp)
    ).value.amount;

    // User received X and Y back
    expect(Number(userXAfter)).to.be.greaterThan(Number(userXBefore));
    expect(Number(userYAfter)).to.be.greaterThan(Number(userYBefore));
    // LP tokens burned
    expect(Number(userLpAfter)).to.equal(
      Number(userLpBefore) - amountLp
    );
  });
});
