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

export async function fetchRoleData(endpoint) {
  const token = localStorage.getItem("token");
  const res = await fetch(`/api/${endpoint}`, {
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Access denied");
  }
  return res.json();
}
export const fetchUsers = async (params = {}) => {
  const { page = 1, limit = 5, sortBy = 'createdAt', sortOrder = 'desc', search = '' } = params;
  const queryParams = new URLSearchParams({ page, limit, sortBy, sortOrder, search }).toString();
  const response = await fetch(`http://localhost:5000/api/users?${queryParams}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    }
  });
  if (!response.ok) throw new Error('Failed to fetch users');
  return response.json();
};

export const assignRoleToUser = async(userId, role, token) => {
  const response = await fetch(`http://localhost:5000/api/users/${userId}/role`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({role})
  });
  if(!response.ok) {
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

export { login as loginUser, signup as signupUser, fetchUsers as fetchAllUsers, assignRoleToUser as assignRole};
