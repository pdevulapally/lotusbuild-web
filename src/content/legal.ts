export type LegalSection = {id: string; heading: string; paragraphs: string[]; points?: string[]};
export type LegalDocument = {eyebrow: string; title: string; updated: string; summary: string; sections: LegalSection[]};

export const TERMS: LegalDocument = {
  eyebrow: "Terms of Service",
  title: "The terms for building with LotusBuild.",
  updated: "12 October 2026",
  summary: "These terms explain what you can expect from LotusBuild, what we expect from you, and how plans, payments and your projects work.",
  sections: [
    {id: "agreement", heading: "Agreement", paragraphs: [
      "By creating an account or using LotusBuild you agree to these terms and to our Privacy Policy. If you use LotusBuild on behalf of an organisation, you confirm you are authorised to accept these terms for it.",
      "You must be at least 18, or the age of majority where you live, to use LotusBuild.",
    ]},
    {id: "accounts", heading: "Your account", paragraphs: [
      "You are responsible for keeping your sign-in details secure and for everything done through your account. Tell us promptly if you believe your account has been accessed without permission.",
      "Keep your account information accurate. We may require a verified email address before you can start builds or subscribe.",
    ]},
    {id: "service", heading: "The service", paragraphs: [
      "LotusBuild uses an AI agent to plan, write and run software in an isolated cloud sandbox, with a live preview you can watch. Features, models and limits depend on your plan and may change as the product develops.",
      "Sandboxes and previews are temporary development environments. They are not production hosting, and their contents can be stopped or reset when a session ends or a limit is reached.",
    ]},
    {id: "acceptable-use", heading: "Acceptable use", paragraphs: ["You agree not to use LotusBuild to:"], points: [
      "Build or run malware, credential harvesters, phishing pages or anything designed to harm people or systems.",
      "Access, probe or attack systems or data you are not authorised to use, including LotusBuild's own infrastructure.",
      "Mine cryptocurrency, send spam, or run workloads unrelated to building software.",
      "Generate unlawful content, or content that infringes someone else's rights.",
      "Circumvent plan limits, rate limits, sandbox isolation or other security controls.",
    ]},
    {id: "content", heading: "Your content and code", paragraphs: [
      "You keep ownership of your prompts, files and the code LotusBuild generates for you. You grant us the limited permission needed to store, process and run that content to provide the service.",
      "AI-generated code can contain mistakes, security issues or third-party material. Review and test it before relying on it, and make sure your use of it complies with applicable licences and laws.",
    ]},
    {id: "plans", heading: "Plans, billing and cancellation", paragraphs: [
      "Paid plans are billed in advance on a recurring basis at the price shown on the pricing page when you subscribe. Payments are processed by Stripe; LotusBuild never receives your full card details.",
      "You can change or cancel your subscription at any time from the billing portal. Unless the law requires otherwise, payments are non-refundable and cancellation stops future renewals.",
      "Each plan includes usage allowances. When an allowance or hard limit is reached, related actions are paused until the allowance resets or you change plan.",
    ]},
    {id: "suspension", heading: "Suspension and termination", paragraphs: [
      "You may stop using LotusBuild and delete your projects at any time. We may suspend or end access if you breach these terms, if your use creates a security or legal risk, or if payment fails, and we will give notice where it is reasonable to do so.",
    ]},
    {id: "warranty", heading: "Disclaimers", paragraphs: [
      "LotusBuild is provided as available. To the extent permitted by law, we do not promise that the service or its output will be uninterrupted, error-free or suitable for a particular purpose.",
    ]},
    {id: "liability", heading: "Liability", paragraphs: [
      "Nothing in these terms limits liability for death or personal injury caused by negligence, for fraud, or for anything else that cannot be limited by law.",
      "Otherwise, we are not liable for indirect or consequential loss, or loss of profit, data or goodwill, and our total liability in any 12 months is limited to the amount you paid us in that period.",
    ]},
    {id: "changes", heading: "Changes to these terms", paragraphs: [
      "We may update these terms as LotusBuild evolves. If a change materially affects you, we will tell you before it takes effect. Continuing to use LotusBuild after that means you accept the updated terms.",
    ]},
    {id: "law", heading: "Governing law", paragraphs: [
      "These terms are governed by the laws of England and Wales, and the courts of England and Wales have jurisdiction, without affecting any mandatory consumer rights you have where you live.",
    ]},
  ],
};

export const PRIVACY: LegalDocument = {
  eyebrow: "Privacy Policy",
  title: "How we handle your data.",
  updated: "12 October 2026",
  summary: "We collect what we need to run LotusBuild, protect it, and never sell it. This policy explains what we collect, why, and the choices you have under UK GDPR.",
  sections: [
    {id: "collect", heading: "What we collect", paragraphs: ["We collect only what is needed to provide and secure the service:"], points: [
      "Account data: your name, email address, sign-in provider and account identifier.",
      "Project data: prompts, messages, files, generated code and session activity you create in LotusBuild.",
      "Usage data: builds started, tokens, sandbox time and storage, used to apply plan limits.",
      "Billing data: your Stripe customer and subscription identifiers. Card details are handled by Stripe, not by us.",
      "Security data: request logs and identifiers used to prevent abuse and investigate incidents.",
    ]},
    {id: "use", heading: "How we use it", paragraphs: [
      "We use your data to run builds and previews, operate your account and subscription, enforce limits, keep the service secure, provide support, and meet legal obligations. Our legal bases are performing our contract with you, our legitimate interest in running a secure service, and legal obligation.",
      "We do not sell your personal data, and we do not use your private projects to advertise to you.",
    ]},
    {id: "processors", heading: "Who we share it with", paragraphs: ["We use trusted providers to run LotusBuild, under contracts that limit how they can use your data:"], points: [
      "Google Firebase and Cloud for sign-in and data storage.",
      "Anthropic to run the AI models that power the agent.",
      "E2B for isolated cloud sandboxes.",
      "Stripe for payments and subscriptions.",
      "Vercel for hosting this website.",
    ]},
    {id: "transfers", heading: "International transfers", paragraphs: [
      "Some providers process data outside the UK. Where they do, we rely on adequacy regulations or standard contractual safeguards approved under UK law.",
    ]},
    {id: "retention", heading: "Retention", paragraphs: [
      "We keep account and project data while your account is active. Deleted projects are removed from active systems, and backups expire on a rolling schedule. Billing records are kept as long as tax and accounting law requires.",
    ]},
    {id: "security", heading: "Security", paragraphs: [
      "Data is encrypted in transit. Every API request is authenticated with a short-lived token verified by our servers, generated code runs in isolated sandboxes, and access to production systems is restricted and logged.",
    ]},
    {id: "rights", heading: "Your rights", paragraphs: [
      "Under UK GDPR you can ask to access, correct, delete, restrict or port your personal data, and you can object to certain processing. You can also complain to the Information Commissioner's Office (ico.org.uk).",
    ]},
    {id: "cookies", heading: "Cookies and local storage", paragraphs: [
      "LotusBuild uses essential browser storage only to keep you signed in, protect your session and remember your cookie choice. These are needed for the service to work and don't require consent.",
      "We don't use advertising cookies. If we add optional analytics, they will stay off unless you choose Accept all, and you can change your choice any time from Cookie settings in the footer.",
    ]},
    {id: "changes", heading: "Changes", paragraphs: [
      "We will update this policy when our practices change and show the new date at the top. If a change materially affects you, we will tell you in advance.",
    ]},
  ],
};
