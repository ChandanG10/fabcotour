import type { Address, Category, Order, Product, ProductVariant, Review, User } from "../types/models";
import { slugify } from "../utils/format";

const categorySeed = [
  {
    name: "Men",
    audience: "men",
    description: "Elevated basics, teamwear and event-ready menswear.",
    featured: true
  },
  {
    name: "Women",
    audience: "women",
    description: "Modern silhouettes and versatile gifting-led styles.",
    featured: true
  },
  {
    name: "Kids",
    audience: "kids",
    description: "Comfort-first styles made for everyday movement.",
    featured: true
  },
  {
    name: "T-Shirts",
    audience: "unisex",
    description: "Round neck, oversized and polo staples.",
    featured: true
  },
  {
    name: "Caps & Hats",
    audience: "unisex",
    description: "Structured caps and statement headwear.",
    featured: true
  },
  {
    name: "Hoodies",
    audience: "unisex",
    description: "Layering essentials with a premium finish.",
    featured: false
  },
  {
    name: "Accessories & Gifts",
    audience: "unisex",
    description: "Useful merchandise with clean everyday appeal.",
    featured: true
  },
  {
    name: "Corporate Gifting",
    audience: "business",
    description: "Branded kits, hampers and event-ready bundles.",
    featured: true
  }
] as const;

const subcategories = {
  men: [
    "Round-neck T-shirts",
    "Polo T-shirts",
    "Oversized T-shirts",
    "Activewear jerseys",
    "Hoodies",
    "Joggers"
  ],
  women: [
    "Round-neck T-shirts",
    "Oversized T-shirts",
    "Crop tops",
    "Hoodies",
    "Activewear",
    "Tote bags"
  ],
  kids: [
    "Round-neck T-shirts",
    "Polo T-shirts",
    "Infant rompers",
    "Hoodies",
    "Joggers"
  ],
  "caps-and-hats": ["Baseball caps", "Trucker caps", "Bucket hats", "Beanies"],
  hoodies: ["Classic hoodies", "Zip hoodies", "Sweatshirts"],
  "accessories-and-gifts": [
    "Tote bags",
    "Ceramic mugs",
    "Sipper bottles",
    "Notebooks",
    "Gift boxes"
  ]
} as const;

const colorTokens = [
  ["Midnight Black", "#111111"],
  ["Ivory Cream", "#F7F4EA"],
  ["Sunlit Yellow", "#FFC928"],
  ["Wine Berry", "#7A1931"],
  ["Sage Mist", "#A3B18A"],
  ["Ocean Navy", "#1E3A5F"]
] as const;

const sizeTokens = ["XS", "S", "M", "L", "XL", "XXL"];
const printMethods = [
  "Screen printing",
  "Direct-to-garment",
  "Embroidery",
  "Heat-transfer",
  "Sublimation",
  "Vinyl printing"
];

const productSeed = [
  ["Heritage", "Round-neck T-shirt", "men", "Men", "Cotton jersey", "Classic", "tshirt"],
  ["Draft", "Polo T-shirt", "men", "Men", "Pique cotton", "Tailored", "tshirt"],
  ["Route", "Activewear jersey", "men", "Men", "Moisture-wick knit", "Athletic", "jersey"],
  ["Baseline", "Oversized T-shirt", "men", "T-Shirts", "Heavyweight cotton", "Relaxed", "tshirt"],
  ["Studio", "Round-neck T-shirt", "women", "Women", "Soft combed cotton", "Classic", "tshirt"],
  ["Muse", "Oversized T-shirt", "women", "Women", "Heavyweight cotton", "Relaxed", "tshirt"],
  ["Form", "Crop top", "women", "Women", "Stretch cotton", "Slim", "tshirt"],
  ["Drift", "Classic hoodie", "women", "Women", "Brushed fleece", "Boxy", "hoodie"],
  ["Spark", "Polo T-shirt", "kids", "Kids", "Pique cotton", "Regular", "tshirt"],
  ["Play", "Round-neck T-shirt", "kids", "Kids", "Soft jersey", "Regular", "tshirt"],
  ["Bounce", "Infant romper", "kids", "Kids", "Cotton interlock", "Comfort", "romper"],
  ["Dash", "Joggers", "kids", "Kids", "Loop-knit fleece", "Tapered", "joggers"],
  ["Afterhours", "Zip hoodie", "men", "Hoodies", "French terry", "Regular", "hoodie"],
  ["Monogram", "Classic hoodie", "unisex", "Hoodies", "Brushed fleece", "Boxy", "hoodie"],
  ["Layer", "Sweatshirt", "unisex", "Hoodies", "Premium fleece", "Relaxed", "hoodie"],
  ["Field", "Baseball cap", "unisex", "Caps & Hats", "Structured twill", "Adjustable", "cap"],
  ["Summit", "Trucker cap", "unisex", "Caps & Hats", "Mesh-backed twill", "Adjustable", "cap"],
  ["Drift", "Bucket hat", "unisex", "Caps & Hats", "Soft canvas", "Relaxed", "cap"],
  ["Canvas", "Tote bag", "women", "Accessories & Gifts", "12 oz cotton canvas", "Structured", "tote"],
  ["Carry", "Tote bag", "unisex", "Accessories & Gifts", "Washed canvas", "Structured", "tote"],
  ["Meeting Room", "Ceramic mug", "unisex", "Accessories & Gifts", "Ceramic", "Standard", "mug"],
  ["Campfire", "Enamel mug", "unisex", "Accessories & Gifts", "Enamel steel", "Standard", "mug"],
  ["Launch", "Sipper bottle", "unisex", "Accessories & Gifts", "Steel", "Slim", "bottle"],
  ["Focus", "Notebook", "unisex", "Accessories & Gifts", "Hardbound paper", "Standard", "giftbox"],
  ["Milestone", "Gift box", "unisex", "Corporate Gifting", "Mixed materials", "Curated", "giftbox"],
  ["Welcome", "Employee kit", "business", "Corporate Gifting", "Mixed materials", "Curated", "giftbox"],
  ["Festival", "Gift hamper", "business", "Corporate Gifting", "Premium packaging", "Curated", "giftbox"],
  ["Stride", "Joggers", "men", "Men", "French terry", "Tapered", "joggers"],
  ["Ease", "Hoodie", "kids", "Kids", "Soft fleece", "Comfort", "hoodie"],
  ["Club", "Oversized T-shirt", "women", "T-Shirts", "Premium cotton", "Relaxed", "tshirt"]
] as const;

const buildGallery = () => ["", "", ""];

export const categories: Category[] = categorySeed.map((category) => ({
  id: slugify(category.name),
  slug: slugify(category.name),
  ...category,
  image: ""
}));

const buildVariants = (id: string, images: string[]): ProductVariant[] =>
  colorTokens.flatMap(([color, hex], colorIndex) =>
    sizeTokens.map((size, sizeIndex) => ({
      id: `${id}-${slugify(color)}-${size.toLowerCase()}`,
      sku: `FAB-${id.slice(-3).toUpperCase()}-${colorIndex + 1}${sizeIndex + 1}`,
      color,
      hex,
      size,
      stock: 4 + ((colorIndex + sizeIndex) % 14),
      image: images[colorIndex % images.length]
    }))
  );

export const products: Product[] = productSeed.map((seed, index) => {
  const [prefix, subtype, audience, categoryName, material, fit, kind] = seed;
  const name = `${prefix} ${subtype}`;
  const id = `product-${index + 1}`;
  const slug = `${slugify(name)}-${index + 1}`;
  const category = categories.find((item) => item.name === categoryName) ?? categories[0];
  const categorySubcategories =
    subcategories[category.slug as keyof typeof subcategories] ?? [subtype];
  const gallery = buildGallery();
  const price = 699 + (index % 7) * 240 + Math.floor(index / 3) * 40;
  const originalPrice = price + 250 + (index % 5) * 90;
  const audienceList =
    audience === "unisex" || audience === "business"
      ? (["unisex"] as Array<"men" | "women" | "kids" | "unisex">)
      : ([audience] as Array<"men" | "women" | "kids" | "unisex">);

  return {
    id,
    name,
    slug,
    audience: audienceList,
    categoryId: category.id,
    subcategory: categorySubcategories[index % categorySubcategories.length] ?? subtype,
    price,
    originalPrice,
    rating: 4.1 + (index % 8) * 0.1,
    reviewCount: 18 + index * 3,
    material,
    fabric: material,
    fit,
    gsm: kind === "hoodie" ? "320" : kind === "tshirt" ? "240" : kind === "jersey" ? "180" : "Premium",
    badge: index % 4 === 0 ? "Bestseller" : index % 5 === 0 ? "New" : undefined,
    customisable: true,
    printMethods: printMethods.slice(0, 3 + (index % 3)),
    images: gallery,
    hoverImage: gallery[1],
    videoPlaceholder: gallery[2],
    description:
      "Designed for premium custom printing with clean structure, accurate placement and a polished presentation.",
    colorOptions: colorTokens.map(([color]) => color),
    sizeOptions:
      kind === "cap" || kind === "mug" || kind === "tote" || kind === "giftbox" || kind === "bottle"
        ? ["One Size"]
        : sizeTokens,
    specifications: [
      `${material} construction`,
      "Ready for custom branding",
      "Quality checked before dispatch",
      "Optimised printable surface"
    ],
    printingCompatibility: printMethods.slice(0, 4),
    care: [
      "Wash inside out with similar colours",
      "Avoid bleach and harsh detergents",
      "Cool iron away from print areas"
    ],
    delivery: "Dispatch in 3-5 working days. Rush options available for selected SKUs.",
    returns:
      "Standard products support returns within 7 days. Customised pieces are reviewed case by case.",
    offers: [
      "Extra 10% off on 3 or more units",
      "Bulk pricing unlocks automatically in the cart",
      "Free mockup support on custom orders"
    ],
    variants: buildVariants(id, gallery),
    relatedIds: [`product-${((index + 2) % productSeed.length) + 1}`, `product-${((index + 5) % productSeed.length) + 1}`],
    frequentlyBoughtTogether: [`product-${((index + 7) % productSeed.length) + 1}`, `product-${((index + 11) % productSeed.length) + 1}`]
  };
});

export const reviews: Review[] = products.flatMap((product, index) => [
  {
    id: `${product.id}-review-1`,
    productId: product.id,
    user: ["Aarav", "Siya", "Kabir", "Myra"][index % 4],
    rating: 5,
    title: "Clean finish and print quality",
    comment:
      "The product visuals matched the selected item clearly, so the purchase flow felt much easier to trust.",
    date: `2026-0${(index % 8) + 1}-14`,
    image: product.images[0]
  },
  {
    id: `${product.id}-review-2`,
    productId: product.id,
    user: ["Riya", "Dev", "Nikhil", "Anaya"][index % 4],
    rating: 4,
    title: "Good value for gifting",
    comment:
      "The gallery and product title were consistent, which made bundle selection easier during checkout.",
    date: `2026-0${(index % 8) + 1}-28`
  }
]);

export const testimonials = [
  {
    name: "The Match Club",
    quote:
      "Fabpodd helped us build a team drop that looked polished, arrived on time and felt far above the usual event merchandise."
  },
  {
    name: "Juniper Studio",
    quote:
      "The custom gifting kits felt thoughtful instead of generic. From proofing to delivery, the workflow was organised and fast."
  },
  {
    name: "Aahana R.",
    quote:
      "Single-piece customisation was smooth and the preview process gave me confidence before ordering."
  }
];

export const faqs = [
  {
    question: "Can I order just one customised product?",
    answer: "Yes. Single-piece orders are supported on selected products, while bulk rates unlock automatically on higher quantities."
  },
  {
    question: "Do you support logo embroidery for corporate orders?",
    answer: "Yes. Embroidery, screen printing and DTG options are available depending on the product, logo detail and order size."
  },
  {
    question: "How quickly can a rush order be fulfilled?",
    answer: "Rush delivery depends on product, quantity and artwork approval timeline. The customiser and enquiry forms surface rush availability."
  }
];

const defaultAddress: Address = {
  id: "address-1",
  label: "Home",
  recipient: "Aanya Shah",
  phone: "+91 98765 43210",
  line1: "14 Riverstone Residency",
  line2: "Andheri West",
  city: "Mumbai",
  state: "Maharashtra",
  pinCode: "400053",
  country: "India",
  isDefault: true
};

export const mockUser: User = {
  id: "user-1",
  name: "Aanya Shah",
  email: "aanya@fabcouture.example",
  phone: "+91 98765 43210",
  role: "customer",
  avatar:
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
  addresses: [defaultAddress]
};

export const mockOrders: Order[] = [
  {
    id: "order-1",
    orderNumber: "FAB2026081201",
    createdAt: "2026-08-12",
    status: "Shipped",
    paymentMethod: "UPI",
    subtotal: 3497,
    shipping: 0,
    discount: 350,
    total: 3147,
    address: defaultAddress,
    items: [
      {
        id: "item-1",
        productId: products[0].id,
        variantId: products[0].variants[0].id,
        quantity: 2,
        price: products[0].price
      },
      {
        id: "item-2",
        productId: products[15].id,
        variantId: products[15].variants[0].id,
        quantity: 1,
        price: products[15].price
      }
    ],
    trackingSteps: [
      "Order placed on 12 Aug 2026",
      "Artwork review completed",
      "Packed at Fabpodd studio",
      "Handed to logistics partner"
    ]
  }
];
