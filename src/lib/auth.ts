// import type { NextAuthOptions } from "next-auth";
// import GoogleProvider from "next-auth/providers/google";
// import { SupabaseAdapter } from "@auth/supabase-adapter";

// /**
//  * Supabase project URL — must match Vercel.
//  * Auth.js docs use SUPABASE_URL; many Next apps use NEXT_PUBLIC_SUPABASE_URL (same value).
//  */
// function getSupabaseAdapterUrl(): string {
//   return (
//     process.env.NEXT_PUBLIC_SUPABASE_URL ??
//     process.env.SUPABASE_URL ??
//     ""
//   );
// }

// export const authOptions: NextAuthOptions = {
//   providers: [
//     GoogleProvider({
//       clientId: process.env.GOOGLE_CLIENT_ID ?? "",
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
//       authorization: {
//         params: {
//           scope: [
//             "openid",
//             "email",
//             "profile",
//             "https://www.googleapis.com/auth/gmail.readonly",
//           ].join(" "),
//           access_type: "offline",
//           prompt: "consent",
//         },
//       },
//     }),
//   ],
//   /**
//    * @auth/supabase-adapter writes to schema `next_auth` (not `public`).
//    * Tables: next_auth.users, next_auth.accounts, next_auth.sessions, next_auth.verification_tokens
//    */
//   adapter: SupabaseAdapter({
//     url: getSupabaseAdapterUrl(),
//     secret: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  
//   }),
//   session: {
//     strategy: "database",
//     maxAge: 30 * 24 * 60 * 60, // 30 days
//     updateAge: 24 * 60 * 60,
//   },
//   callbacks: {
//     async session({ session, user }) {
//       if (session.user) {
//         session.user.id = user.id;
//         session.user.email = user.email;
//         session.user.name = user.name;
//         session.user.image = user.image;
//       }
//       return session;
//     },
//   },
// };



import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { SupabaseAdapter } from "@auth/supabase-adapter";

/**
 * Supabase project URL — must match Vercel.
 */
function getSupabaseAdapterUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    ""
  );
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // 💡 This fixes the "confirm your identity" error for your friends
      allowDangerousEmailAccountLinking: true, 
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/gmail.readonly",
          ].join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  /**
   * @auth/supabase-adapter writes to schema `next_auth`.
   */
  adapter: SupabaseAdapter({
    url: getSupabaseAdapterUrl(),
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60,
  },
  callbacks: {
    async session({ session, user }) {
      if (session?.user) {
        session.user.id = user.id;
        session.user.email = user.email;
        session.user.name = user.name;
        session.user.image = user.image;
      }
      return session;
    },
  },
};