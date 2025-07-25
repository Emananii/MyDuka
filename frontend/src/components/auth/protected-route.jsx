// src/components/auth/protected-route.jsx
import React from 'react';
import { useLocation } from 'wouter';
import { useUser } from '@/context/UserContext';
import { Loader2 } from 'lucide-react'; // For loading state

/**
 * ProtectedRoute Component
 * Guards routes based on user authentication status and roles.
 *
 * @param {object} props
 * @param {React.ComponentType<any>} props.component - The component to render if authorized.
 * @param {string[]} [props.allowedRoles] - An array of roles allowed to access this route. If undefined or empty, only requires authentication.
 * @returns {JSX.Element | null} The protected component, a loading spinner, or redirects.
 */
export default function ProtectedRoute({ component: Component, allowedRoles }) {
  const { user, isLoading: isLoadingUser } = useUser();
  const [, navigate] = useLocation();

  if (isLoadingUser) {
    // Show a loading spinner or skeleton while user data is being fetched
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 py-10">
        <Loader2 className="h-8 w-8 animate-spin mb-3" />
        <p>Loading user session...</p>
      </div>
    );
  }

  // If user is not logged in, redirect to login page
  if (!user) {
    navigate('/login', { replace: true });
    return null; // Don't render anything
  }

  // If allowedRoles are specified, check if the user's role is included
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role)) {
      // User is logged in but doesn't have the required role
      console.warn(`Access Denied: User '${user.email}' with role '${user.role}' tried to access a route requiring roles: ${allowedRoles.join(', ')}`);
      // Redirect to a 404 page or a dedicated access denied page
      navigate('/not-found', { replace: true }); // Or '/access-denied'
      return null;
    }
  }

  // If user is logged in and has the required role (or no roles specified), render the component
  return <Component />;
}