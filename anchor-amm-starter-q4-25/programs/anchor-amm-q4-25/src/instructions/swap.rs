use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{transfer, Mint, Token, TokenAccount, Transfer},
};
use constant_product_curve::ConstantProduct;

use crate::{errors::AmmError, state::Config};

#[derive(Accounts)]
pub struct Swap<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    pub mint_x: Account<'info, Mint>,
    pub mint_y: Account<'info, Mint>,
    #[account(
        has_one = mint_x,
        has_one = mint_y,
        seeds = [b"config", config.seed.to_le_bytes().as_ref()],
        bump = config.config_bump,
    )]
    pub config: Account<'info, Config>,
    #[account(
        mut,
        associated_token::mint = mint_x,
        associated_token::authority = config,
    )]
    pub vault_x: Account<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = mint_y,
        associated_token::authority = config,
    )]
    pub vault_y: Account<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = mint_x,
        associated_token::authority = user,
    )]
    pub user_x: Account<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = mint_y,
        associated_token::authority = user,
    )]
    pub user_y: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> Swap<'info> {
    pub fn swap(&mut self, is_x: bool, amount_in: u64, min_amount_out: u64) -> Result<()> {
        require!(!self.config.locked, AmmError::PoolLocked);
        require!(amount_in > 0, AmmError::InvalidAmount);

        let (vault_x, vault_y) = (self.vault_x.amount, self.vault_y.amount);
        require!(vault_x > 0 && vault_y > 0, AmmError::NoLiquidityInPool);

        let amount_after_fee = (amount_in as u128)
            .checked_mul(10_000 - self.config.fee as u128)
            .unwrap()
            .checked_div(10_000)
            .unwrap() as u64;

        let amount_out = if is_x {
            ConstantProduct::delta_y_from_x_swap_amount(vault_x, vault_y, amount_after_fee)
        } else {
            ConstantProduct::delta_x_from_y_swap_amount(vault_x, vault_y, amount_after_fee)
        }
        .map_err(|_| AmmError::CurveError)?;

        require!(amount_out >= min_amount_out, AmmError::SlippageExceeded);

        // Transfer in: user -> vault
        self.transfer_tokens(is_x, amount_in, false)?;
        // Transfer out: vault -> user (config is vault authority)
        self.transfer_tokens(is_x, amount_out, true)?;

        Ok(())
    }

    fn transfer_tokens(&self, is_x: bool, amount: u64, from_vault: bool) -> Result<()> {
        let (from, to, authority, use_signer) = if from_vault {
            if is_x {
                // Vault Y -> User Y (swap X for Y: user receives Y)
                (
                    self.vault_y.to_account_info(),
                    self.user_y.to_account_info(),
                    self.config.to_account_info(),
                    true,
                )
            } else {
                // Vault X -> User X (swap Y for X: user receives X)
                (
                    self.vault_x.to_account_info(),
                    self.user_x.to_account_info(),
                    self.config.to_account_info(),
                    true,
                )
            }
        } else {
            if is_x {
                // User X -> Vault X (swap X for Y)
                (
                    self.user_x.to_account_info(),
                    self.vault_x.to_account_info(),
                    self.user.to_account_info(),
                    false,
                )
            } else {
                // User Y -> Vault Y (swap Y for X)
                (
                    self.user_y.to_account_info(),
                    self.vault_y.to_account_info(),
                    self.user.to_account_info(),
                    false,
                )
            }
        };

        let cpi_program = self.token_program.to_account_info();
        let cpi_accounts = Transfer {
            from,
            to,
            authority,
        };

        if use_signer {
            let seed = self.config.seed.to_le_bytes();
            let bump = [self.config.config_bump];
            let signer_seeds: &[&[&[u8]]] = &[&[b"config", seed.as_ref(), bump.as_ref()]];
            let ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
            transfer(ctx, amount)
        } else {
            let ctx = CpiContext::new(cpi_program, cpi_accounts);
            transfer(ctx, amount)
        }
    }
}
