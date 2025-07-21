import { QueryClient } from "@tanstack/react-query";
import { BASE_URL } from "./constants";


// Throw an error if response is not OK
async function throwIfResNotOk(res) {
  if (!res.ok) {
    let errorMsg = res.statusText;
    try {
      // Try to parse JSON error message from backend
      const errorData = await res.json();
      errorMsg = errorData.error || JSON.stringify(errorData);
    } catch {
      // Fallback to plain text if not JSON
      errorMsg = await res.text();
    }
    throw new Error(`${res.status}: ${errorMsg}`);
  }
}

export async function apiRequest(method, url, data) {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    // credentials: "include" removed for now unless explicitly needed
  });

  await throwIfResNotOk(res);

  return await res.json();
}

export function getQueryFn({ on401 }) {
  return async ({ queryKey }) => {
    const res = await fetch(queryKey[0]); 

    if (on401 === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
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