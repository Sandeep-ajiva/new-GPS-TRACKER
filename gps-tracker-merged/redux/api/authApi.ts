// redux/api/authApi.ts
import { baseApi } from "./baseApi";
import { apiPost } from "./commonApi";
import { API_ROUTES } from "@/constants/ApiRoutes";


type LoginResponse = {
  token: string;
  user: {
    _id: string;
    role: "superadmin" | "admin" | "user";
    organizationId: string | null;
  };
};

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<
      LoginResponse,
      { email: string; password: string }
    >({

    query: (body) => ({
  url: API_ROUTES.LOGIN, // "/login"
  method: "POST",
  body,
}),


      async onQueryStarted(arg, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;

          // ✅ LOGIN RESPONSE SE TOKEN UTHAO
          if (typeof window !== "undefined") {
            localStorage.setItem("token", data.token);
            localStorage.setItem("userRole", data.user.role); // ✅ IMPORTANT
          }

        } catch (err) {
          console.error("Login failed");
        }
      },
    }),
  }),
});

export const { useLoginMutation } = authApi;
