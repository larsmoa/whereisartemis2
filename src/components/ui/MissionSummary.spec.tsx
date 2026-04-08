import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MissionSummary } from "./MissionSummary";
import type { TrajectoryDataPoint } from "@/types";
import type { UseQueryResult } from "@tanstack/react-query";

vi.mock(import("@/hooks/useArtemisTrajectory"), () => ({
  useArtemisTrajectory: vi.fn(),
}));

vi.mock(import("@/lib/mission-phase"), async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, getSecondsToSplashdown: vi.fn(() => -120) };
});

const { useArtemisTrajectory } = await import("@/hooks/useArtemisTrajectory");
const mockUseTrajectory = vi.mocked(useArtemisTrajectory);

function makeQueryResult(
  data: TrajectoryDataPoint[] | undefined,
): UseQueryResult<TrajectoryDataPoint[], Error> {
  return { data, isPending: data === undefined, isError: false } as UseQueryResult<
    TrajectoryDataPoint[],
    Error
  >;
}

beforeEach(() => vi.clearAllMocks());

describe("MissionSummary", () => {
  it("always renders the mission complete heading", () => {
    // Arrange
    mockUseTrajectory.mockReturnValue(makeQueryResult(undefined));

    // Act
    render(<MissionSummary unitSystem="metric" />);

    // Assert
    expect(screen.getByText("Mission Complete — Artemis II")).toBeInTheDocument();
  });

  it("shows '—' placeholders when trajectory data is not yet loaded", () => {
    // Arrange
    mockUseTrajectory.mockReturnValue(makeQueryResult(undefined));

    // Act
    render(<MissionSummary unitSystem="metric" />);

    // Assert — distance, speed, and farthest-from-earth are all dashes
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(3);
  });

  it("renders all five stat card labels", () => {
    // Arrange
    mockUseTrajectory.mockReturnValue(makeQueryResult([]));

    // Act
    render(<MissionSummary unitSystem="metric" />);

    // Assert
    expect(screen.getByText("Mission Duration")).toBeInTheDocument();
    expect(screen.getByText("Total Distance")).toBeInTheDocument();
    expect(screen.getByText("Peak Speed")).toBeInTheDocument();
    expect(screen.getByText("Farthest from Earth")).toBeInTheDocument();
    expect(screen.getByText("Time Since Splashdown")).toBeInTheDocument();
  });

  it("shows computed metric stats when trajectory data is provided", () => {
    // Arrange — two points separated by 1 scene unit along X
    const points: TrajectoryDataPoint[] = [
      { position: [10, 0, 0], speedKms: 5.5, date: "2026-04-02T02:00:00Z" },
      { position: [11, 0, 0], speedKms: 3.0, date: "2026-04-02T02:10:00Z" },
    ];
    mockUseTrajectory.mockReturnValue(makeQueryResult(points));

    // Act
    render(<MissionSummary unitSystem="metric" />);

    // Assert — distance and speed placeholders are replaced with real values
    const dashes = screen.queryAllByText("—");
    expect(dashes.length).toBeLessThan(3);
    expect(screen.getByText(/km\/s/)).toBeInTheDocument();
  });

  it("shows imperial units when unitSystem is 'us'", () => {
    // Arrange
    const points: TrajectoryDataPoint[] = [
      { position: [10, 0, 0], speedKms: 5.5, date: "2026-04-02T02:00:00Z" },
      { position: [11, 0, 0], speedKms: 3.0, date: "2026-04-02T02:10:00Z" },
    ];
    mockUseTrajectory.mockReturnValue(makeQueryResult(points));

    // Act
    render(<MissionSummary unitSystem="us" />);

    // Assert
    expect(screen.getByText(/mi\/s/)).toBeInTheDocument();
  });

  it("shows T+ elapsed time since splashdown", () => {
    // Arrange — getSecondsToSplashdown mocked to return -120 (2 min past splashdown)
    mockUseTrajectory.mockReturnValue(makeQueryResult([]));

    // Act
    render(<MissionSummary unitSystem="metric" />);

    // Assert
    expect(screen.getByText(/T\+/)).toBeInTheDocument();
  });
});
