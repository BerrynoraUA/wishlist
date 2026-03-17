export type Friend = {
  id: string;
  name: string;
  username: string;
  wishlists: number;
  mutual: number;
};

export type FriendRequest = {
  id: string;
  name: string;
  username: string;
  mutual: number;
};

export const friends: Friend[] = [
  {
    id: "1",
    name: "Emma Thompson",
    username: "emma_t",
    wishlists: 4,
    mutual: 5,
  },
  {
    id: "2",
    name: "James Wilson",
    username: "jwilson",
    wishlists: 2,
    mutual: 3,
  },
  {
    id: "3",
    name: "Olivia Parker",
    username: "olivia_p",
    wishlists: 6,
    mutual: 8,
  },
  {
    id: "4",
    name: "Michael Chen",
    username: "mchen",
    wishlists: 3,
    mutual: 2,
  },
  {
    id: "5",
    name: "Sophie Anderson",
    username: "sophiea",
    wishlists: 5,
    mutual: 4,
  },
  {
    id: "6",
    name: "David Kim",
    username: "davidk",
    wishlists: 1,
    mutual: 1,
  },
];

export const requests: FriendRequest[] = [
  {
    id: "r1",
    name: "Alex Rivera",
    username: "alexr",
    mutual: 2,
  },
  {
    id: "r2",
    name: "Rachel Green",
    username: "rgreen",
    mutual: 5,
  },
];
