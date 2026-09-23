import type { Metadata } from "next";
import PolicyPage, {
  PolicySection,
} from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about AS Fashions retail and reseller shopping.",
};

export default function AboutPage() {
  return (
    <PolicyPage
      eyebrow="Our Store"
      title="About AS Fashions"
      intro="AS Fashions is an online fashion store built for both everyday retail shopping and approved reseller or bulk buying."
    >
      <PolicySection title="Retail shopping">
        <p>
          Customers can discover fashion across women, men and kids collections, save favourites, choose available variants, place orders and track their purchases from one account.
        </p>
      </PolicySection>

      <PolicySection title="Reseller access">
        <p>
          Approved resellers can access wholesale-oriented pricing, minimum-order rules and reseller collections designed for bulk purchasing and resale.
        </p>
      </PolicySection>

      <PolicySection title="Our approach">
        <p>
          The store is designed around curated products, transparent pricing, inventory-aware ordering, customer support and a consistent shopping experience from product discovery through delivery.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
