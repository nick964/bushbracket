// Prize pot config. The pot starts with the organizer's base amount and grows
// as players buy in over Venmo; the running total is stored server-side and
// adjusted from the admin screen as payments land.

export const BASE_POT = 30;
export const BUY_IN = 5;
export const VENMO_HANDLE = "nicky_robby";

// LCQ side event: the organizer isn't seeding it, so the pot is buy-ins only.
export const LCQ_BASE_POT = 0;
