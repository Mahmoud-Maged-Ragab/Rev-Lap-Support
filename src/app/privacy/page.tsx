import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { LEGAL_LAST_UPDATED, PRIVACY_SECTIONS } from "@/lib/legalContent";

export const metadata: Metadata = {
  title: "Privacy Policy — Revenue Lab 360 Support",
  description: "Privacy Policy for the Revenue Lab 360 Support platform.",
};

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      lastUpdated={LEGAL_LAST_UPDATED}
      sections={PRIVACY_SECTIONS}
    />
  );
}
