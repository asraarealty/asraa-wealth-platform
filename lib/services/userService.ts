import { fetchUsers, type User } from "@/lib/api";

/**
 * Fetch the list of all registered users.
 * Returns an empty array and logs a warning when the API returns a non-array.
 */
export async function getUsers(signal?: AbortSignal): Promise<User[]> {
  const data = await fetchUsers(signal);
  if (!Array.isArray(data)) {
    console.warn("[userService] getUsers: expected array, got", typeof data);
    return [];
  }
  return data;
}
