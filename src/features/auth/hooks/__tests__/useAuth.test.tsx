import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLogin, useLogout, useAuthStatus } from '../useAuth';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store';
import React from 'react';

// Mock auth service
vi.mock('../../services/authService', () => ({
  authService: {
    login: vi.fn(),
    logout: vi.fn(),
    validateToken: vi.fn(),
    getUserFromToken: vi.fn(),
  }
}));

// Mock auth store
vi.mock('../../store', () => ({
  useAuthStore: vi.fn(() => ({
    setAuth: vi.fn(),
    clearAuth: vi.fn(),
    user: null,
    isAuthenticated: false,
  }))
}));

describe('Auth Hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('useLogin', () => {
    it('successfully logs in user', async () => {
      const mockResponse = {
        token: 'test-token',
        refreshToken: 'refresh-token',
        user: {
          id: '123',
          email: 'test@test.com',
          name: 'Test User'
        }
      };

      (authService.login as any).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useLogin(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          email: 'test@test.com',
          password: 'password123'
        });
      });

      expect(authService.login).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'password123'
      });

      expect(result.current.isSuccess).toBe(true);
    });

    it('handles login error correctly', async () => {
      const mockError = new Error('Invalid credentials');
      (authService.login as any).mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useLogin(), { wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            email: 'wrong@test.com',
            password: 'wrong'
          });
        } catch (error) {
          expect(error).toBe(mockError);
        }
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe(mockError);
    });
  });

  describe('useLogout', () => {
    it('successfully logs out user', async () => {
      (authService.logout as any).mockResolvedValueOnce(undefined);

      const mockClearAuth = vi.fn();
      (useAuthStore as any).mockReturnValue({
        clearAuth: mockClearAuth,
      });

      const { result } = renderHook(() => useLogout(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync();
      });

      expect(authService.logout).toHaveBeenCalled();
      expect(mockClearAuth).toHaveBeenCalled();
      expect(result.current.isSuccess).toBe(true);
    });
  });

  describe('useAuthStatus', () => {
    it('returns authenticated user', () => {
      const mockUser = {
        id: '123',
        email: 'test@test.com',
        name: 'Test User'
      };

      (useAuthStore as any).mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
      });

      const { result } = renderHook(() => useAuthStatus());

      expect(result.current.user).toBe(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('returns null when not authenticated', () => {
      (useAuthStore as any).mockReturnValue({
        user: null,
        isAuthenticated: false,
      });

      const { result } = renderHook(() => useAuthStatus());

      expect(result.current.user).toBe(null);
      expect(result.current.isAuthenticated).toBe(false);
    });
  });
});