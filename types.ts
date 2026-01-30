export type Status = "Rejada" | "Jarayonda" | "Bajarildi";
export type Priority = "Juda muhum" | "Muhum" | "Muhum emas";
export type Overdue = "Ha" | "Yo'q";

export interface Task {
  id: string; // 6 digits unique
  sana: string; // ISO Date YYYY-MM-DD (Created Date)
  vazifa: string; // Title
  tavsif: string; // Description
  status: Status;
  izoh: string; // Notes
  prioritet: Priority;
  dedlayn: string | null; // ISO Date YYYY-MM-DD
  progress: number; // 0.0 to 1.0
}

export const STATUS_OPTIONS: Status[] = ["Rejada", "Jarayonda", "Bajarildi"];
export const PRIORITY_OPTIONS: Priority[] = ["Juda muhum", "Muhum", "Muhum emas"];

// Helper to check if task matches week logic
// Note: Prompt says "inSelectedWeek: sana between weekStart and weekEnd"
export interface WeekRange {
  start: Date;
  end: Date;
}