/**
 * Authentication hook – uses shared AuthContext so /auth/me is only called once per app load.
 */
export { useAuth } from "@/contexts/AuthContext";
