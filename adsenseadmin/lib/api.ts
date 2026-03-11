// Returns the backend API base URL
export function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || '';
}
