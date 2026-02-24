export type UserRole = 'employee' | 'admin';

export type ShiftStatus = 'open' | 'closed';

export type TechRequestStatus = 'pending' | 'in_progress' | 'resolved';

export type SalaryStatus = 'calculated' | 'paid';

export type ChatRoomType = 'direct' | 'group';

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  store_id: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Store {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  created_at: string;
}

export interface Shift {
  id: string;
  user_id: string;
  store_id: string;
  start_photo_url: string;
  start_lat: number;
  start_lng: number;
  start_time: string;
  end_photo_url: string | null;
  end_lat: number | null;
  end_lng: number | null;
  end_time: string | null;
  production_kg: number | null;
  status: ShiftStatus;
  created_at: string;
  user?: User;
  store?: Store;
}

export interface ProgressReport {
  id: string;
  shift_id: string;
  production_kg: number;
  reported_at: string;
  created_at: string;
}

export interface TechRequest {
  id: string;
  user_id: string;
  shift_id: string | null;
  photo_url: string | null;
  description: string;
  status: TechRequestStatus;
  created_at: string;
  user?: User;
}

export interface ChatRoom {
  id: string;
  name: string;
  type: ChatRoomType;
  created_at: string;
}

export interface ChatMember {
  room_id: string;
  user_id: string;
  joined_at: string;
}

export interface Message {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: User;
}

export interface SalaryRecord {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  total_kg: number;
  rate_per_kg: number;
  total_amount: number;
  status: SalaryStatus;
  created_at: string;
  user?: User;
}

export interface InventoryItem {
  id: string;
  store_id: string;
  item_name: string;
  quantity: number;
  unit: string;
  updated_at: string;
  store?: Store;
}

export interface Supply {
  id: string;
  store_id: string;
  item_name: string;
  quantity: number;
  unit: string;
  supplier: string | null;
  supplied_at: string;
  created_at: string;
  store?: Store;
}
