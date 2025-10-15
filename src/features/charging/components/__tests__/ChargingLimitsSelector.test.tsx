import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChargingLimitsSelector } from "../ChargingLimitsSelector";

describe("ChargingLimitsSelector", () => {
  const defaultProps = {
    balance: 1000,
    pricePerKwh: 13.5,
    maxPowerKw: 22,
    onLimitsChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all three charging modes", () => {
    render(<ChargingLimitsSelector {...defaultProps} />);

    expect(screen.getByText("По сумме")).toBeInTheDocument();
    expect(screen.getByText("По энергии")).toBeInTheDocument();
    expect(screen.getByText("Полный бак")).toBeInTheDocument();
  });

  it("defaults to amount mode", () => {
    render(<ChargingLimitsSelector {...defaultProps} />);

    // Check that amount mode content is visible
    expect(screen.getByText("Сумма зарядки")).toBeInTheDocument();
    expect(screen.getAllByText("100 сом").length).toBeGreaterThan(0); // Default amount appears in summary
  });

  it("switches between modes correctly", () => {
    render(<ChargingLimitsSelector {...defaultProps} />);

    // Switch to energy mode
    fireEvent.click(screen.getByText("По энергии"));
    expect(screen.getByText("Количество энергии")).toBeInTheDocument();

    // Switch to full tank mode
    fireEvent.click(screen.getByText("Полный бак"));
    expect(screen.getByText("Полная зарядка")).toBeInTheDocument();
  });

  it("calls onLimitsChange with correct data when amount changes", () => {
    render(<ChargingLimitsSelector {...defaultProps} />);

    // Click quick amount button
    fireEvent.click(screen.getByText("200с"));

    expect(defaultProps.onLimitsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "amount",
        amount_som: 200,
        estimatedEnergy: expect.any(Number),
        estimatedCost: 200,
      }),
    );
  });

  it("calculates energy correctly from amount", () => {
    render(<ChargingLimitsSelector {...defaultProps} />);

    // 200 som / 13.5 som per kWh ≈ 14.81 kWh
    fireEvent.click(screen.getByText("200с"));

    expect(defaultProps.onLimitsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        estimatedEnergy: expect.closeTo(14.81, 1),
      }),
    );
  });

  it("calculates cost correctly from energy", () => {
    render(<ChargingLimitsSelector {...defaultProps} />);

    // Switch to energy mode
    fireEvent.click(screen.getByText("По энергии"));

    // Select 10 kWh
    fireEvent.click(screen.getByText("10кВт"));

    // 10 kWh * 13.5 som = 135 som
    expect(defaultProps.onLimitsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "energy",
        energy_kwh: 10,
        estimatedCost: 135,
      }),
    );
  });

  it("disables amount buttons that exceed balance", () => {
    render(<ChargingLimitsSelector {...defaultProps} balance={100} />);

    const button200 = screen.getByText("200с");
    const button500 = screen.getByText("500с");

    expect(button200).toBeDisabled();
    expect(button500).toBeDisabled();
  });

  it("shows warning when energy cost exceeds balance", () => {
    render(<ChargingLimitsSelector {...defaultProps} balance={100} />);

    // Switch to energy mode
    fireEvent.click(screen.getByText("По энергии"));

    // Select 20 kWh (costs 340 som, exceeds 100 som balance)
    fireEvent.click(screen.getByText("20кВт"));

    expect(screen.getByText(/Недостаточно средств/)).toBeInTheDocument();
  });

  it("handles custom value input correctly", () => {
    render(<ChargingLimitsSelector {...defaultProps} />);

    const input = screen.getByPlaceholderText("50-1000");
    fireEvent.change(input, { target: { value: "250" } });

    expect(defaultProps.onLimitsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        amount_som: 250,
      }),
    );
  });

  it("validates custom value input to allow only numbers", () => {
    render(<ChargingLimitsSelector {...defaultProps} />);

    const input = screen.getByPlaceholderText("50-1000");
    fireEvent.change(input, { target: { value: "abc123" } });

    // Should not update with invalid input
    expect(defaultProps.onLimitsChange).not.toHaveBeenCalledWith(
      expect.objectContaining({
        amount_som: NaN,
      }),
    );
  });

  it("disables all inputs when disabled prop is true", () => {
    render(<ChargingLimitsSelector {...defaultProps} disabled={true} />);

    const amountButton = screen.getByRole("button", { name: "По сумме" });
    const quickButton = screen.getByText("100с");
    const slider = screen.getByRole("slider");

    expect(amountButton).toHaveClass("cursor-not-allowed");
    expect(quickButton).toBeDisabled();
    expect(slider).toBeDisabled();
  });

  it("formats duration correctly", () => {
    render(<ChargingLimitsSelector {...defaultProps} />);

    // Should show estimated duration
    expect(screen.getByText(/~\d+ мин/)).toBeInTheDocument();
  });

  it("handles none (full tank) mode correctly", () => {
    render(<ChargingLimitsSelector {...defaultProps} />);

    fireEvent.click(screen.getByText("Полный бак"));

    expect(defaultProps.onLimitsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "none",
        estimatedEnergy: undefined,
        estimatedCost: undefined,
        estimatedDuration: undefined,
      }),
    );
  });
});
