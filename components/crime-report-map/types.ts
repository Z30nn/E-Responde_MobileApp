export interface CrimeReportMapProps {
  reportId: string;
  crimeLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  onClose: () => void;
}

export interface PoliceLocation {
  id: string;
  latitude: number;
  longitude: number;
  name: string;
  badgeNumber?: string;
  lastUpdated: string;
}

export interface RouteCoordinate {
  latitude: number;
  longitude: number;
}
