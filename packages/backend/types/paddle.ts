export type PaddleCustomData = {
  user_id?: string;
};

export type PaddleBillingCycle = {
  interval: "day" | "week" | "month" | "year";
  frequency: number;
};

export type PaddleItem = {
  price: {
    id: string;
    billing_cycle?: PaddleBillingCycle;
  };
  status?: string;
};

export type PaddleSubscriptionData = {
  id: string;
  status: string;
  customer_id: string;
  custom_data?: PaddleCustomData;
  current_billing_period?: {
    starts_at: string;
    ends_at: string;
  };
  items: PaddleItem[];
  scheduled_change?: {
    action: string;
    effective_at: string;
  } | null;
};

export type PaddleTransactionData = {
  id: string;
  subscription_id?: string;
  customer_id: string;
  custom_data?: PaddleCustomData;
  items: PaddleItem[];
};

export type PaddleEvent = {
  event_type: string;
  data: PaddleSubscriptionData | PaddleTransactionData;
};
