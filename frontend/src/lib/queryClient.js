// src/lib/queryClient.js
import { QueryClient } from "@tanstack/react-query";
import { BASE_URL } from "./constants";

// Throw an error if response is not OK
async function throwIfResNotOk(res) {
  if (!res.ok) {
    let errorMsg = res.statusText;
    try {
      const errorData = await res.json();
      errorMsg =
        errorData.error ||
        errorData.message ||
        errorData.msg ||
        JSON.stringify(errorData);
    } catch {
      errorMsg = await res.text();
    }
    throw new Error(`${res.status}: ${errorMsg}`);
  }
}

export async function apiRequest(method, url, data) {
  const headers = {
    ...(data && { "Content-Type": "application/json" }),
  };

  const token = localStorage.getItem("token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // ✅ IMPORTANT: Enables cookie/session + JWT CORS
  };

  try {
    const res = await fetch(url, options);

    if (res.status === 204) return null;

    await throwIfResNotOk(res);

    const text = await res.text();
    return text ? JSON.parse(text) : {};
  } catch (error) {
    console.error(`API Request Error [${method} ${url}]:`, error);
    throw error;
  }
}

export function getQueryFn({ on401 }) {
  return async ({ queryKey }) => {
    const url = queryKey[0];
    try {
      const res = await apiRequest("GET", url);
      return res;
    } catch (error) {
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
