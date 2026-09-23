import type { Metadata } from "next";
import PolicyPage, {
  PolicySection,
} from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "Terms governing use of the AS Fashions online store.",
};

export default function TermsPage() {
  return (
    <PolicyPage
      eyebrow="Terms"
      title="Terms & Conditions"
      intro="By using the AS Fashions website or placing an order, you agree to these store terms together with the policies linked from this page."
    >
      <PolicySection title="Store and account use">
        <p>
          You must provide accurate information when creating an account, saving an address, placing an order or applying for reseller access. You are responsible for activity performed through your account or device.
        </p>
      </PolicySection>

      <PolicySection title="Products, prices and availability">
        <p>
          Product descriptions, images, sizes, colours, stock, prices, discounts and offers may change. Display colours can vary by screen and lighting. An item shown online is not guaranteed to remain in stock until the order is successfully accepted.
        </p>
      </PolicySection>

      <PolicySection title="Orders and payment">
        <p>
          Orders are subject to stock, serviceability, payment verification and store acceptance. Cash on Delivery is available only when enabled and eligible. Online-payment orders may remain pending until the payment provider confirms payment.
        </p>
      </PolicySection>

      <PolicySection title="Retail and reseller shopping">
        <p>
          Retail and reseller pricing may differ. Reseller access can require application and approval, and reseller products may have minimum order quantities or other bulk-order conditions.
        </p>
      </PolicySection>

      <PolicySection title="Offers and referrals">
        <p>
          Promotional campaigns may have start and end times, stock limits, referral requirements, one-claim limits, delivery charges or other stated conditions. Self-referrals, duplicate referrals, automated activity or other attempts to manipulate an offer may be rejected.
        </p>
      </PolicySection>

      <PolicySection title="Cancellations, returns and refunds">
        <p>
          Eligibility is governed by the Returns & Refunds Policy and the status of the specific order. Refund processing can also depend on the payment provider, bank or delivery stage.
        </p>
      </PolicySection>

      <PolicySection title="Changes">
        <p>
          AS Fashions may update these terms when store features, business processes or legal requirements change. The latest version published on this website applies from its stated update date.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
