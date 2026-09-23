import type { Metadata } from "next";
import PolicyPage, {
  PolicySection,
} from "@/components/PolicyPage";
import ContactDetails from "@/components/ContactDetails";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Contact AS Fashions customer support.",
};

export default function ContactPage() {
  return (
    <PolicyPage
      eyebrow="Support"
      title="Contact AS Fashions"
      intro="For product, order, delivery, return, payment or reseller questions, use the current support channels below."
    >
      <PolicySection title="Customer support">
        <ContactDetails />
      </PolicySection>

      <PolicySection title="When contacting us">
        <p>
          For an existing order, include your order number. For product or delivery questions, include the relevant product name, pincode or other details that help the team check the request accurately.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
