import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query";
import { apiCircuitBreaker } from "@/utils/CircuitBreaker";
import { encryptPayload } from "@/utils/encryption";

/**
 * -----------------------------------------------------
 * RAW BASE QUERY
 * -----------------------------------------------------
 * - baseUrl = backend root
 * - Authorization header ONLY when token exists
 * - NO auth header on login
 */
const rawBaseQuery = fetchBaseQuery({
  baseUrl: "http://localhost:5000/api",

  prepareHeaders: (headers, { endpoint }) => {
    // ❌ login endpoint pe token nahi bhejna
    if (endpoint === "login") {
      return headers;
    }

    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }

    return headers;
  },
});

/**
 * -----------------------------------------------------
 * BASE QUERY WRAPPER (WITH CIRCUIT BREAKER)
 * -----------------------------------------------------
 */
export const baseQuery: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  try {
    return await apiCircuitBreaker.execute(async () => {
      const result = await rawBaseQuery(args, api, extraOptions);

      // treat 5xx as circuit-breaker failures
      if (
        result.error &&
        typeof result.error.status === "number" &&
        result.error.status >= 500
      ) {
        throw result.error;
      }

      return result;
    });
  } catch (err) {
    return {
      error: {
        status: 503,
        data: {
          message: (err as Error).message || "Service temporarily unavailable",
        },
      } as FetchBaseQueryError,
    };
  }
};

/**
 * -----------------------------------------------------
 * GENERIC API HELPERS
 * -----------------------------------------------------
 * NOTE:
 * ❌ NEVER encrypt login / auth APIs
 * ✅ encrypt only sensitive create/update APIs if needed
 */

export const apiGet = (url: string) => ({
  url,
  method: "GET",
});

export const apiPost = <T>(
  url: string,
  body: T,
  options?: { encrypt?: boolean }
) => ({
  url,
  method: "POST",
  body: options?.encrypt ? { data: encryptPayload(body) } : body,
});

export const apiPut = <T>(
  url: string,
  body: T,
  options?: { encrypt?: boolean }
) => ({
  url,
  method: "PUT",
  body: options?.encrypt ? { data: encryptPayload(body) } : body,
});

export const apiDelete = (url: string) => ({
  url,
  method: "DELETE",
});
