export type DiscoverItem = {
  id: string;
  title: string;
  price: number;
  store: string;
  image: string;
  priority?: "Low" | "Medium" | "High";
};

export type DiscoverSection = {
  id: string;
  owner: string;
  username: string;
  wishlist: string;
  date?: string;
  items: DiscoverItem[];
};

export const getDaysUntil = (eventDate: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const event = new Date(eventDate);
  event.setHours(0, 0, 0, 0);
  const diffTime = event.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const formatShortDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const getDaysText = (days: number): string => {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days < 0) return `${Math.abs(days)} days ago`;
  return `in ${days} days`;
};
