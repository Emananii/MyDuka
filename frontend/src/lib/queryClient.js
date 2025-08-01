// src/lib/queryClient.js
import { QueryClient } from "@tanstack/react-query";
import { BASE_URL } from "./constants";

/**
 * Throws an error if the fetch response status is not OK (2xx).
 * @param {Response} res The fetch response object.
 * @returns {Promise<void>}
 */
async function throwIfResNotOk(res) {
  if (!res.ok) {
    let errorMsg = res.statusText;
    try {
      const errorData = await res.json();
      errorMsg = errorData.error || errorData.message || errorData.msg || JSON.stringify(errorData);
    } catch {
      // If the response body is not JSON, use the plain text.
      errorMsg = await res.text();
    }
    throw new Error(`${res.status}: ${errorMsg}`);
  }
}

/**
 * A wrapper for fetch that automatically handles JWT authentication.
 * @param {string} method The HTTP method (e.g., 'GET', 'POST').
 * @param {string} url The full API endpoint URL.
 * @param {any} data The request body data for POST/PUT/PATCH.
 * @returns {Promise<any>}
 */
export async function apiRequest(method, url, data) {
  const headers = {
    // Only set Content-Type for requests that actually have a body
    ...(data && { "Content-Type": "application/json" }),
  };

  // Get the JWT from localStorage and add it to the Authorization header
  // FIXED: Changed key from 'access_token' to 'jwt_token' to match the storage key
  const token = localStorage.getItem('jwt_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  };

  try {
    const res = await fetch(url, options);

    // Handle 204 No Content explicitly if your backend returns it
    if (res.status === 204) {
      return null;
    }

    await throwIfResNotOk(res); // Check for HTTP errors (4xx, 5xx)

    // Handle cases where the response might be empty or not JSON
    const text = await res.text();
    return text ? JSON.parse(text) : {};

  } catch (error) {
    console.error(`API Request Error [${method} ${url}]:`, error);
    throw error;
  }
}

/**
 * Creates a standard query function for use with react-query.
 * @param {{on401: string}} options Configuration options.
 * @returns {Function} A function that executes an API request for react-query.
 */
export function getQueryFn({ on401 }) {
  return async ({ queryKey }) => {
    // Assuming queryKey[0] is always the URL
    const url = queryKey[0];

    try {
      const res = await apiRequest("GET", url);
      return res;
    } catch (error) {
      // Handle 401 specifically if requested, e.g., for unauthenticated requests
      if (on401 === "returnNull" && error.message.startsWith("401:")) {
        return null;
      }
      throw error;
    }
  };
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
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
