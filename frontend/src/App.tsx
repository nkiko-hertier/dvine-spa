<<<<<<< HEAD
import { QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider } from '@clerk/react';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { setBaseUrl } from '@/api';
import { queryClient } from '@/lib/query-client';
import { basePath, stripBase } from '@/lib/base-path';
import { clerkAppearance } from '@/auth/clerk-appearance';
import { ClerkTokenBridge } from '@/auth/ClerkTokenBridge';
import { ClerkQueryClientCacheInvalidator } from '@/auth/ClerkQueryClientCacheInvalidator';
import { SignInPage } from '@/auth/SignInPage';
import { SignUpPage } from '@/auth/SignUpPage';
import { HomeRedirect } from '@/auth/HomeRedirect';
import { WorkspaceGate } from '@/WorkspaceGate';
import { NotFoundPage } from '@/pages/NotFoundPage';

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Standard standalone setup: the API server runs on its own origin/port.
// Point requests there, and attach a Clerk bearer token (from the
// "default" JWT template) to every request instead of relying on
// same-origin session cookies.
setBaseUrl(import.meta.env.VITE_API_URL ?? '');

export default function App() {
  if (!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in environment.');
  return (
    <WouterRouter base={basePath}>
      <ClerkProvider
        publishableKey={clerkPubKey}
        appearance={clerkAppearance}
        signInUrl={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        localization={{
          signIn: { start: { title: 'Welcome back', subtitle: 'Return to the room' } },
          signUp: { start: { title: 'Join D’Vine', subtitle: 'Create your workspace account' } },
        }}
        routerPush={(to) => window.history.pushState({}, '', stripBase(to))}
        routerReplace={(to) => window.history.replaceState({}, '', stripBase(to))}
      >
        <QueryClientProvider client={queryClient}>
          <ClerkTokenBridge />
          <ClerkQueryClientCacheInvalidator />
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route path="/workspace/*?" component={WorkspaceGate} />
            <Route component={NotFoundPage} />
          </Switch>
        </QueryClientProvider>
      </ClerkProvider>
    </WouterRouter>
  );
}
=======
import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import About from "./pages/About";
import Services from "./pages/Serices";
import Contact from "./pages/Contact";
import Booking from "./pages/Booking";
import Login from "./pages/admin/Login";
import Dashboard from "./pages/admin/Dashboard";
import NotFound from "./pages/NotFound";
import DashbordServices from "./pages/admin/Services";
import DashboardBookings from "./pages/admin/Booking";
import DashboardCategories from "./pages/admin/Categories";
import "./App.css"; 
import "./index.css";

export default function App() {
    return (
        <BrowserRouter>
            
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/services" element={<Services />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/booking" element={<Booking />} />
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/dashboard/services" element={<DashbordServices />} />
                <Route path="/dashboard/bookings" element={<DashboardBookings />} />
                <Route path="/dashboard/categories" element={<DashboardCategories />} />
                <Route path="*" element={<NotFound />} />
            </Routes>
            
        </BrowserRouter>
    )
}

>>>>>>> 207ffa8aa639feaabd2815251b95a264076fef90
