import React, { useState } from "react";
import { useLocation } from "wouter";
import { useUser } from "@/context/UserContext"; 
import { Button } from "@/components/ui/button"; 
import { Input } from "@/components/ui/input";   

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // useLocation is a hook from 'wouter' that returns a tuple:
  // a getter for the current path, and a setter for navigation.
  const [, navigate] = useLocation();
  const { login } = useUser();

  // This is the core logic that has been updated.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      // The `login` function is expected to return the user object
      // from the API response on success.
      const user = await login(email, password);

      setSuccess("Login successful!");

      // --- NEW LOGIC: Redirect based on user role ---
      // We use a switch statement to handle different roles.
      // This is a clean way to manage multiple redirection paths.
      let dashboardPath = '/dashboard'; // Default path in case of an unknown role

      switch (user.role) {
        case 'merchant':
          dashboardPath = '/dashboard/merchant';
          break;
        case 'admin':
          dashboardPath = '/dashboard/admin';
          break;
        case 'clerk':
          dashboardPath = '/dashboard/clerk';
          break;
        case 'cashier':
          dashboardPath = '/dashboard/cashier';
          break;
        default:
          // You can handle other roles here or just use the default path
          console.warn(`Unknown user role: ${user.role}. Redirecting to default dashboard.`);
          break;
      }
      
      // Navigate to the determined dashboard path.
      navigate(dashboardPath);

    } catch (err) {
      console.error("Login failed:", err); 
      let displayErrorMessage = "Login failed. Please check your credentials.";

      if (err.message) {
        // Attempt to extract a more user-friendly message from the error
        const parts = err.message.split(': ', 2); 
        if (parts.length > 1) {
          displayErrorMessage = parts[1];
        } else {
          displayErrorMessage = err.message;
        }
      }
      
      setError(displayErrorMessage); 
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-indigo-100 font-sans">
      <div className="w-full max-w-xl bg-white bg-opacity-90 backdrop-blur-sm rounded-xl shadow-md overflow-hidden"> 
        <div className="bg-indigo-600 p-8 text-white text-center">
          <h1 className="text-4xl font-extrabold tracking-tight">
            MyDuka
          </h1>
          <p className="text-indigo-200 text-lg mt-2">Inventory & Sales Management</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-800 text-center">Welcome Back!</h2>

            {error && (
              <div className="text-red-700 bg-red-100 p-3 rounded-lg text-sm text-center border border-red-200">
                {error}
              </div>
            )}
            {success && (
              <div className="text-green-700 bg-green-100 p-3 rounded-lg text-sm text-center border border-green-200">
                {success}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full rounded-md border border-gray-300 px-4 py-2 text-base focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-md border border-gray-300 px-4 py-2 text-base focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-lg bg-indigo-600 text-white font-semibold shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-lg transition-all"
            >
              {isSubmitting ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
