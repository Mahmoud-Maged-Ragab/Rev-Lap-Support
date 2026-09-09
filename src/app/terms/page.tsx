import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { LEGAL_LAST_UPDATED, TERMS_SECTIONS } from "@/lib/legalContent";

export const metadata: Metadata = {
  title: "Terms of Service — Revenue Lab 360 Support",
  description: "Terms of Service for the Revenue Lab 360 Support platform.",
};

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms of Service"
      lastUpdated={LEGAL_LAST_UPDATED}
      sections={TERMS_SECTIONS}
    />
  );
}
