export interface HomeInfoCard {
  title: string;
  text: string;
}

export interface HomeFaqItem {
  id: string;
  q: string;
  a: string;
}

export const WHY_CHOOSE_ITEMS: HomeInfoCard[] = [
  {
    title: "No Middlemen",
    text: "You book directly with the car owner without layered marketplace markups. This keeps final rental pricing fair, competitive, and easier to trust.",
  },
  {
    title: "Transparent Pricing",
    text: "Before confirmation, you see rental price, deposit, insurance, and key terms. This removes surprise charges and makes comparison between listings straightforward.",
  },
  {
    title: "Smart Local Pickup",
    text: "The platform lets you choose a car in your exact location directly from the owner, without delivery cost impact. With local matching in your district, savings can reach up to 100% of one rental day price.",
  },
  {
    title: "Strong Car Selection",
    text: "You can compare options by price, rental terms, and host rating in one place. This helps you pick the right car faster for your route, schedule, and travel style.",
  },
  {
    title: "Built for Phuket",
    text: "The experience is tailored to Phuket and real island rental scenarios. Booking becomes more practical and predictable, especially during high season periods.",
  },
  {
    title: "Fast Support",
    text: "Quick communication with support and hosts reduces resolution time. Pickup, booking updates, and returns feel smoother and more predictable end to end.",
  },
  {
    title: "No-Deposit Offers",
    text: "Unique listings are available where you can rent with zero deposit requirements. This lowers entry cost and frees budget for accommodation, activities, and island travel.",
  },
  {
    title: "Full Insurance Options",
    text: "Some cars include full insurance plans with broader risk coverage. This gives more peace of mind and reduces financial exposure during unexpected incidents.",
  },
  {
    title: "Unique Terms",
    text: "Hosts publish custom terms: flexible handoff, special pricing, and seasonal advantages. You get tailored deals instead of generic offers, better matched to your budget and trip plan.",
  },
];

export const HOME_FAQ_ITEMS: HomeFaqItem[] = [
  {
    id: "faq-1",
    q: "What do I need to rent a car?",
    a: "To rent on PhuketRide, you typically need a valid passport, a valid driver license, and booking confirmation. Some hosts may request additional verification details such as contact number or flight information for precise handoff timing. The full requirement list is always shown in the specific car listing, so you know exactly what to prepare before pickup.",
  },
  {
    id: "faq-2",
    q: "Are there any hidden fees?",
    a: "Key charges are visible before confirmation: daily rental rate, deposit amount, selected insurance, and district delivery cost when applicable. This gives you a clear total estimate before checkout and helps compare offers without last-minute surprises. If a listing has extra conditions, they are explicitly stated in the car details.",
  },
  {
    id: "faq-3",
    q: "Can I get the car delivered to my hotel?",
    a: "Yes, many hosts support hotel delivery. Availability and price depend on district, host schedule, and listing settings. Before booking, you can see whether delivery is supported for your area and choose a convenient handoff location in advance. This is especially useful if you want to start your trip directly from your hotel.",
  },
  {
    id: "faq-4",
    q: "Can I get the car at the airport?",
    a: "Airport handoff is available when the host supports it. Conditions depend on arrival time, meeting zone, and district delivery pricing. Core details are shown in the listing, and specifics can be finalized before confirmation. This helps you avoid extra transfer steps after landing and move directly into your trip.",
  },
  {
    id: "faq-5",
    q: "How is the deposit calculated?",
    a: "The deposit is set by the host and displayed in the listing before booking. The amount may vary by car class, insurance setup, rental length, and host policy. You see this value in advance and can compare alternatives with lower upfront requirements. This keeps budgeting predictable for guests and protection clear for hosts.",
  },
  {
    id: "faq-6",
    q: "Is there a mileage limit?",
    a: "Mileage rules depend on the specific listing and host policy. Some cars offer flexible limits, while others use fixed daily or total caps for the rental period. Check this field before confirming, especially for longer routes around the island. Choosing the right mileage policy upfront helps avoid extra charges.",
  },
  {
    id: "faq-7",
    q: "Can I add a second driver?",
    a: "In many cases, yes, but it depends on host rules and insurance conditions. Additional drivers are usually required to provide identity and license details for verification. If you plan to share driving, confirm this before payment so everything is properly documented. This improves safety and reduces disputes during rental.",
  },
  {
    id: "faq-8",
    q: "What insurance options are available?",
    a: "Each listing shows available insurance plans and their pricing, so you can choose the right protection level for your trip. Options generally differ by coverage scope, deductible, and final cost impact. Seeing this comparison upfront makes decision-making easier. You can choose basic protection or broader full-coverage packages.",
  },
  {
    id: "faq-9",
    q: "What if my flight is delayed?",
    a: "If your flight is delayed, notify support and the host as early as possible. In most cases, a revised handoff slot can be arranged without cancelling the booking. Early updates make schedule adjustments easier and reduce airport coordination issues. This keeps your rental start smooth even with airline changes.",
  },
  {
    id: "faq-10",
    q: "Can I extend my rental period?",
    a: "Extensions are possible if the car remains available after your current end date and the host approves the request. It is best to request changes early, especially in high season when calendars fill quickly. Once approved, pricing is recalculated for the new dates and terms. This lets you continue your trip without changing vehicles.",
  },
  {
    id: "faq-11",
    q: "How does deposit return work?",
    a: "Deposit return is processed after rental completion and condition check according to booking terms. Hosts usually verify basic points such as exterior condition, equipment completeness, and agreed usage rules. If there are no disputes, the deposit is returned within the stated timeline. This creates a clear and predictable closeout process for both sides.",
  },
  {
    id: "faq-12",
    q: "What should I do if my plans change?",
    a: "If your plans change, contact support and the host immediately through PhuketRide. Early notice increases the chance of adjusting dates, pickup location, or other booking details with minimal loss. Modification terms depend on the specific booking and timing of your request. Acting quickly gives you more available options and better outcomes.",
  },
];
