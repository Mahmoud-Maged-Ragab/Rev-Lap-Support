/**
 * Content for /terms and /privacy — written specifically for this Platform
 * (see src/components/legal/LegalDocument.tsx for the shared rendering).
 *
 * Grounded in what the codebase actually does as of the date below (session
 * cookie in lib/auth.ts, language cookie in i18n/config.ts, saved-issues
 * cookie in lib/saved-issues.ts, Supabase-backed storage/DB, audit logging
 * in lib/audit.ts, role model in lib/permissions.ts) — not generic template
 * copy. Anywhere the codebase doesn't define a fact (legal entity details,
 * jurisdiction, retention periods, named infrastructure providers, contact
 * address), that's called out with a bracketed placeholder rather than
 * invented. Update this file, not the page components, to revise the text.
 */

export type LegalSection = {
  id: string;
  title: string;
  body: string[];
};

export const LEGAL_LAST_UPDATED = "September 8, 2026";

export const TERMS_SECTIONS: LegalSection[] = [
  {
    id: "introduction",
    title: "Introduction",
    body: [
      `Revenue Lab 360 Support (the "Platform") is a knowledge-base and support-issue tracking system used to document, search, and resolve support issues. These Terms of Service ("Terms") govern your access to and use of the Platform. By accessing or using the Platform, you agree to these Terms.`,
    ],
  },
  {
    id: "acceptance",
    title: "Acceptance of Terms",
    body: [
      "By accessing any part of the Platform — browsing documented issues or signing in with an authorized account — you confirm that you have read, understood, and agree to be bound by these Terms. If you do not agree, please do not use the Platform.",
    ],
  },
  {
    id: "use-of-service",
    title: "Use of the Service",
    body: [
      "Anyone can search and browse documented support issues, their descriptions, and their published solutions without creating an account. Creating, editing, or managing issues, categories, tags, and user accounts is restricted to authorized Support, Admin, and Owner accounts. You agree to use the Platform only for its intended purpose of accessing and managing support documentation.",
    ],
  },
  {
    id: "user-accounts",
    title: "User Accounts",
    body: [
      "Accounts on the Platform are issued internally by an Owner or Admin — there is no public self-registration. If you are issued an account, you are responsible for keeping your login credentials confidential and for activity that occurs under your account. Notify an administrator immediately if you suspect unauthorized access.",
    ],
  },
  {
    id: "user-responsibilities",
    title: "User Responsibilities",
    body: [
      "If your account can create or edit content, you agree to provide accurate information when documenting issues, to use the Platform in compliance with applicable law and your organization's internal policies, and not to attempt to circumvent role-based access controls or access data you are not authorized to view.",
    ],
  },
  {
    id: "support-content",
    title: "Support Content and Information",
    body: [
      `Issues, descriptions, solutions, attachments, and related material published on the Platform ("Support Content") are provided for informational and troubleshooting purposes. While accuracy is the goal, Support Content may not always be complete, current, or applicable to every situation.`,
    ],
  },
  {
    id: "intellectual-property",
    title: "Intellectual Property",
    body: [
      "The Platform's design, code, and branding — including the Revenue Lab 360 name and logo — belong to Revenue Lab 360 or its licensors. Support Content submitted by authorized users remains subject to your organization's internal policies. You may not copy, reproduce, or distribute the Platform's code or branding outside its intended use without permission.",
    ],
  },
  {
    id: "prohibited-activities",
    title: "Prohibited Activities",
    body: [
      "You agree not to attempt unauthorized access to accounts, data, or restricted areas of the Platform; upload malicious files through the attachment features; interfere with or disrupt the Platform's normal operation; or use automated tools to scrape or excessively query the Platform without authorization.",
    ],
  },
  {
    id: "third-party-services",
    title: "Third-Party Services",
    body: [
      "The Platform relies on third-party infrastructure — including a hosted database and file storage provider — to operate. Files you upload (images, PDFs, and documents) are stored with our storage provider and served through time-limited signed links rather than public URLs. We are not responsible for the availability of third-party infrastructure beyond our reasonable control.",
    ],
  },
  {
    id: "service-availability",
    title: "Service Availability",
    body: [
      "We aim to keep the Platform available and reliable, but we do not guarantee uninterrupted or error-free access. The Platform may be unavailable at times for maintenance, updates, or reasons outside our control.",
    ],
  },
  {
    id: "disclaimer",
    title: "Disclaimer of Warranties",
    body: [
      `The Platform and its content are provided "as is" and "as available," without warranties of any kind, express or implied, including warranties of accuracy, completeness, or fitness for a particular purpose.`,
    ],
  },
  {
    id: "limitation-of-liability",
    title: "Limitation of Liability",
    body: [
      "To the fullest extent permitted by applicable law, Revenue Lab 360 and those responsible for operating the Platform are not liable for indirect, incidental, or consequential damages arising from your use of, or inability to use, the Platform or its content.",
    ],
  },
  {
    id: "changes-to-service",
    title: "Changes to the Service",
    body: [
      "We may add, modify, or remove Platform features — including how issues, attachments, and accounts are managed — at any time in order to improve or maintain the Platform.",
    ],
  },
  {
    id: "changes-to-terms",
    title: "Changes to These Terms",
    body: [
      `We may update these Terms from time to time. When we do, we will update the "Last updated" date above. Continued use of the Platform after changes take effect constitutes acceptance of the revised Terms.`,
    ],
  },
  {
    id: "termination",
    title: "Termination",
    body: [
      "An Owner or Admin may suspend or disable any account that violates these Terms, misuses the Platform, or poses a risk to its security or other users.",
    ],
  },
  {
    id: "governing-law",
    title: "Governing Law",
    body: [
      "[Governing law and jurisdiction to be specified by Revenue Lab 360.] These Terms are intended to be interpreted under the law that applies to Revenue Lab 360's operations.",
    ],
  },
  {
    id: "contact",
    title: "Contact Information",
    body: [
      "Questions about these Terms should be directed to your Revenue Lab 360 administrator or the team responsible for managing this Platform. [Insert official contact email/address here.]",
    ],
  },
];

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    id: "introduction",
    title: "Introduction",
    body: [
      `This Privacy Policy explains how Revenue Lab 360 Support (the "Platform") handles information when you browse, search, or use it. It's written to reflect how this specific Platform actually operates, not generic boilerplate.`,
    ],
  },
  {
    id: "information-we-collect",
    title: "Information We Collect",
    body: [
      "We collect only what's described in this Policy: information you provide directly (such as login credentials, if you're issued an account), information collected automatically through a small number of cookies, and content created on the Platform (documented issues and their attachments).",
    ],
  },
  {
    id: "information-you-provide",
    title: "Information You Provide",
    body: [
      "If you're issued a Support, Admin, or Owner account, we store your email address and a securely hashed version of your password — your actual password is never stored in readable form. If you use the \"Saved Issues\" feature, the identifiers of the issues you save are stored in a cookie in your browser; no personal information is required to use it.",
    ],
  },
  {
    id: "information-automatic",
    title: "Information Collected Automatically",
    body: [
      "The Platform uses a small number of cookies to function: a session cookie for signed-in staff, a cookie that remembers your language preference, and a cookie that remembers issues you've saved. When a signed-in staff member creates, edits, or deletes content, we record standard technical information (such as IP address and browser user-agent) alongside that action, for accountability and security. We do not use third-party analytics, advertising, or tracking scripts on the Platform.",
    ],
  },
  {
    id: "how-we-use",
    title: "How We Use Information",
    body: [
      "We use this information to operate core features (sign-in, saved issues, language preference), to maintain security and accountability by recording who changed Platform content, and to maintain and improve the Platform.",
    ],
  },
  {
    id: "how-we-share",
    title: "How We Share Information",
    body: [
      "We do not sell information collected through the Platform. It may be accessible to authorized personnel who operate and maintain the Platform, and to the infrastructure providers described below who host it. We do not share information with third parties for marketing or advertising purposes.",
    ],
  },
  {
    id: "cookies",
    title: "Cookies and Similar Technologies",
    body: [
      "The Platform sets three cookies: an authentication session cookie (httpOnly, used only while you're signed in), a language-preference cookie, and a saved-issues cookie. The saved-issues cookie is read and written entirely by your browser — our server does not read or process its contents. You can clear or block cookies through your browser settings; doing so may sign you out, or reset your saved issues and language preference.",
    ],
  },
  {
    id: "data-storage-security",
    title: "Data Storage and Security",
    body: [
      "Platform data — issues, attachments, and account information — is stored using a hosted database and file storage provider. Uploaded files (images, PDFs, and documents) are kept in a private storage location and made available only through time-limited signed links rather than public URLs. Passwords are stored using one-way hashing; we cannot retrieve your original password.",
    ],
  },
  {
    id: "data-retention",
    title: "Data Retention",
    body: [
      "[Specific data retention periods have not been formally defined for this Platform.] In general, Support Content and account information are retained for as long as they remain relevant to the Platform's purpose, and are removed or archived at the discretion of an Owner or Admin.",
    ],
  },
  {
    id: "user-rights",
    title: "User Rights and Choices",
    body: [
      "If you hold an account, you may contact an Owner or Admin to review, correct, or request removal of your account information. If you're a visitor without an account, you can clear your saved-issues and language cookies at any time through your browser settings.",
    ],
  },
  {
    id: "third-party-services",
    title: "Third-Party Services",
    body: [
      "The Platform relies on a third-party hosted database and file storage provider to operate, and does not use third-party analytics or advertising services. [Specific provider name(s) can be added here if this information should be made public.]",
    ],
  },
  {
    id: "childrens-privacy",
    title: "Children's Privacy",
    body: [
      "The Platform is an internal support/knowledge-base tool and is not directed at children. We do not knowingly collect information from children.",
    ],
  },
  {
    id: "international-transfers",
    title: "International Data Transfers",
    body: [
      "[Specific hosting regions have not been documented for this Platform.] Depending on where our infrastructure providers operate, data may be processed or stored in a country other than your own.",
    ],
  },
  {
    id: "changes",
    title: "Changes to This Privacy Policy",
    body: [
      `We may update this Privacy Policy from time to time to reflect changes to the Platform. When we do, we will update the "Last updated" date above.`,
    ],
  },
  {
    id: "contact",
    title: "Contact Information",
    body: [
      "Questions about this Privacy Policy should be directed to your Revenue Lab 360 administrator or the team responsible for managing this Platform. [Insert official contact email/address here.]",
    ],
  },
];
