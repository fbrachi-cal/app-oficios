import React, { useEffect } from "react";
import { Link } from "react-router-dom";

const CONTACT_EMAIL = "federico.brachi@calconsultora.com.ar";
const WEBSITE_URL = "https://www.casaclick.ar";
const LAST_UPDATED = "October 2026";

type Section = {
  id: string;
  title: string;
  content: React.ReactNode;
};

const List: React.FC<{ items: React.ReactNode[] }> = ({ items }) => (
  <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
    {items.map((item, i) => (
      <li key={i}>{item}</li>
    ))}
  </ul>
);

const Sub: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-3">
    <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
    {children}
  </div>
);

const P: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-slate-600 leading-relaxed">{children}</p>
);

const EmailLink = () => (
  <a
    href={`mailto:${CONTACT_EMAIL}`}
    className="font-medium text-blue-600 hover:text-blue-700 underline underline-offset-2 break-all"
  >
    {CONTACT_EMAIL}
  </a>
);

const sections: Section[] = [
  {
    id: "information-we-collect",
    title: "1. Information We Collect",
    content: (
      <>
        <P>Depending on how you use CasaClick, we may collect the following information:</P>
        <Sub title="Account Information">
          <List
            items={[
              "Name",
              "Email address",
              "Phone number",
              "Authentication identifiers associated with your account",
            ]}
          />
        </Sub>
        <Sub title="Authentication Information">
          <P>CasaClick uses Firebase Authentication to manage user sign-in and account access.</P>
          <P>Depending on the authentication method you choose, authentication may be performed using:</P>
          <List
            items={[
              "Email and password",
              "Phone number verification",
              "Google Sign-In",
              "Other supported authentication providers",
            ]}
          />
          <P>
            When you use Google Sign-In, CasaClick may receive basic account information made available
            by Google, such as your name, email address, profile image, and Google account identifier.
          </P>
          <P>CasaClick does not receive or store your Google account password.</P>
        </Sub>
        <Sub title="Profile and Service Information">
          <P>
            If you use CasaClick as a customer or service professional, we may collect information
            necessary to provide the platform's functionality, such as:
          </P>
          <List
            items={[
              "User role",
              "Professional profile information",
              "Services or trades offered",
              "Service requests",
              "Ratings and reviews",
              "Information related to interactions between customers and professionals",
            ]}
          />
        </Sub>
        <Sub title="Device and Notification Information">
          <P>
            If you enable push notifications, CasaClick may process device notification tokens and
            related technical information required to deliver notifications.
          </P>
        </Sub>
        <Sub title="Technical Information">
          <P>
            We may automatically collect limited technical information necessary to operate and secure
            the application, such as:
          </P>
          <List
            items={[
              "Device and application information",
              "Authentication and session information",
              "Error and diagnostic information",
              "Security-related events",
            ]}
          />
        </Sub>
      </>
    ),
  },
  {
    id: "how-we-use-information",
    title: "2. How We Use Information",
    content: (
      <>
        <P>We use personal information to:</P>
        <List
          items={[
            "Create and manage user accounts",
            "Authenticate users and protect account access",
            "Connect customers with service professionals",
            "Process and display service requests",
            "Enable communication and interactions related to requested services",
            "Send relevant application and service notifications",
            "Maintain ratings and reviews",
            "Provide customer support",
            "Diagnose technical problems",
            "Protect CasaClick, its users, and its services against fraud, abuse, and unauthorized access",
            "Improve the reliability and functionality of the application",
          ]}
        />
      </>
    ),
  },
  {
    id: "third-party-services",
    title: "3. Third-Party Services",
    content: (
      <>
        <P>
          CasaClick uses third-party technology providers to operate parts of the service. These may
          include:
        </P>
        <Sub title="Google Firebase">
          <P>Firebase may be used for:</P>
          <List
            items={[
              "Authentication",
              "Database and application data storage",
              "Push notifications",
              "Application infrastructure and related services",
            ]}
          />
          <P>Google processes information according to its own privacy policies and applicable service terms.</P>
        </Sub>
        <Sub title="Google Sign-In">
          <P>
            If you choose to sign in with Google, Google processes your authentication request and
            provides CasaClick with the account information you authorize.
          </P>
          <P>We do not sell your Google user data.</P>
          <P>
            We use information obtained through Google APIs only to provide and improve user-facing
            features related to authentication and account access.
          </P>
        </Sub>
      </>
    ),
  },
  {
    id: "sharing-of-information",
    title: "4. Sharing of Information",
    content: (
      <>
        <P>CasaClick does not sell personal information.</P>
        <P>We may share information only when necessary:</P>
        <List
          items={[
            "With service providers that help us operate the platform",
            "Between customers and professionals when required to provide the requested service",
            "To comply with applicable laws, legal processes, or governmental requests",
            "To protect the rights, security, and integrity of CasaClick and its users",
          ]}
        />
        <P>Service providers are expected to process information only as necessary to provide their services.</P>
      </>
    ),
  },
  {
    id: "data-retention",
    title: "5. Data Retention",
    content: (
      <>
        <P>We retain personal information for as long as reasonably necessary to:</P>
        <List
          items={[
            "Provide the CasaClick service",
            "Maintain user accounts",
            "Comply with legal obligations",
            "Resolve disputes",
            "Prevent fraud or abuse",
            "Enforce applicable agreements",
          ]}
        />
        <P>
          Retention periods may vary depending on the type of information and the purpose for which it
          is processed.
        </P>
      </>
    ),
  },
  {
    id: "data-security",
    title: "6. Data Security",
    content: (
      <>
        <P>
          We use reasonable technical and organizational measures designed to protect personal
          information against unauthorized access, alteration, disclosure, or destruction.
        </P>
        <P>
          However, no method of electronic transmission or storage can be guaranteed to be completely
          secure.
        </P>
      </>
    ),
  },
  {
    id: "your-rights",
    title: "7. Your Rights and Choices",
    content: (
      <>
        <P>Depending on applicable law, you may have the right to:</P>
        <List
          items={[
            "Access personal information associated with your account",
            "Request correction of inaccurate information",
            "Request deletion of your account or personal information",
            "Withdraw certain permissions",
            "Stop receiving non-essential notifications",
          ]}
        />
        <P>
          To exercise these rights or ask questions about your information, contact us using the details
          below.
        </P>
      </>
    ),
  },
  {
    id: "account-deletion",
    title: "8. Account and Data Deletion",
    content: (
      <>
        <P>Users may request deletion of their CasaClick account and associated personal information.</P>
        <P>
          To request account or data deletion, contact: <EmailLink />
        </P>
        <P>
          We may retain limited information where required by law, for security purposes, fraud
          prevention, dispute resolution, or other legitimate obligations.
        </P>
      </>
    ),
  },
  {
    id: "childrens-privacy",
    title: "9. Children's Privacy",
    content: (
      <>
        <P>
          CasaClick is not intended for children who are not legally able to enter into service
          arrangements under applicable law.
        </P>
        <P>
          We do not knowingly collect personal information from children in violation of applicable
          legal requirements.
        </P>
      </>
    ),
  },
  {
    id: "changes",
    title: "10. Changes to This Privacy Policy",
    content: (
      <>
        <P>We may update this Privacy Policy from time to time.</P>
        <P>
          When changes are made, the updated policy will be published on this page and the "Last
          updated" date will be revised.
        </P>
      </>
    ),
  },
  {
    id: "contact",
    title: "11. Contact",
    content: (
      <>
        <P>
          If you have questions about this Privacy Policy or how CasaClick handles personal information,
          contact:
        </P>
        <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5 space-y-2 text-slate-700">
          <p className="font-semibold text-slate-900">CasaClick</p>
          <p>
            <span className="text-slate-500">Email: </span>
            <EmailLink />
          </p>
          <p>
            <span className="text-slate-500">Website: </span>
            <a
              href={WEBSITE_URL}
              className="font-medium text-blue-600 hover:text-blue-700 underline underline-offset-2"
            >
              {WEBSITE_URL}
            </a>
          </p>
        </div>
      </>
    ),
  },
];

const PrivacyPolicyPage: React.FC = () => {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Privacy Policy | CasaClick";
    window.scrollTo(0, 0);
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" lang="en">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 min-w-0" aria-label="CasaClick home">
            <img src="/logo.png" alt="" className="h-8 w-8 rounded-lg" />
            <span className="text-lg font-bold text-slate-900 truncate">CasaClick</span>
          </Link>
          <Link
            to="/"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap"
          >
            ← Back to home
          </Link>
        </div>
      </header>

      <main className="flex-1 py-8 sm:py-12">
        <article className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-10 md:p-12">
            <header className="mb-8 pb-8 border-b border-slate-100">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mb-3">
                CasaClick Privacy Policy
              </h1>
              <p className="text-sm font-medium text-slate-500">Last updated: {LAST_UPDATED}</p>
              <div className="mt-6 space-y-4">
                <P>
                  CasaClick respects your privacy and is committed to protecting the personal
                  information you provide when using our application and services.
                </P>
                <P>
                  This Privacy Policy explains what information we collect, how we use it, how it may be
                  shared, and the choices available to you.
                </P>
              </div>
            </header>

            <nav aria-label="Table of contents" className="mb-10 rounded-2xl bg-slate-50 border border-slate-100 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">Contents</h2>
              <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                {sections.map((s) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="text-slate-700 hover:text-blue-600">
                      {s.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            <div className="space-y-10">
              {sections.map((s) => (
                <section key={s.id} id={s.id} className="scroll-mt-6 space-y-4">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{s.title}</h2>
                  {s.content}
                </section>
              ))}
            </div>
          </div>
        </article>
      </main>

      <footer className="py-6 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} CasaClick ·{" "}
        <a href="https://www.calconsultora.com.ar" className="hover:text-slate-800">
          Cal Consultora
        </a>
      </footer>
    </div>
  );
};

export default PrivacyPolicyPage;
