// redux/api/authApi.ts
import { baseApi } from "./baseApi";
import { apiPost } from "./commonApi";
import { API_ROUTES } from "@/constants/ApiRoutes";


import { saveSecureItem } from "@/app/admin/Helpers/encryptionHelper";


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
            saveSecureItem("token", data.token);
            saveSecureItem("userRole", data.user.role); // ✅ IMPORTANT
          }

        } catch (err) {
          console.error("Login failed");
        }
      },
    }),
  }),
});

export const { useLoginMutation } = authApi;
