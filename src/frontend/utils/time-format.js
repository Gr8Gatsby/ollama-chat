/**
 * Format a timestamp as relative time (e.g., "Just now", "5m ago", "2h ago")
 * @param {string|number|Date} timestamp - The timestamp to format
 * @returns {string} Formatted relative time string
 */
export function formatRelativeTime(timestamp) {
  if (!timestamp) return "";

  // Handle both Unix timestamps (numbers) and Date objects
  const date =
    timestamp instanceof Date ? timestamp : new Date(Number(timestamp));

  // Check if date is valid
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now - date;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  // For older dates, show the actual date
  return date.toLocaleDateString();
}

/**
 * Format a timestamp as a full date/time string
 * @param {string|number|Date} timestamp - The timestamp to format
 * @returns {string} Formatted full date/time string
 */
export function formatFullDateTime(timestamp) {
  if (!timestamp) return "";

  // Handle both Unix timestamps (numbers) and Date objects
  const date =
    timestamp instanceof Date ? timestamp : new Date(Number(timestamp));

  // Check if date is valid
  if (isNaN(date.getTime())) return "";

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
