// auth-helper.js - Frontend utility for auth-related operations with notification handling

import { handleLogout as notificationLogout } from './notifications.js';

// User login handler
export async function loginUser(email, password) {
  try {
    // Clear any existing auth state
    localStorage.removeItem('auth');
    localStorage.removeItem('userEmail');

    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Login failed');
    }

    const data = await response.json();
    
    // Store auth data in localStorage
    localStorage.setItem('auth', JSON.stringify(data.user));
    localStorage.setItem('userEmail', email);
    if (data.token) {
      localStorage.setItem('token', data.token);
    }
    
    console.log(`🔑 Logged in as: ${email} (${data.user.role})`);
    return data.user;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

// User logout handler with notification cleanup
export async function logoutUser() {
  try {
    // First handle notification logout - deactivate subscriptions
    console.log('🔔 Handling notification logout...');
    await notificationLogout();
    
    // Then clear authentication state
    console.log('🔑 Clearing authentication state...');
    localStorage.removeItem('auth');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('token');
    
    console.log('👋 User logged out successfully');
    return true;
  } catch (error) {
    console.error('Logout error:', error);
    
    // Still remove auth data even if notification handling failed
    localStorage.removeItem('auth');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('token');
    
    throw error;
  }
}

// Check if user is logged in
export function isLoggedIn() {
  const auth = localStorage.getItem('auth');
  return !!auth;
}

// Get current user
export function getCurrentUser() {
  const auth = localStorage.getItem('auth');
  if (!auth) return null;
  
  try {
    return JSON.parse(auth);
  } catch (error) {
    console.error('Error parsing auth data:', error);
    return null;
  }
}

// Get current user email
export function getCurrentUserEmail() {
  let email = localStorage.getItem('userEmail');
  
  if (!email) {
    const auth = getCurrentUser();
    email = auth?.email;
  }
  
  return email;
}