// src/lib/queryClient.js
import { QueryClient } from "@tanstack/react-query";
import { BASE_URL } from "./constants"; // Make sure BASE_URL is correctly defined here

// Throw an error if response is not OK
async function throwIfResNotOk(res) {
  if (!res.ok) {
    let errorMsg = res.statusText;
    try {
      // Try to parse JSON error message from backend
      const errorData = await res.json();
      errorMsg = errorData.error || errorData.message || errorData.msg || JSON.stringify(errorData); // Check common error keys
    } catch {
      // Fallback to plain text if not JSON
      errorMsg = await res.text();
    }
    throw new Error(`${res.status}: ${errorMsg}`);
  }
}

export async function apiRequest(method, url, data) {
  const headers = {
    // Only set Content-Type for requests that actually have a body
    ...(data && { "Content-Type": "application/json" }),
  };

  // ✅ FIX: Get JWT from localStorage and add to headers if available
  const token = localStorage.getItem('jwt_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers: headers,
    body: data ? JSON.stringify(data) : undefined,
  };

  try {
    const res = await fetch(url, options);

    // Handle 204 No Content explicitly if your backend returns it
    if (res.status === 204) {
        return null; // Or undefined, based on your desired return type for no content
    }

    await throwIfResNotOk(res); // Check for HTTP errors (4xx, 5xx)

    // Try to parse JSON, but handle cases where response might be empty or not JSON
    const text = await res.text();
    return text ? JSON.parse(text) : {}; // Return empty object for empty responses

  } catch (error) {
    console.error(`API Request Error [${method} ${url}]:`, error);
    throw error; // Re-throw the error for the calling component to handle
  }
}

// NOTE: This getQueryFn structure is a bit unusual for @tanstack/react-query
// if you intend to use `apiRequest` for all queries.
// If all your queries use apiRequest, you might simplify the default queryFn.
// However, I've updated it to use apiRequest for consistency.
export function getQueryFn({ on401 }) {
  return async ({ queryKey }) => {
    const url = queryKey[0]; // Assuming queryKey[0] is always the URL

    try {
        const res = await apiRequest("GET", url); // Use apiRequest to handle headers
        return res;
    } catch (error) {
        // Handle 401 specifically if requested
        if (on401 === "returnNull" && error.message.startsWith("401:")) {
            return null;
        }
        throw error; // Re-throw other errors
    }
  };
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }), // This will use your updated getQueryFn
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});