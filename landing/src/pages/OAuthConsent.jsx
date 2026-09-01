import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { useAuth } from "@/lib/AuthContext";

export default function OAuthConsent() {
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const appName = searchParams.get("app_name") || "Third-party application";
  const redirectUri = searchParams.get("redirect_uri");

  const handleApprove = async () => {
    setSubmitting(true);
    setError("");
    try {
      if (redirectUri) {
        window.location.href = redirectUri;
      } else {
        window.location.href = "/";
      }
    } catch (err) {
      setError(err.message || "Failed to process consent");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeny = () => {
    window.location.href = "/";
  };

  return (
    <AuthLayout
      icon={ShieldCheck}
      title="Authorize Access"
      subtitle={`Allow ${appName} to access your account`}
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4 text-sm text-muted-foreground mb-6">
        <p>
          <strong className="text-foreground">{appName}</strong> is requesting permission to view your basic profile information.
        </p>
        {user?.email && (
          <p className="text-xs">
            Signed in as: <span className="font-medium text-foreground">{user.email}</span>
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <Button
          onClick={handleApprove}
          className="w-full h-12 font-medium"
          disabled={submitting || isLoadingAuth}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Authorizing...
            </>
          ) : (
            "Authorize"
          )}
        </Button>
        <Button
          variant="outline"
          onClick={handleDeny}
          className="w-full h-12 font-medium"
          disabled={submitting}
        >
          Cancel
        </Button>
      </div>
    </AuthLayout>
  );
}