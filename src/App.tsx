import {lazy, Suspense} from "react";
import {BrowserRouter, Route, Routes} from "react-router-dom";

import LandingPage from "@/pages/landing";

const SignInPage = lazy(() => import("@/pages/sign-in"));
const SignUpPage = lazy(() => import("@/pages/sign-up"));
const ProjectsPage = lazy(() => import("@/pages/projects"));
const WorkspacePage = lazy(() => import("@/pages/workspace"));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="min-h-screen bg-black" />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/sign-up" element={<SignUpPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:projectId" element={<WorkspacePage />} />
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
