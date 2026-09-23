import type { Metadata } from "next";
import PolicyPage, {
  PolicySection,
} from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Shipping Policy",
  description:
    "Delivery, shipping charges and tracking information for AS Fashions orders.",
};

export default function ShippingPolicyPage() {
  return (
    <PolicyPage
      eyebrow="Delivery"
      title="Shipping Policy"
      intro="Shipping availability and charges are calculated according to the order, delivery location, campaign rules and the delivery services enabled by AS Fashions."
    >
      <PolicySection title="Serviceability">
        <p>
          Delivery is available only to locations supported by the store or its logistics partners. A pincode or address may be checked during checkout or shipment creation.
        </p>
      </PolicySection>

      <PolicySection title="Shipping charges">
        <p>
          Any applicable delivery charge is shown during checkout before the order is placed. Some orders or campaigns may offer free delivery, a fixed delivery charge or the store&apos;s normal delivery rules.
        </p>
      </PolicySection>

      <PolicySection title="Processing and delivery">
        <p>
          Orders may require payment verification, stock confirmation, packing and courier pickup before dispatch. Delivery estimates can vary by destination, courier network, weather, holidays and other operational conditions.
        </p>
      </PolicySection>

      <PolicySection title="Tracking">
        <p>
          When tracking information is available, it may be shown in your order details or provided through the contact information associated with your order.
        </p>
      </PolicySection>

      <PolicySection title="Delivery issues">
        <p>
          If tracking shows an unusual delay, delivery failure or another issue, contact AS Fashions with your order number. Address errors or unreachable contact details can delay or prevent delivery.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
