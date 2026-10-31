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
    const error = new Error(data.error || "Something went wrong. Please try again.");
    error.status = response.status;
    throw error;
  }

  return data;
}

export function roleLabel(role) {
  if (role === "ADMIN") return "Administrator";
  if (role === "PRODUCT_OWNER" || role === "INTERNAL") return "Internal staff";
  return "Customer";
}

export function roleCopy(role) {
  if (role === "ADMIN") {
    return "You have full administrative access, including creating product owner accounts.";
  }
  if (role === "PRODUCT_OWNER" || role === "INTERNAL") {
    return "You have access to product-owner operations. Customer data stays scoped to your work.";
  }
  return "You can view and manage your own account information only.";
}
