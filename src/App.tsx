import {lazy, Suspense, useEffect} from "react";
import {BrowserRouter, Route, Routes, useLocation} from "react-router-dom";

import {CookieBanner} from "@/components/cookie-banner";
import {LegacyProjectsRedirect, RequireOwnWorkspace} from "@/components/require-account";
import LandingPage from "@/pages/landing";

const SignInPage = lazy(() => import("@/pages/sign-in"));
const SignUpPage = lazy(() => import("@/pages/sign-up"));
const ProjectsPage = lazy(() => import("@/pages/projects"));
const WorkspacePage = lazy(() => import("@/pages/workspace"));
const PricingPage = lazy(() => import("@/pages/pricing"));
const TermsPage = lazy(() => import("@/pages/terms"));
const PrivacyPage = lazy(() => import("@/pages/privacy"));
const NotFoundPage = lazy(() => import("@/pages/not-found"));

// Scrolls to a #section after navigation, otherwise back to the top of the page.
function ScrollManager() {
  const {pathname, hash} = useLocation();
  useEffect(() => {
    if (!hash) { window.scrollTo({top: 0}); return; }
    let attempts = 0;
    const id = window.setInterval(() => {
      const target = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (target || ++attempts > 20) {
        window.clearInterval(id);
        target?.scrollIntoView({behavior: "smooth", block: "start"});
      }
    }, 50);
    return () => window.clearInterval(id);
  }, [pathname, hash]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollManager />
      <Suspense fallback={<div className="min-h-screen bg-black" />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/sign-up" element={<SignUpPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/projects" element={<LegacyProjectsRedirect />} />
          <Route path="/projects/:projectId" element={<LegacyProjectsRedirect />} />
          <Route path="/:username/projects" element={<ProjectsPage />} />
          <Route path="/:username/projects/:projectId" element={<RequireOwnWorkspace>{account => <WorkspacePage account={account} />}</RequireOwnWorkspace>} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      <CookieBanner />
    </BrowserRouter>
  );
}
