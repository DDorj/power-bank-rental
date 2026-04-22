ALTER TABLE "wallets"
  ADD CONSTRAINT "wallets_balance_non_negative" CHECK ("balance" >= 0),
  ADD CONSTRAINT "wallets_frozen_amount_non_negative" CHECK ("frozen_amount" >= 0),
  ADD CONSTRAINT "wallets_frozen_amount_lte_balance" CHECK ("frozen_amount" <= "balance");

ALTER TABLE "rentals"
  ADD CONSTRAINT "rentals_charge_amount_non_negative"
  CHECK ("charge_amount" IS NULL OR "charge_amount" >= 0);

CREATE UNIQUE INDEX "rentals_user_id_active_key"
  ON "rentals" ("user_id")
  WHERE "status" = 'active';

CREATE UNIQUE INDEX "pricing_rules_single_default_key"
  ON "pricing_rules" ("is_default")
  WHERE "is_default" = true;

CREATE UNIQUE INDEX "dan_verifications_national_id_hash_key"
  ON "dan_verifications" ("national_id_hash");
