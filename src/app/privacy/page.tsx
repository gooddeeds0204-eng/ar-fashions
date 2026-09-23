import type { Metadata } from "next";
import PolicyPage, {
  PolicySection,
} from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How AS Fashions collects, uses and protects customer information.",
};

export default function PrivacyPage() {
  return (
    <PolicyPage
      eyebrow="Privacy"
      title="Privacy Policy"
      intro="This policy explains the information AS Fashions may collect when you browse, shop, create an account, place an order, apply as a reseller or participate in store campaigns."
    >
      <PolicySection title="Information we collect">
        <p>
          We may collect your name, phone number, email address, saved delivery addresses, account details, wishlist activity, order history and customer-support messages.
        </p>
        <p>
          For reseller applications, we may also collect business information, verification images or documents, and location information that you choose to provide as part of verification.
        </p>
      </PolicySection>

      <PolicySection title="Orders, payments and delivery">
        <p>
          We use order, product, address and payment-status information to process purchases, manage inventory, arrange delivery, handle cancellations, returns and refunds, and provide order support.
        </p>
        <p>
          Online payments may be processed by third-party payment providers. AS Fashions does not intentionally store your full card or banking credentials.
        </p>
      </PolicySection>

      <PolicySection title="Technical and campaign data">
        <p>
          We may process limited browser, device, network and security information to operate the website, prevent abuse, protect accounts and validate promotional or referral activity. Anti-abuse identifiers may be stored in hashed form.
        </p>
      </PolicySection>

      <PolicySection title="How we use information">
        <p>
          Information is used to provide the store, fulfil orders, verify reseller access, improve customer experience, provide support, prevent fraud or misuse, maintain security and meet legal or accounting requirements.
        </p>
      </PolicySection>

      <PolicySection title="Sharing of information">
        <p>
          We may share only the information needed with service providers such as payment processors, shipping or logistics partners, hosting providers and other vendors that help operate the store. We do not sell customer personal information as a standalone product.
        </p>
      </PolicySection>

      <PolicySection title="Retention and your choices">
        <p>
          We retain information for as long as reasonably needed for orders, support, security, accounting and legal obligations. You may contact AS Fashions to request correction of account information or to ask privacy questions.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
