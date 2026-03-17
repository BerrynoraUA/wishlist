export type PaginationParams = {
  skip?: number;
  take?: number;
  search?: string; 
};

export interface Notification {
  id: string;
  sender_id: string;
  receiver_id: string;
  sender_name: string;
  text: string;
  icon_type: number;
  is_read: boolean;
  created_at: string;
}