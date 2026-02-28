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
import { API_BASE } from "@/lib/api";

const BASE_URL = API_BASE;

const AuthPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [useMySQL, setUseMySQL] = useState(true);

  const handleMySQLLogin = async () => {
    setIsLoading(true);
    try {
      // Use XMLHttpRequest to bypass rrweb/fetch interception issues
      const response = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${BASE_URL}/login`);
        xhr.setRequestHeader("Content-Type", "application/json");

        xhr.onload = () => {
          resolve({
            ok: xhr.status >= 200 && xhr.status < 300,
            text: () => Promise.resolve(xhr.responseText),
            statusText: xhr.statusText
          });
        };

        xhr.onerror = () => reject(new Error("Network request failed"));
        xhr.send(JSON.stringify({ username, password }));
      });

      // Read the response body once
      const responseText = await response.text();

      if (!response.ok) {
        let errorMessage = "Login failed";
        try {
          const error = JSON.parse(responseText);
          errorMessage = error.detail || errorMessage;
        } catch (e) {
          errorMessage = responseText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Parse the successful response
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (_) {
        data = { detail: responseText };
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