// API fetch wrapper that automatically appends the JWT Authorization token and compatibility headers
export async function authFetch(url, options = {}) {
  const token = localStorage.getItem('token');
  
  const headers = {
    ...options.headers,
  };
  
  // Set default Content-Type to JSON if method is write and not already set
  if (options.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method.toUpperCase()) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Attach user identity headers for backward compatibility
  const authData = localStorage.getItem('auth');
  if (authData) {
    try {
      const user = JSON.parse(authData);
      if (user.email) {
        headers['userEmail'] = user.email;
        headers['user-email'] = user.email;
      }
      if (user.role) {
        headers['userRole'] = user.role;
        headers['user-role'] = user.role;
        if (['admin', 'principal', 'secretary'].includes(user.role.toLowerCase())) {
          headers['isAdmin'] = 'true';
          headers['isadmin'] = 'true';
        }
      }
    } catch (e) {}
  }
  
  return fetch(url, {
    ...options,
    headers,
  });
}
