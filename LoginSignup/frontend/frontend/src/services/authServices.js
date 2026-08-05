export async function login(username, password) {
  const res = await fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Login failed");
  }
  return res.json();
}

export async function signup(payload) {
  const res = await fetch("/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Signup failed");
  }
  return res.json();
}

export async function refreshAccessToken() {
  const refreshToken = localStorage.getItem("refreshToken");
  const res = await fetch("/api/refresh-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to refresh token");
  }

  const data = await res.json();
  if (data.accessToken || data.token) {
    const newToken = data.accessToken || data.token;
    localStorage.setItem("token", newToken);
    if (data.refreshToken) {
      localStorage.setItem("refreshToken", data.refreshToken);
    }
    return newToken;
  }
  throw new Error("Invalid token refresh response");
}

export async function authenticatedFetch(url, options = {}) {
  let token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };

  let response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    try {
      const newToken = await refreshAccessToken();
      headers["Authorization"] = `Bearer ${newToken}`;
      response = await fetch(url, { ...options, headers });
    } catch (refreshErr) {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      window.location.href = "/";
      throw new Error("Session expired. Please log in again.");
    }
  }

  return response;
}

export async function fetchRoleData(endpoint) {
  const res = await authenticatedFetch(`/api/${endpoint}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Access denied");
  }
  return res.json();
}

export const fetchUsers = async (params = {}) => {
  const { page = 1, limit = 5, sortBy = 'createdAt', sortOrder = 'desc', search = '' } = params;
  const queryParams = new URLSearchParams({ page, limit, sortBy, sortOrder, search }).toString();
  const response = await authenticatedFetch(`http://localhost:5000/api/users?${queryParams}`);
  if (!response.ok) throw new Error('Failed to fetch users');
  return response.json();
};

export const assignRoleToUser = async (userId, role) => {
  const response = await authenticatedFetch(`http://localhost:5000/api/users/${userId}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to assign role');
  }
  return response.json();
};
export async function sendOtp(email) {
  const res = await fetch("/api/send-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || "Failed to send OTP");
  }
  return data;
}

export async function verifyOtpLogin(email, otp) {
  const res = await fetch("/api/verify-otp-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || "Invalid or expired OTP");
  }
  return data;
}

export async function resetPasswordOtp(email, otp, newPassword) {
  const res = await fetch("/api/reset-password-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp, newPassword }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || "Failed to reset password");
  }
  return data;
};
export async function googleLogin(idToken) {
  const res = await fetch("/api/google-login",{
    method: "POST",
    headers:{
      "Content-Type" : "application/json"
    },
    body: JSON.stringify({idToken}),
  });
  const data = await res.json();
  if(!res.ok || !data.success){
    throw new Error(data.message || "Google Login failed");
  }
  return data;
}

export async function githubLogin(code) {
  const res = await fetch("/api/github-login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ code }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || "GitHub Login failed");
  }
  return data;
}

export async function fetchMyPermissions() {
  const response = await authenticatedFetch('/api/permissions/me');
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch permissions');
  }
  return response.json();
}

export async function fetchAllPermissions() {
  const response = await authenticatedFetch('http://localhost:5000/api/permissions');
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch all permissions');
  }
  return response.json();
}

export async function fetchUserPermissions(userId) {
  const response = await authenticatedFetch(`http://localhost:5000/api/permissions/${userId}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch user permissions');
  }
  return response.json();
}

export async function updateUserPermissions(userId, permissionData) {
  const response = await authenticatedFetch(`http://localhost:5000/api/permissions/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(permissionData)
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to update user permissions');
  }
  return response.json();
}

export { login as loginUser, signup as signupUser, fetchUsers as fetchAllUsers, assignRoleToUser as assignRole};
