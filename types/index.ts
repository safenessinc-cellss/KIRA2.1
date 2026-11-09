import type { Timestamp } from "firebase/firestore";

export type Role = "alumno" | "coach" | "admin" | "hr_admin" | "company_admin" | "company_member";
export type Roles = Role;

export interface User {
  [key: string]: any;
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: Role;
  approvalStatus?: "pending" | "approved" | "rejected";
  companyId?: string;
  organizationId?: string;
  orgId?: string;
  points?: number;
  energyPoints?: number;
  unlockedTools?: string[];
  membershipStatus?: "inactive" | "pending" | "active" | "expired" | string;
  membershipExpiresAt?: Timestamp | Date | null;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

export interface Course {
  id: string;
  title: string;
  description?: string;
  status: "draft" | "pending" | "published" | string;
  published?: boolean;
  coachId: string;
  price?: number;
  order?: number;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  progress: number;
  status?: "active" | "completed" | "cancelled" | string;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

export interface Session {
  id: string;
  coachId: string;
  userId: string;
  transcript?: string;
  summary?: string;
  commitments?: Array<{ task: string; deadline?: string; priority?: string }>;
  analysis?: Record<string, unknown>;
  createdAt?: Timestamp | Date;
}

export interface JournalEntry {
  id: string;
  userId: string;
  text?: string;
  content?: string;
  mood?: string;
  sentiment?: string;
  tags?: string[];
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

export interface Transaction {
  id: string;
  userId: string;
  coachId?: string;
  amount: number;
  currency: string;
  status: string;
  provider?: "stripe" | "mercadopago" | string;
  eventId?: string;
  createdAt?: Timestamp | Date;
}

export interface Review {
  id: string;
  userId: string;
  coachId?: string;
  courseId?: string;
  rating: number;
  comment?: string;
  status?: "pending" | "published" | "hidden" | string;
  createdAt?: Timestamp | Date;
}

export interface Nudge {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt?: Timestamp | Date;
  readAt?: Timestamp | Date | null;
}

export interface WebsiteSettings {
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  brandName?: string;
  updatedAt?: Timestamp | Date;
  [key: string]: unknown;
}
