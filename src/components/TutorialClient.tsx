"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Icons,
  Lead,
  SubHeading,
  Card,
  CardGrid,
  Callout,
  Step,
  Steps,
  CheckList,
  RuleList,
  CanCannot,
  FlowDiagram,
  PermissionTable,
  PermissionRow,
  RefTable,
  RoleBadge,
  Pill,
  Code,
  Faq,
} from "@/components/tutorial/ui";

// Server-side check for authentication

// Client component for interactive features
type TutorialAuth = {
  authenticated: boolean;
  role: string | null;
  hasAccess: boolean;
};

export default function TutorialClient({ auth }: { auth: TutorialAuth }) {
  const router = useRouter();
  const t = useTranslations("tutorial");
  const [selectedRole, setSelectedRole] = useState<string | undefined>(
    undefined,
  );
  const [activeSection, setActiveSection] = useState<string>("quick-start");

  // Scroll to section when activeSection changes
  useEffect(() => {
    if (activeSection) {
      const element = document.getElementById(activeSection);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [activeSection]);

  // Check if user has access
  useEffect(() => {
    if (!auth.authenticated) {
      router.push("/admin/login");
    }
  }, [auth.authenticated, router]);

  // Define permission rows based on actual implementation
  const permissionRows: PermissionRow[] = [
    {
      action: "View Issues",
      support: "yes",
      admin: "yes",
      owner: "yes",
      note: "All roles can view issues",
    },
    {
      action: "Create Issues",
      support: "yes",
      admin: "yes",
      owner: "yes",
      note: "All roles can create issues",
    },
    {
      action: "Update Issues",
      support: "yes",
      admin: "yes",
      owner: "yes",
      note: "All roles can update issues",
    },
    {
      action: "Delete Issues",
      support: "no",
      admin: "partial",
      owner: "yes",
      note: "Only owner can delete issues, admin may have limited access",
    },
    {
      action: "Manage Users",
      support: "no",
      admin: "partial",
      owner: "yes",
      note: "Only owner and some admin levels can manage users",
    },
    {
      action: "Manage Categories",
      support: "no",
      admin: "yes",
      owner: "yes",
      note: "Support cannot manage categories",
    },
    {
      action: "Manage Tags",
      support: "no",
      admin: "yes",
      owner: "yes",
      note: "Support cannot manage tags",
    },
    {
      action: "View History",
      support: "no",
      admin: "yes",
      owner: "yes",
      note: "Only admin and owner can view issue history",
    },
    {
      action: "View Audit Logs",
      support: "no",
      admin: "yes",
      owner: "yes",
      note: "Only admin and owner can view audit logs",
    },
    {
      action: "Change User Roles",
      support: "no",
      admin: "no",
      owner: "yes",
      note: "Only owner can change user roles",
    },
    {
      action: "Create Admin Accounts",
      support: "no",
      admin: "no",
      owner: "yes",
      note: "Only owner can create admin accounts",
    },
  ];

  // FAQ items
  const faqItems = [
    {
      question: "I can't access a page. Why?",
      answer:
        "Access depends on your role and permissions. Owners have full access, admins have most permissions, and support members have limited access to specific functions.",
    },
    {
      question: "Why can't I delete an issue?",
      answer:
        "Only users with owner role can delete issues. This restriction ensures data integrity and prevents accidental loss of important information.",
    },
    {
      question: "When should I escalate an issue?",
      answer:
        "Escalate when an issue requires permissions, knowledge, or decisions beyond your role. Contact your admin or owner when you encounter limitations.",
    },
    {
      question: "Why are categories and tags important?",
      answer:
        "Categories and tags help organize and find issues efficiently. They provide structure to the knowledge base and enable effective search and filtering.",
    },
    {
      question: "Where can I see what changed?",
      answer:
        "Issue history and audit logs track all changes. Admins and owners can view these through dedicated pages in the admin panel.",
    },
    {
      question: "Who should I contact when something is wrong?",
      answer:
        "Contact your immediate supervisor or escalate through the hierarchy: Support → Admin → Owner, depending on the issue severity and your role.",
    },
  ];

  // Get quick start checklist based on role
  const getQuickStartChecklist = () => {
    if (selectedRole === "SUPPORT" || selectedRole === "support") {
      return [
        "Log in to the system",
        "Open the dashboard",
        "Review assigned/current issues",
        "Open an issue",
        "Understand its category/tags/status",
        "Work on the issue",
        "Update the necessary information",
        "Add notes/details when needed",
        "Update the status",
        "Escalate when necessary",
        "Verify the issue before finishing",
      ];
    } else if (selectedRole === "ADMIN" || selectedRole === "admin") {
      return [
        "Log in to the system",
        "Review dashboard statistics",
        "Review active issues",
        "Monitor Support activity",
        "Review categories/tags",
        "Review issue history when necessary",
        "Handle administrative tasks",
        "Review user activity",
        "Escalate important problems to Owner",
      ];
    } else if (selectedRole === "OWNER" || selectedRole === "owner") {
      return [
        "Log in to the system",
        "Review overall dashboard",
        "Monitor system health/activity",
        "Review users and roles",
        "Monitor Admin/Support activity",
        "Review issue history",
        "Review important statistics",
        "Handle Owner-only operations",
        "Ensure the support workflow is functioning correctly",
      ];
    }
    return [];
  };

  return (
    <div className="space-y-8">
      {/* Navigation */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-slate-200">
        <div className="w-full px-5 py-4 sm:px-6 lg:px-12 xl:px-20 2xl:px-32 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-ink-900">System Guide</h1>
            <p className="text-sm text-slate-600">
              Learn how to use the support management system
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700">Role:</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setSelectedRole("SUPPORT")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                    selectedRole === "SUPPORT" || selectedRole === "support"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Support
                </button>
                <button
                  onClick={() => setSelectedRole("ADMIN")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                    selectedRole === "ADMIN" || selectedRole === "admin"
                      ? "bg-blue-100 text-blue-800 border border-blue-200"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Admin
                </button>
                <button
                  onClick={() => setSelectedRole("OWNER")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                    selectedRole === "OWNER" || selectedRole === "owner"
                      ? "bg-violet-100 text-violet-800 border border-violet-200"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Owner
                </button>
              </div>
            </div>

            <button onClick={() => router.back()} className="btn !h-8 !text-xs">
              Back to App
            </button>
          </div>
        </div>

        {/* Table of Contents */}
        <div className="w-full px-5 py-2 sm:px-6 lg:px-12 xl:px-20 2xl:px-32 border-t border-slate-200 bg-slate-50">
          <div className="flex flex-wrap gap-2 text-xs">
            <a
              href="#quick-start"
              onClick={(e) => {
                e.preventDefault();
                setActiveSection("quick-start");
              }}
              className="px-2 py-1 rounded text-slate-600 hover:bg-slate-200 hover:text-ink-900"
            >
              Quick Start
            </a>
            <a
              href="#introduction"
              onClick={(e) => {
                e.preventDefault();
                setActiveSection("introduction");
              }}
              className="px-2 py-1 rounded text-slate-600 hover:bg-slate-200 hover:text-ink-900"
            >
              Introduction
            </a>
            <a
              href="#roles"
              onClick={(e) => {
                e.preventDefault();
                setActiveSection("roles");
              }}
              className="px-2 py-1 rounded text-slate-600 hover:bg-slate-200 hover:text-ink-900"
            >
              Roles
            </a>
            <a
              href="#issues"
              onClick={(e) => {
                e.preventDefault();
                setActiveSection("issues");
              }}
              className="px-2 py-1 rounded text-slate-600 hover:bg-slate-200 hover:text-ink-900"
            >
              Issues
            </a>
            <a
              href="#dashboard"
              onClick={(e) => {
                e.preventDefault();
                setActiveSection("dashboard");
              }}
              className="px-2 py-1 rounded text-slate-600 hover:bg-slate-200 hover:text-ink-900"
            >
              Dashboard
            </a>
            <a
              href="#categories-tags"
              onClick={(e) => {
                e.preventDefault();
                setActiveSection("categories-tags");
              }}
              className="px-2 py-1 rounded text-slate-600 hover:bg-slate-200 hover:text-ink-900"
            >
              Categories & Tags
            </a>
            <a
              href="#history"
              onClick={(e) => {
                e.preventDefault();
                setActiveSection("history");
              }}
              className="px-2 py-1 rounded text-slate-600 hover:bg-slate-200 hover:text-ink-900"
            >
              History
            </a>
            <a
              href="#user-management"
              onClick={(e) => {
                e.preventDefault();
                setActiveSection("user-management");
              }}
              className="px-2 py-1 rounded text-slate-600 hover:bg-slate-200 hover:text-ink-900"
            >
              User Mgmt
            </a>
            <a
              href="#faq"
              onClick={(e) => {
                e.preventDefault();
                setActiveSection("faq");
              }}
              className="px-2 py-1 rounded text-slate-600 hover:bg-slate-200 hover:text-ink-900"
            >
              FAQ
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4">
        {/* New Member Quick Start */}
        <section id="quick-start" className="mb-10">
          <Card title="New here? Start here →" icon="rocket" accent>
            <div className="space-y-4">
              <Steps>
                <Step n={1} title="Understand your role">
                  <p>Learn what your role allows you to do in the system</p>
                </Step>
                <Step n={2} title="Learn the dashboard">
                  <p>
                    Understand the statistics and information available to you
                  </p>
                </Step>
                <Step n={3} title="Learn how issues work">
                  <p>Understand the issue lifecycle and management process</p>
                </Step>
                <Step n={4} title="Learn your permissions">
                  <p>Know what actions you can and cannot perform</p>
                </Step>
                <Step n={5} title="Start handling issues">
                  <p>Begin working with issues according to your role</p>
                </Step>
              </Steps>

              {selectedRole && (
                <div className="mt-6">
                  <SubHeading>
                    Quick Start Checklist for{" "}
                    {selectedRole === "SUPPORT" || selectedRole === "support"
                      ? "Support"
                      : selectedRole === "ADMIN" || selectedRole === "admin"
                        ? "Admin"
                        : "Owner"}
                  </SubHeading>
                  <CheckList items={getQuickStartChecklist()} />
                </div>
              )}
            </div>
          </Card>
        </section>

        {/* Before You Start Section */}
        <section id="before-you-start" className="mb-10">
          <Card title="Before You Start" icon="alert" accent>
            <RuleList
              items={[
                "Always verify the issue before changing information.",
                "Do not modify information unnecessarily.",
                "Use the correct category and tags.",
                "Keep issue information clear and accurate.",
                "Do not share account credentials.",
                "Do not perform actions outside your permissions.",
                "Escalate issues when you are unsure.",
                "Review issue history before making decisions when necessary.",
                "Never delete information unless you are authorized and it is required.",
                "Keep customer information confidential.",
              ]}
            />
          </Card>
        </section>

        {/* Introduction Section */}
        <section id="introduction" className="mb-10">
          <h2 className="text-2xl font-bold text-ink-900 mb-2">Introduction</h2>
          <Lead>
            The support management system helps organizations document, track,
            and resolve customer issues efficiently.
          </Lead>

          <Card title="What the System Does">
            <p className="text-slate-700">
              This platform serves as a centralized knowledge base where support
              teams can document common issues, their symptoms, and solutions.
              It enables consistent problem resolution across teams and
              preserves institutional knowledge.
            </p>
          </Card>

          <Card title="How It Works" icon="flow">
            <FlowDiagram
              steps={[
                { title: "Customer / Issue", caption: "Problem occurs" },
                { title: "Support", caption: "Handles issue" },
                { title: "Admin", caption: "Reviews & manages" },
                { title: "Owner", caption: "Oversees system" },
              ]}
            />
            <p className="mt-3 text-sm text-slate-600">
              The exact workflow depends on permissions and the type of issue.
              Different roles have different responsibilities.
            </p>
          </Card>
        </section>

        {/* Roles & Permissions Section */}
        <section id="roles" className="mb-10">
          <h2 className="text-2xl font-bold text-ink-900 mb-2">
            Roles & Permissions
          </h2>
          <Lead>
            Understanding your role is crucial for proper system usage.
          </Lead>

          <div className="space-y-6">
            <Card title="Support" icon="shield">
              <p className="mb-3 text-slate-700">
                Support members are primarily responsible for handling customer
                issues and maintaining the knowledge base.
              </p>

              <CanCannot
                can={[
                  "Handling customer issues",
                  "Viewing issues assigned to them",
                  "Updating issue information",
                  "Adding notes or relevant information",
                  "Changing issue status when permitted",
                  "Working with tags/categories when permitted",
                  "Escalating issues when necessary",
                  "Keeping issue information accurate",
                  "Following the organization's support workflow",
                ]}
                cannot={[
                  "Delete issues (if current permission system prevents it)",
                  "Manage users",
                  "Manage system-wide settings",
                  "Perform Owner-only actions",
                  "Access administrative functionality unless explicitly permitted",
                ]}
              />
            </Card>

            <Card title="Admin" icon="grid">
              <p className="mb-3 text-slate-700">
                Admins are responsible for managing the support operation and
                overseeing content.
              </p>

              <CanCannot
                can={[
                  "Managing issues",
                  "Reviewing support activity",
                  "Managing categories",
                  "Managing tags",
                  "Monitoring issue status",
                  "Reviewing issue history",
                  "Supporting Support members",
                  "Managing relevant system data",
                  "Performing administrative actions allowed by current permission system",
                ]}
                cannot={[
                  "Manage users (limited access compared to Owner)",
                  "Perform Owner-only actions",
                  "Access Owner-only functionality",
                ]}
              />
            </Card>

            <Card title="Owner" icon="star">
              <p className="mb-3 text-slate-700">
                Owner has the highest level of access and is responsible for
                system oversight.
              </p>

              <CanCannot
                can={[
                  "Full system visibility",
                  "Managing users",
                  "Managing Admins and Support members",
                  "Monitoring system activity",
                  "Reviewing statistics",
                  "Managing important system-level settings",
                  "Reviewing issue history",
                  "Supervising Admin and Support activity",
                  "Performing Owner-only actions",
                ]}
                cannot={[
                  "Nothing - full system access",
                  "Should perform actions carefully as they affect the entire system",
                ]}
              />
            </Card>
          </div>

          <Card title="Permission Matrix" icon="grid">
            <PermissionTable rows={permissionRows} highlight={selectedRole} />
          </Card>
        </section>

        {/* How the Issue System Works */}
        <section id="issues" className="mb-10">
          <h2 className="text-2xl font-bold text-ink-900 mb-2">
            How the Issue System Works
          </h2>
          <Lead>
            Understanding the complete issue lifecycle is essential for
            effective support management.
          </Lead>

          <Card title="Issue Lifecycle" icon="flow">
            <Steps>
              <Step n={1} title="Issue Created">
                <p>
                  An issue enters the system either through manual creation by a
                  team member or automatic import from customer support
                  channels.
                </p>
              </Step>
              <Step n={2} title="Issue Reviewed">
                <p>
                  Support members review the issue to understand its nature and
                  determine the appropriate response.
                </p>
              </Step>
              <Step n={3} title="Issue Categorized">
                <p>
                  The issue is classified with appropriate categories and tags
                  for easy identification and searchability.
                </p>
              </Step>
              <Step n={4} title="Issue Worked On">
                <p>
                  Support members investigate, troubleshoot, and document the
                  solution for the issue.
                </p>
              </Step>
              <Step n={5} title="Issue Updated">
                <p>
                  Changes and progress are recorded in the system to maintain a
                  complete history.
                </p>
              </Step>
              <Step n={6} title="Issue Resolved">
                <p>
                  Once the issue is fully addressed, it's marked as resolved
                  with the solution documented.
                </p>
              </Step>
              <Step n={7} title="History Recorded">
                <p>
                  All important changes are tracked through the issue
                  history/audit system for future reference.
                </p>
              </Step>
            </Steps>
          </Card>

          <Card title="Managing Issues" icon="file">
            <ul className="space-y-2 text-slate-700">
              <li>
                <strong>Find an issue:</strong> Use the search bar or browse
                through categories and tags
              </li>
              <li>
                <strong>Search/filter issues:</strong> Use keywords, categories,
                tags, or date ranges
              </li>
              <li>
                <strong>Open an issue:</strong> Click on any issue title to view
                its details
              </li>
              <li>
                <strong>Understand issue information:</strong> Review the
                problem description, error messages, and solution
              </li>
              <li>
                <strong>Update an issue:</strong> Use the edit function
                (available based on your permissions)
              </li>
              <li>
                <strong>Change status:</strong> Update the issue status as work
                progresses
              </li>
              <li>
                <strong>Use categories:</strong> Assign appropriate categories
                to group related issues
              </li>
              <li>
                <strong>Use tags:</strong> Add relevant tags for better
                searchability
              </li>
              <li>
                <strong>Add/update information:</strong> Keep all details
                current and accurate
              </li>
              <li>
                <strong>Issue history:</strong> Track all changes made to the
                issue over time
              </li>
            </ul>
          </Card>
        </section>

        {/* Dashboard Section */}
        <section id="dashboard" className="mb-10">
          <h2 className="text-2xl font-bold text-ink-900 mb-2">
            Understanding the Dashboard
          </h2>
          <Lead>
            Your dashboard provides key insights into system activity and
            performance.
          </Lead>

          <CardGrid cols={3}>
            <Card title="Total Users" icon="users">
              <p className="text-slate-700">
                Shows the total number of users in the system
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Indicates system adoption and team size
              </p>
            </Card>
            <Card title="Role Distribution" icon="userCog">
              <p className="text-slate-700">
                Breakdown of users by role (Owner, Admin, Support)
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Helps understand team composition and permissions
              </p>
            </Card>
            <Card title="Total Issues" icon="file">
              <p className="text-slate-700">
                Total number of issues documented in the system
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Indicates knowledge base size and coverage
              </p>
            </Card>
            <Card title="Categories" icon="tag">
              <p className="text-slate-700">
                Number of categories for organizing issues
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Reflects organizational structure of support topics
              </p>
            </Card>
            <Card title="Tags" icon="tag">
              <p className="text-slate-700">
                Number of tags available for issues
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Indicates granularity of issue classification
              </p>
            </Card>
            <Card title="Activity Metrics" icon="chart">
              <p className="text-slate-700">
                User activity and issue engagement statistics
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Shows system usage and effectiveness
              </p>
            </Card>
          </CardGrid>
        </section>

        {/* Categories & Tags Section */}
        <section id="categories-tags" className="mb-10">
          <h2 className="text-2xl font-bold text-ink-900 mb-2">
            Categories & Tags
          </h2>
          <Lead>
            Proper use of categories and tags is essential for effective issue
            management.
          </Lead>

          <CardGrid cols={2}>
            <Card title="Categories" icon="tag">
              <p className="text-slate-700">
                Used to classify the general type of issue
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Examples: Technical, Billing, Account, Security
              </p>
              <p className="text-sm mt-3">
                Categories provide broad groupings that help organize issues
                into major topic areas. They are typically managed by Admins and
                Owners.
              </p>
            </Card>
            <Card title="Tags" icon="tag">
              <p className="text-slate-700">
                Used to provide additional labels/details
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Examples: Urgent, Customer-Facing, Backend, API
              </p>
              <p className="text-sm mt-3">
                Tags offer granular labeling that can be applied by all roles.
                They help with detailed searching and filtering.
              </p>
            </Card>
          </CardGrid>

          <Callout tone="tip" title="Best Practices">
            <p>
              Use categories for major topic areas and tags for specific
              attributes. Consistent naming helps maintain searchability.
            </p>
          </Callout>
        </section>

        {/* Issue History / Audit Trail Section */}
        <section id="history" className="mb-10">
          <h2 className="text-2xl font-bold text-ink-900 mb-2">
            Issue History / Audit Trail
          </h2>
          <Lead>
            Tracking changes is important for accountability and learning.
          </Lead>

          <Card title="What is Issue History?" icon="history">
            <p className="text-slate-700 mb-3">
              Issue history records all changes made to issues over time,
              including who made the changes and what was modified.
            </p>
            <ul className="space-y-2 text-slate-700">
              <li>
                <strong>What it tracks:</strong> Issue creation, updates, and
                deletions
              </li>
              <li>
                <strong>Who can view:</strong> Admins and Owners can view full
                history
              </li>
              <li>
                <strong>Why it matters:</strong> Provides accountability and
                helps understand issue evolution
              </li>
              <li>
                <strong>When to use:</strong> When investigating how an issue
                changed over time
              </li>
            </ul>
          </Card>

          <Callout tone="important" title="For Admins and Owners">
            <p>
              Regularly review issue history to ensure proper procedures are
              followed and to identify patterns in support activities.
            </p>
          </Callout>
        </section>

        {/* User Management Section */}
        <section id="user-management" className="mb-10">
          <h2 className="text-2xl font-bold text-ink-900 mb-2">
            User Management
          </h2>
          <Lead>
            Understanding how user accounts and roles are managed in the system.
          </Lead>

          <Card title="User Account Types" icon="users">
            <RefTable
              headers={["Role", "Description", "Permissions"]}
              rows={[
                [
                  <RoleBadge role="SUPPORT" />,
                  "Support members",
                  "Handle issues and maintain knowledge base",
                ],
                [
                  <RoleBadge role="ADMIN" />,
                  "Admins",
                  "Manage content and support operations",
                ],
                [
                  <RoleBadge role="OWNER" />,
                  "Owner",
                  "Full system access and control",
                ],
              ]}
            />
          </Card>

          <Card title="Role Hierarchy" icon="grid">
            <FlowDiagram
              steps={[
                { title: "User", caption: "Basic access" },
                { title: "Support", caption: "Issue handling" },
                { title: "Admin", caption: "Content management" },
                { title: "Owner", caption: "Full control" },
              ]}
            />
          </Card>

          <Callout tone="warning" title="Permission Guidelines">
            <p>
              Do not give permissions unnecessarily. Always follow the principle
              of least privilege - give users only the permissions they need to
              perform their duties.
            </p>
          </Callout>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="mb-10">
          <h2 className="text-2xl font-bold text-ink-900 mb-2">
            Frequently Asked Questions
          </h2>
          <Lead>Common questions and answers about using the system.</Lead>

          <div className="space-y-3">
            {faqItems.map((faq, index) => (
              <Faq key={index} question={faq.question}>
                {faq.answer}
              </Faq>
            ))}
          </div>
        </section>

        {/* Role-Based Guidance */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-ink-900 mb-2">
            What Should I Do?
          </h2>
          <Lead>Role-specific guidance for getting started.</Lead>

          <div className="grid gap-4 md:grid-cols-3">
            <Card title="For Support Members" icon="shield">
              <CheckList
                items={[
                  "Log in to the system",
                  "Review assigned/current issues",
                  "Open an issue and understand its details",
                  "Work on the issue following company procedures",
                  "Update necessary information",
                  "Escalate when necessary",
                  "Verify before marking as complete",
                ]}
              />
            </Card>

            <Card title="For Admin Members" icon="grid">
              <CheckList
                items={[
                  "Review dashboard statistics",
                  "Monitor active issues",
                  "Oversee support activities",
                  "Manage categories and tags",
                  "Review issue history when needed",
                  "Handle administrative tasks",
                  "Escalate important issues to Owner",
                ]}
              />
            </Card>

            <Card title="For Owner Members" icon="star">
              <CheckList
                items={[
                  "Review overall system health",
                  "Monitor all activities",
                  "Manage users and roles",
                  "Review system statistics",
                  "Ensure proper workflows",
                  "Handle critical issues",
                  "Maintain system integrity",
                ]}
              />
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
