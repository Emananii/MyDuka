// src/context/UserContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient"; // Your API request utility
import { BASE_URL } from "@/lib/constants"; // Your base URL constant
import { userSchema } from "@/shared/schema"; // Your user Zod schema

// Create the context
export const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Initialize isLoading to true

  // Function to fetch and set user data
  const fetchUser = useCallback(async () => {
    setIsLoading(true); // Set loading true at the start of fetch
    try {
      // Corrected the API endpoint for /me to include the blueprint's URL prefix
      const res = await apiRequest("GET", `${BASE_URL}/api/auth/me`);
      const validatedUser = userSchema.parse(res); // Validate user data with Zod
      setUser(validatedUser);
    } catch (error) {
      console.error("Failed to fetch user session:", error);
      setUser(null); // Clear user if session is invalid or not found
    } finally {
      setIsLoading(false); // Set loading false after fetch completes (success or failure)
    }
  }, []);

  // Effect to run on component mount to check for existing session
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Modified login function: Now handles the API call and JWT storage
  const login = useCallback(async (email, password) => {
    setIsLoading(true); // Set loading state for login process
    try {
      // Make the actual login API call
      const res = await apiRequest("POST", `${BASE_URL}/api/auth/login`, { email, password });

      // Store the access token if successful
      if (res.access_token) {
        localStorage.setItem('jwt_token', res.access_token); // Store the JWT
      }

      // Parse and set the user from the login response (res.user should contain user data)
      const validatedUser = userSchema.parse(res.user);
      setUser(validatedUser);

      return res; // Return the response for the calling component (e.g., login form)
    } catch (error) {
      console.error("Login failed:", error);
      setUser(null); // Clear user if login fails
      localStorage.removeItem('jwt_token'); // Clear any stored token on failure
      throw error; // Re-throw to allow the login form to handle the error (e.g., display message)
    } finally {
      setIsLoading(false); // Ensure loading is set to false
    }
  }, []); // apiRequest, BASE_URL, userSchema are typically stable, or add if they change

  // Logout function: Clears user state and JWT
  const logout = useCallback(async () => {
    try {
      // Assuming your backend has a logout endpoint that clears server-side session/token
      await apiRequest("POST", `${BASE_URL}/api/auth/logout`);
    } catch (error) {
      console.error("Logout failed on server:", error);
      // Even if server logout fails, we must clear client-side state
    } finally {
      setUser(null);
      localStorage.removeItem('jwt_token'); // Always clear the JWT from localStorage on logout
    }
  }, []);

  // Use useMemo for the context value to optimize performance
  const contextValue = React.useMemo(() => ({
    user,
    isLoading,
    login,
    logout,
    fetchUser // Expose fetchUser if components might need to manually refresh user data
  }), [user, isLoading, login, logout, fetchUser]);


  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
}

// Hook to use the context easily
export const useUser = () => useContext(UserContext);