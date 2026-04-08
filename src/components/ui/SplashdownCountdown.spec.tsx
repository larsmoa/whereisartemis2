import { render, screen } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SplashdownCountdown, useShowSplashdownCountdown } from "./SplashdownCountdown";

vi.mock(import("@/lib/mission-phase"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getMissionPhase: vi.fn(),
    getSecondsToSplashdown: vi.fn(),
    isInCountdownWindow: vi.fn(),
  };
});

const missionPhaseModule = await import("@/lib/mission-phase");
const mockGetPhase = vi.mocked(missionPhaseModule.getMissionPhase);
const mockGetSeconds = vi.mocked(missionPhaseModule.getSecondsToSplashdown);
const mockInWindow = vi.mocked(missionPhaseModule.isInCountdownWindow);

beforeEach(() => vi.clearAllMocks());

describe("SplashdownCountdown", () => {
  it("shows standard amber countdown for T−30m (non-critical)", () => {
    // Arrange — 20 minutes to go, well outside the 5-min critical window
    mockGetSeconds.mockReturnValue(1200);
    mockGetPhase.mockReturnValue("RETURN");

    // Act
    render(<SplashdownCountdown />);

    // Assert
    expect(screen.getByText("Splashdown")).toBeInTheDocument();
    expect(screen.getByText(/T−20m/)).toBeInTheDocument();
    expect(screen.getByText("countdown")).toBeInTheDocument();
  });

  it("shows critical pulsing style and 'imminent' sub at T−5m", () => {
    // Arrange — 4 minutes 59 seconds remaining (within ≤300s window)
    mockGetSeconds.mockReturnValue(299);
    mockGetPhase.mockReturnValue("REENTRY");

    // Act
    render(<SplashdownCountdown />);

    // Assert
    expect(screen.getByText("Splashdown")).toBeInTheDocument();
    expect(screen.getByText(/T−04m 59s/)).toBeInTheDocument();
    expect(screen.getByText("imminent")).toBeInTheDocument();
  });

  it("shows 'NOW' and 'Pacific Ocean' during SPLASHDOWN_MOMENT phase", () => {
    // Arrange
    mockGetSeconds.mockReturnValue(0);
    mockGetPhase.mockReturnValue("SPLASHDOWN_MOMENT");

    // Act
    render(<SplashdownCountdown />);

    // Assert
    expect(screen.getByText("SPLASHDOWN")).toBeInTheDocument();
    expect(screen.getByText("NOW")).toBeInTheDocument();
    expect(screen.getByText("Pacific Ocean")).toBeInTheDocument();
  });

  it("shows T+ elapsed time for COMPLETE phase", () => {
    // Arrange — 90 seconds after splashdown
    mockGetSeconds.mockReturnValue(-90);
    mockGetPhase.mockReturnValue("COMPLETE");

    // Act
    render(<SplashdownCountdown />);

    // Assert
    expect(screen.getByText("Splashdown +")).toBeInTheDocument();
    expect(screen.getByText(/T\+1m 30s/)).toBeInTheDocument();
    expect(screen.getByText("mission complete")).toBeInTheDocument();
  });

  it("formats hours correctly when more than one hour remains", () => {
    // Arrange — 1 hour 1 minute 1 second remaining
    mockGetSeconds.mockReturnValue(3661);
    mockGetPhase.mockReturnValue("RETURN");

    // Act
    render(<SplashdownCountdown />);

    // Assert
    expect(screen.getByText(/T−1h 01m 01s/)).toBeInTheDocument();
  });
});

describe("useShowSplashdownCountdown", () => {
  it("returns false when outside countdown window and in a non-terminal phase", () => {
    // Arrange
    mockInWindow.mockReturnValue(false);
    mockGetPhase.mockReturnValue("OUTBOUND");

    // Act
    const { result } = renderHook(() => useShowSplashdownCountdown());

    // Assert
    expect(result.current).toBe(false);
  });

  it("returns true when inside the 30-minute countdown window", () => {
    // Arrange
    mockInWindow.mockReturnValue(true);
    mockGetPhase.mockReturnValue("REENTRY");

    // Act
    const { result } = renderHook(() => useShowSplashdownCountdown());

    // Assert
    expect(result.current).toBe(true);
  });

  it("returns true during SPLASHDOWN_MOMENT even if isInCountdownWindow is false", () => {
    // Arrange
    mockInWindow.mockReturnValue(false);
    mockGetPhase.mockReturnValue("SPLASHDOWN_MOMENT");

    // Act
    const { result } = renderHook(() => useShowSplashdownCountdown());

    // Assert
    expect(result.current).toBe(true);
  });

  it("returns true during COMPLETE phase", () => {
    // Arrange
    mockInWindow.mockReturnValue(false);
    mockGetPhase.mockReturnValue("COMPLETE");

    // Act
    const { result } = renderHook(() => useShowSplashdownCountdown());

    // Assert
    expect(result.current).toBe(true);
  });
});
