import type { Metadata } from "next";
import PolicyPage, {
  PolicySection,
} from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Returns & Refunds",
  description:
    "AS Fashions returns, cancellations and refund policy.",
};

export default function ReturnsRefundsPage() {
  return (
    <PolicyPage
      eyebrow="Customer Care"
      title="Returns & Refunds"
      intro="We aim to resolve eligible order issues fairly. Return, cancellation and refund eligibility depends on the item, its condition and the current order status."
    >
      <PolicySection title="Before dispatch">
        <p>
          If an order has not entered shipment processing, a cancellation may be possible. Once packing, pickup or shipping has started, cancellation may no longer be available.
        </p>
      </PolicySection>

      <PolicySection title="Return eligibility">
        <p>
          An approved return should normally be unused, unworn, unwashed and in its original condition with tags, packaging and included accessories where applicable.
        </p>
        <p>
          Items may be non-returnable where this is disclosed for the product or order, or where return is unsuitable because of hygiene, customization, bulk/reseller conditions, damage caused after delivery or other reasonable product-specific restrictions.
        </p>
      </PolicySection>

      <PolicySection title="Wrong, damaged or missing items">
        <p>
          Contact AS Fashions promptly with the order number and clear photos or other requested evidence if you receive a wrong item, a materially damaged item or an incomplete shipment.
        </p>
      </PolicySection>

      <PolicySection title="Refund method">
        <p>
          Approved online-payment refunds are generally returned through the original payment channel where supported. For Cash on Delivery or cases where the original channel cannot be used, AS Fashions may request suitable refund details.
        </p>
      </PolicySection>

      <PolicySection title="Refund timing">
        <p>
          AS Fashions may initiate a refund after the return or cancellation is approved and, where applicable, after the returned item is received and checked. Bank or payment-provider processing time can continue after the refund is initiated.
        </p>
      </PolicySection>

      <PolicySection title="How to request help">
        <p>
          Use the Contact page or the support details shown on the website. Keep your order number available so the team can review the correct order.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
