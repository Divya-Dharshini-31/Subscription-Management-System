export async function apiRequest(path, { method = "GET", body } = {}) {
  const response = await fetch(path, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.error || "Something went wrong. Please try again.");
  }

  return data;
}

export function roleLabel(role) {
  if (role === "ADMIN") return "Administrator";
  if (role === "STAFF") return "Staff";
  return "Customer";
}

export function roleCopy(role) {
  if (role === "ADMIN") {
    return "You have full administrative access, including creating staff accounts.";
  }
  if (role === "STAFF") {
    return "You have access to day-to-day operations. Customer records stay scoped to your work.";
  }
  return "You can view and manage your own account information only.";
}
