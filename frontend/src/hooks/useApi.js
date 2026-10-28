/**
 * Central API utility — wraps all fetch calls with JWT auth token.
 * Import useApi() in any component instead of using fetch() directly.
 */
import { useAuth } from '../context/AuthContext';

export function useApi() {
  const { authFetch } = useAuth();
  return authFetch;
}
