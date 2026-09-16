-- Historical sales COGS snapshots.
-- Existing OrderItem rows intentionally remain NULL because historical
-- inventory cost at the time of those sales cannot be reconstructed safely.
ALTER TABLE "OrderItem"
ADD COLUMN "unitCostSnapshot" DECIMAL(10,2),
ADD COLUMN "totalCostSnapshot" DECIMAL(12,2);

-- Capture the current moving-average inventory cost whenever a new
-- OrderItem is created. This is done in the database so every order-creation
-- path gets the same historical cost snapshot.
CREATE OR REPLACE FUNCTION "snapshot_order_item_cost"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  current_cost DECIMAL(10,2);
BEGIN
  IF NEW."variantId" IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT "costPrice"
  INTO current_cost
  FROM "ProductVariant"
  WHERE id = NEW."variantId";

  IF current_cost IS NULL THEN
    NEW."unitCostSnapshot" := NULL;
    NEW."totalCostSnapshot" := NULL;
  ELSE
    NEW."unitCostSnapshot" := current_cost;
    NEW."totalCostSnapshot" := ROUND(
      current_cost * NEW.quantity,
      2
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "order_item_cost_snapshot_before_insert"
ON "OrderItem";

CREATE TRIGGER "order_item_cost_snapshot_before_insert"
BEFORE INSERT ON "OrderItem"
FOR EACH ROW
EXECUTE FUNCTION "snapshot_order_item_cost"();

-- Maintain ProductVariant.costPrice as a moving weighted-average cost when
-- purchase stock is received. The application updates PurchaseOrderItem
-- receivedQty before it increments ProductVariant.stock, so at trigger time
-- ProductVariant.stock still represents the pre-receipt quantity.
CREATE OR REPLACE FUNCTION "update_variant_weighted_average_cost"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  received_delta INTEGER;
  current_stock INTEGER;
  current_cost DECIMAL(10,2);
  incoming_cost DECIMAL(10,2);
  weighted_cost DECIMAL(10,2);
BEGIN
  received_delta := NEW."receivedQty" - OLD."receivedQty";

  IF received_delta <= 0 THEN
    RETURN NEW;
  END IF;

  incoming_cost := NEW."unitCost";

  SELECT stock, "costPrice"
  INTO current_stock, current_cost
  FROM "ProductVariant"
  WHERE id = NEW."variantId"
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  current_stock := GREATEST(current_stock, 0);

  IF current_cost IS NULL OR current_stock = 0 THEN
    weighted_cost := incoming_cost;
  ELSE
    weighted_cost := ROUND(
      (
        (current_stock * current_cost) +
        (received_delta * incoming_cost)
      ) /
      (current_stock + received_delta),
      2
    );
  END IF;

  UPDATE "ProductVariant"
  SET
    "costPrice" = weighted_cost,
    "updatedAt" = NOW()
  WHERE id = NEW."variantId";

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "purchase_receipt_weighted_cost_after_update"
ON "PurchaseOrderItem";

CREATE TRIGGER "purchase_receipt_weighted_cost_after_update"
AFTER UPDATE OF "receivedQty" ON "PurchaseOrderItem"
FOR EACH ROW
WHEN (NEW."receivedQty" > OLD."receivedQty")
EXECUTE FUNCTION "update_variant_weighted_average_cost"();
