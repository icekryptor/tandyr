export type UserRole = 'employee' | 'admin';

export type CompanyRole = 'baker' | 'manager' | 'tech_specialist' | 'admin' | 'owner';

export type BankName = 'sber' | 'tbank' | 'alfa' | 'vtb' | 'raiffeisen' | 'gazprom' | 'rosbank' | 'otkrytie' | 'other';

export type ShiftStatus = 'open' | 'closed';

export type TechRequestStatus = 'pending' | 'in_progress' | 'resolved';

export type SalaryStatus = 'calculated' | 'paid';
export type WeeklySalaryStatus = 'pending' | 'paid';

export type ChatRoomType = 'direct' | 'group';

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  company_role: CompanyRole | null;
  phone: string | null;
  store_id: string | null;
  avatar_url: string | null;
  push_token: string | null;
  is_active: boolean;
  created_at: string;

  // Basic
  birth_date: string | null;
  city: string | null;

  // Payment
  bank_name: BankName | null;
  card_number: string | null;
  card_pin: string | null;
  debt: number;

  // Documents
  patent_expires_at: string | null;
  patent_region: string | null;
  nationality: string | null;
  passport_number: string | null;
  med_book_expires_at: string | null;

  // Files
  contract_url: string | null;
  passport_url: string | null;
}

export type StoreChain = 'lenta' | 'magnit' | 'okey';

export type ResourceType = 'flour' | 'sugar' | 'salt' | 'oil' | 'dry_milk' | 'yeast';

export interface Store {
  id: string;
  store_number: number | null;
  name: string;
  address: string;
  city: string | null;
  city_id: string | null;
  latitude: number;
  longitude: number;
  chain: StoreChain | null;
  contact_email: string | null;
  contact_phone: string | null;
  manager_id: string | null;
  tech_specialist_id: string | null;
  created_at: string;
  resources?: StoreResource[];
  manager?: Pick<User, 'id' | 'full_name'> | null;
  tech_specialist?: Pick<User, 'id' | 'full_name'> | null;
}

export interface StoreResource {
  id: string;
  store_id: string;
  resource: ResourceType;
  quantity_kg: number;
  updated_at: string;
}

export interface Shift {
  id: string;
  shift_number: number | null;
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
  accrual: number | null;
  fine: number | null;
  fine_reason: string | null;
  fine_comment: string | null;
  created_at: string;
  user?: Pick<User, 'id' | 'full_name' | 'email'>;
  store?: Pick<Store, 'id' | 'name'>;
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
  store_id: string | null;
  photo_url: string | null;
  description: string;
  status: TechRequestStatus;
  created_at: string;
  // Migration 013 fields
  assigned_to: string | null;
  taken_at: string | null;
  deadline: string | null;
  resolution_photo_url: string | null;
  resolution_description: string | null;
  resolution_cost: number | null;
  resolved_at: string | null;
  user?: User;
}

export type InventoryActStatus = 'pending' | 'completed' | 'overdue';

export interface InventoryAct {
  id: string;
  store_id: string;
  user_id: string;
  week_number: number;
  week_year: number;
  scheduled_date: string;
  conducted_at: string | null;
  status: InventoryActStatus;
  created_at: string;
  store?: Pick<Store, 'id' | 'name'>;
  user?: Pick<User, 'id' | 'full_name'>;
  items?: InventoryActItem[];
}

export interface InventoryActItem {
  id: string;
  act_id: string;
  resource_type: string;
  item_name: string;
  quantity_kg: number;
  created_at: string;
}

export interface ChatMember {
  room_id: string;
  user_id: string;
  joined_at: string;
}

export interface City {
  id: string;
  name: string;
  created_at: string;
}

export interface Message {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  media_url: string | null;
  media_type: 'image' | 'video' | null;
  edited_at: string | null;
  is_deleted: boolean;
  created_at: string;
  user?: Pick<User, 'id' | 'full_name' | 'avatar_url'>;
}

export interface ChatRoom {
  id: string;
  name: string;
  type: ChatRoomType;
  room_type: 'general' | 'admin_support' | 'tech_city';
  city_id: string | null;
  created_at: string;
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

export interface WeeklySalary {
  id: string;
  user_id: string;
  week_number: number;
  week_year: number;
  period_start: string;
  period_end: string;
  shift_count: number;
  total_kg: number;
  accrual_kg: number;
  accrual_shift: number;
  total_accrual: number;
  fines_total: number;
  current_debt: number;
  transferred: number | null;
  debt_written_off: number | null;
  status: WeeklySalaryStatus;
  created_at: string;
  updated_at: string;
  user?: Pick<User, 'id' | 'full_name' | 'email'>;
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

export interface Setting {
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}
