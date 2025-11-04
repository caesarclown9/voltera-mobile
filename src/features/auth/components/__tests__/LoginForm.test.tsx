import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LoginForm } from "../LoginForm";

// Mock the auth hook
vi.mock("../../hooks/useAuth", () => ({
  useLogin: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ success: true }),
    isPending: false,
    error: null,
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("LoginForm", () => {
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render login form fields", () => {
    const wrapper = createWrapper();
    render(<LoginForm onSuccess={mockOnSuccess} />, { wrapper });

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/пароль/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /войти/i })).toBeInTheDocument();
  });

  it("should validate email format", async () => {
    const wrapper = createWrapper();
    render(<LoginForm onSuccess={mockOnSuccess} />, { wrapper });

    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole("button", { name: /войти/i });

    fireEvent.change(emailInput, { target: { value: "invalid-email" } });
    fireEvent.click(submitButton);

    // Should show validation error or button should be disabled
    expect(submitButton).toBeDisabled();
  });

  it("should enable submit button with valid inputs", async () => {
    const wrapper = createWrapper();
    render(<LoginForm onSuccess={mockOnSuccess} />, { wrapper });

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/пароль/i);
    const submitButton = screen.getByRole("button", { name: /войти/i });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });

    expect(submitButton).not.toBeDisabled();
  });

  it("should toggle between login and signup modes", () => {
    const wrapper = createWrapper();
    render(<LoginForm onSuccess={mockOnSuccess} />, { wrapper });

    const toggleButton = screen.getByText(/нет аккаунта/i);
    fireEvent.click(toggleButton);

    expect(
      screen.getByRole("button", { name: /зарегистрироваться/i }),
    ).toBeInTheDocument();
  });

  it("should call onSuccess when login is successful", async () => {
    const wrapper = createWrapper();
    render(<LoginForm onSuccess={mockOnSuccess} />, { wrapper });

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/пароль/i);
    const submitButton = screen.getByRole("button", { name: /войти/i });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith("test@example.com");
    });
  });
});
