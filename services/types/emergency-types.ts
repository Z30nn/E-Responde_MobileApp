export interface EmergencyContact {
  id: string;
  name: string;
  phoneNumber: string;
  relationship: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface CreateEmergencyContactData {
  name: string;
  phoneNumber: string;
  relationship: string;
  isPrimary?: boolean;
}

export interface UpdateEmergencyContactData {
  name?: string;
  phoneNumber?: string;
  relationship?: string;
  isPrimary?: boolean;
}
