export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface HorizonsBody {
  /** Earth-centered J2000 ecliptic position in km */
  position: Vec3;
  /** Velocity in km/s */
  velocity: Vec3;
  /** One-way light-time in seconds */
  lightTime: number;
  /** Range from Earth center in km */
  rangeKm: number;
  /** Radial velocity in km/s (positive = moving away) */
  rangeRate: number;
}

export interface TrajectoryPoint {
  position: Vec3;
  velocity: Vec3;
  date: Date;
}

/** A single point along the spacecraft trajectory in scene-space coordinates */
export type ScenePoint = [number, number, number];

export interface TrajectoryDataPoint {
  position: ScenePoint;
  speedKms: number;
  date: string;
}

/** Camera mode for the mission 3D view */
export type SceneView = "top" | "side" | "free";

export interface ArtemisData {
  spacecraft: HorizonsBody;
  moon: HorizonsBody;
  /** Speed magnitude in km/s */
  speedKms: number;
  /** Distance from Earth surface in km */
  distanceFromEarthKm: number;
  /** Distance from Moon surface in km */
  distanceFromMoonKm: number;
  /** One-way signal delay in seconds */
  signalDelaySeconds: number;
  /** Mission elapsed time in seconds since launch */
  missionElapsedSeconds: number;
  /** ISO timestamp of this data snapshot */
  timestamp: string;
}

export interface ArtemisEvent {
  id: string;
  timestamp: string; // ISO 8601 format
  name: string;
  description: string;
  thumbnail: string;
  url?: string;
}
