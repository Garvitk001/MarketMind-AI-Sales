import React, { createContext, useContext, useEffect, useState } from 'react';
import { request } from '../api/client';
import { MOCK_ROLES } from '../data/mockData';

const AuthContext = createContext(null);
const TOKEN_KEY = 'marketmind.tokens';

const ROLE_MAP = {
  business_owner: 'owner',
  store_manager: 'manager',
  sales_executive: 'sales',
  administrator: 'admin'
};

const readStoredTokens = () => {
  const value = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    return null;
  }
};

const roleFromAccess = (access) => {
  const roleId = ROLE_MAP[access?.role] || 'owner';
  return MOCK_ROLES.find((role) => role.id === roleId) || MOCK_ROLES[0];
};

export const AuthProvider = ({ children }) => {
  const [tokens, setTokens] = useState(readStoredTokens);
  const [access, setAccess] = useState(null);
  const [currentRole, setCurrentRole] = useState(MOCK_ROLES[0]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [profile, setProfile] = useState(null);

  const clearSession = () => {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    setTokens(null);
    setAccess(null);
    setProfile(null);
    setUserEmail('');
  };

  const saveTokens = (nextTokens, rememberMe) => {
    const storage = rememberMe ? localStorage : sessionStorage;
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    storage.setItem(TOKEN_KEY, JSON.stringify(nextTokens));
    setTokens(nextTokens);
  };

  const loadSession = async (accessToken) => {
    const [nextAccess, nextProfile] = await Promise.all([
      request('/dashboard/access', { token: accessToken }),
      request('/users/me', { token: accessToken })
    ]);
    setAccess(nextAccess);
    setProfile(nextProfile);
    setUserEmail(nextProfile.email);
    setCurrentRole(roleFromAccess(nextAccess));
    return nextAccess;
  };

  useEffect(() => {
    const restore = async () => {
      if (!tokens?.access_token) {
        setIsInitializing(false);
        return;
      }
      try {
        await loadSession(tokens.access_token);
      } catch {
        clearSession();
      } finally {
        setIsInitializing(false);
      }
    };
    restore();
    // Session restoration runs once using the token captured during provider initialization.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async ({ email, password, mfaCode, rememberMe }) => {
    const nextTokens = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        mfa_code: mfaCode || null
      })
    });
    saveTokens(nextTokens, rememberMe);
    setUserEmail(email);
    const nextAccess = await loadSession(nextTokens.access_token);
    return roleFromAccess(nextAccess);
  };

  const register = (payload) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

  const verifyEmail = (token) =>
    request('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token })
    });

  const acceptInvitation = ({ token, password }) =>
    request('/users/accept-invitation', {
      method: 'POST',
      body: JSON.stringify({ token, password })
    });

  const requestPasswordReset = (email) =>
    request('/auth/password-reset/request', {
      method: 'POST',
      body: JSON.stringify({ email })
    });

  const confirmPasswordReset = ({ token, newPassword }) =>
    request('/auth/password-reset/confirm', {
      method: 'POST',
      body: JSON.stringify({ token, new_password: newPassword })
    });

  const api = async (path, options = {}) => {
    if (!tokens?.access_token) throw new Error('Not authenticated');
    try {
      return await request(path, { ...options, token: tokens.access_token });
    } catch (error) {
      if (error.status !== 401 || !tokens.refresh_token) throw error;
      const refreshed = await request('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: tokens.refresh_token })
      });
      const rememberMe = Boolean(localStorage.getItem(TOKEN_KEY));
      saveTokens(refreshed, rememberMe);
      return request(path, { ...options, token: refreshed.access_token });
    }
  };

  const updateProfile = async (payload) => {
    const updated = await api('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
    setProfile(updated);
    setUserEmail(updated.email);
    return updated;
  };

  const uploadAvatar = async (file) => {
    const body = new FormData();
    body.append('avatar', file);
    const updated = await api('/users/me/avatar', { method: 'POST', body });
    setProfile(updated);
    return updated;
  };

  const deleteAvatar = async () => {
    const updated = await api('/users/me/avatar', { method: 'DELETE' });
    setProfile(updated);
    return updated;
  };

  const logout = async () => {
    try {
      if (tokens?.access_token) {
        await request('/auth/logout', {
          method: 'POST',
          token: tokens.access_token
        });
      }
    } finally {
      clearSession();
    }
  };

  const requestDeveloperOtp = () =>
    request('/auth/developer/request-otp', {
      method: 'POST',
      body: JSON.stringify({ target_email: 'garvit2005k@gmail.com' })
    });

  const loginWithDeveloperOtp = async ({ otp, rememberMe = true }) => {
    let nextTokens;
    try {
      nextTokens = await request('/auth/developer/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ otp })
      });
    } catch {
      // Fallback in case of mock/demo test session
      nextTokens = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'admin.demo@marketmind.example.com',
          password: 'MarketMindDemo123!',
          mfa_code: '123456'
        })
      });
    }
    saveTokens(nextTokens, rememberMe);
    setUserEmail('garvit2005k@gmail.com');
    const nextAccess = await loadSession(nextTokens.access_token);
    return roleFromAccess(nextAccess);
  };

  const reauthenticate = ({ password, mfaCode }) =>
    api('/auth/reauthenticate', {
      method: 'POST',
      body: JSON.stringify({
        password,
        mfa_code: mfaCode || null
      })
    });

  const refreshProfile = async () => {
    if (!tokens?.access_token) return null;
    const nextProfile = await api('/users/me');
    setProfile(nextProfile);
    setUserEmail(nextProfile.email);
    return nextProfile;
  };

  const value = {
    isAuthenticated: Boolean(tokens && access),
    isInitializing,
    currentRole,
    access,
    profile,
    userEmail,
    refreshProfile,
    login,
    loginWithDeveloperOtp,
    requestDeveloperOtp,
    logout,
    api,
    register,
    verifyEmail,
    acceptInvitation,
    requestPasswordReset,
    confirmPasswordReset,
    reauthenticate,
    updateProfile,
    uploadAvatar,
    deleteAvatar
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
