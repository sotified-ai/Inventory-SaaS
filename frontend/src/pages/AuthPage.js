import { useState } from "react";
import { auth } from "@/config/firebase";
import {
  signInAnonymously 
} from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Package } from "lucide-react";

// Use same logic as lib/api.js to resolve base
function resolveApiBase() {
  try {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname || '';
      if (host.includes('realgiveaways.com')) {
        return '/api.php/api';
      }
      // Local development: use local PHP backend
      if (host === 'localhost' || host === '127.0.0.1') {
        return 'http://localhost:8000/api.php/api';
      }
    }
  } catch (_) {}
  const base = (
    process.env.REACT_APP_API_BASE ||
    (process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : `https://realgiveaways.com/api.php/api`)
  );
  return base;
}

const API_BASE = resolveApiBase();
const BASE_URL = API_BASE;

const AuthPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [useMySQL, setUseMySQL] = useState(true);

  const handleMySQLLogin = async () => {
    setIsLoading(true);
    try {
      // Use /api/login instead of /login to match backend routing
      const response = await fetch(`${BASE_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });
      
      // Handle response properly to avoid "Response body is already used" error
      const responseClone = response.clone();
      const responseText = await response.text();
      
      // Create a new response object with the consumed body for app use
      const appResponse = new Response(responseText, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });

      if (!appResponse.ok) {
        const errorText = await appResponse.text();
        let errorMessage = "Login failed";
        try {
          const error = JSON.parse(errorText);
          errorMessage = error.detail || errorMessage;
        } catch (e) {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Read the body once and parse safely
      const text = await appResponse.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (_) {
        data = { detail: text };
      }
      localStorage.setItem("mysql-token", data.token);
      localStorage.setItem("mysql-username", data.username);
      localStorage.setItem("skip-login", "true");
      toast.success(`Welcome ${data.username}!`);
      window.location.reload();
    } catch (error) {
      console.error("MySQL login error:", error);
      toast.error(error.message || "Failed to login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnonymousLogin = async () => {
    setIsLoading(true);
    try {
      await signInAnonymously(auth);
      localStorage.removeItem("skip-login");
      toast.success("Signed in anonymously!");
    } catch (error) {
      console.error("Anonymous sign-in error:", error);
      toast.error(error.message || "Failed to sign in anonymously");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipLogin = () => {
    localStorage.setItem("skip-login", "true");
    localStorage.setItem("mysql-token", "dev-user-001");
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl mb-4">
            <Package className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Easy Inventory</h1>
          <p className="text-gray-600">Smart Inventory & Billing System</p>
        </div>

        <Card className="glass-effect border-0 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-2xl">Welcome</CardTitle>
            <CardDescription>
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 mb-4">
              <Button
                onClick={() => setUseMySQL(true)}
                variant={useMySQL ? "default" : "outline"}
                className="flex-1"
              >
                MySQL Login
              </Button>
              <Button
                onClick={() => setUseMySQL(false)}
                variant={!useMySQL ? "default" : "outline"}
                className="flex-1"
              >
                Firebase Login
              </Button>
            </div>

            {useMySQL ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleMySQLLogin()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleMySQLLogin()}
                  />
                </div>
                <Button
                  onClick={handleMySQLLogin}
                  data-testid="mysql-login-button"
                  className="w-full bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleAnonymousLogin}
                  data-testid="anonymous-login-button"
                  className="w-full bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign In Anonymously"}
                </Button>
                <Button
                  onClick={handleSkipLogin}
                  data-testid="skip-login-button"
                  className="w-full bg-gray-200 text-gray-700 hover:bg-gray-300"
                >
                  Skip Login (Dev Mode)
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;