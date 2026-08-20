import { create } from "zustand";
import { persist } from "zustand/middleware";
import { mockOrders, mockUser } from "../data/catalog";
import { coupons } from "../constants/site";
import { calculateCustomizationCharge } from "../lib/pricing";
import type { Address, CartItem, CustomDesign, DesignLayer, Order, User, WishlistItem } from "../types/models";

interface AppState {
  user: User | null;
  cart: CartItem[];
  wishlist: WishlistItem[];
  orders: Order[];
  recentProductIds: string[];
  activeCoupon?: string;
  customDesign: CustomDesign;
  selectedLayerId?: string;
  login: (payload: Pick<User, "email" | "name" | "phone">) => void;
  logout: () => void;
  addAddress: (address: Address) => void;
  addToCart: (item: Omit<CartItem, "id">) => void;
  updateCartQuantity: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  saveForLater: (id: string) => void;
  toggleWishlist: (productId: string) => void;
  applyCoupon: (code: string) => boolean;
  clearCoupon: () => void;
  placeOrder: (paymentMethod: string, address: Address) => Order;
  completeOrder: (order: Order) => void;
  addRecentProduct: (productId: string) => void;
  updateCustomDesign: (payload: Partial<CustomDesign>) => void;
  addDesignLayer: (layer: DesignLayer) => void;
  updateDesignLayer: (layerId: string, payload: Partial<DesignLayer>) => void;
  duplicateDesignLayer: (layerId: string) => void;
  deleteDesignLayer: (layerId: string) => void;
  selectLayer: (layerId?: string) => void;
  resetDesign: (payload?: Partial<CustomDesign>) => void;
}

const baseDesign: CustomDesign = {
  id: "design-1",
  productId: "",
  productColor: "Midnight Black",
  size: "M",
  quantity: 1,
  printLocation: "Front chest",
  printMethod: "Direct-to-garment",
  rushDelivery: false,
  embroidery: false,
  layers: [
    {
      id: "layer-1",
      type: "text",
      view: "front",
      content: "FAB",
      color: "#FFC627",
      fontSize: 28,
      fontFamily: "Manrope",
      fontWeight: 700,
      fontStyle: "normal",
      textAlign: "center",
      rotation: 0,
      x: 70,
      y: 90,
      width: 120,
      height: 48
    }
  ]
};

const calculateItemPrice = (item: CartItem) => {
  const baseProductPrice = 699;
  return baseProductPrice * item.quantity + calculateCustomizationCharge(item.customization);
};

const cloneCustomDesign = (design: CustomDesign): CustomDesign => ({
  ...design,
  layers: design.layers.map((layer) => ({ ...layer }))
});

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: mockUser,
      cart: [],
      wishlist: [],
      orders: mockOrders,
      recentProductIds: [],
      customDesign: baseDesign,
      selectedLayerId: baseDesign.layers[0].id,
      login: ({ email, name, phone }) =>
        set((state) => ({
          user: state.user
            ? { ...state.user, email, name, phone }
            : { ...mockUser, email, name, phone }
        })),
      logout: () => set({ user: null }),
      addAddress: (address) =>
        set((state) => ({
          user: state.user ? { ...state.user, addresses: [...state.user.addresses, address] } : state.user
        })),
      addToCart: (item) =>
        set((state) => ({
          cart: [
            ...state.cart,
            {
              ...item,
              customization: item.customization ? cloneCustomDesign(item.customization) : undefined,
              id: `cart-${Date.now()}`
            }
          ]
        })),
      updateCartQuantity: (id, quantity) =>
        set((state) => ({
          cart: state.cart.map((item) => (item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item))
        })),
      removeFromCart: (id) => set((state) => ({ cart: state.cart.filter((item) => item.id !== id) })),
      saveForLater: (id) =>
        set((state) => ({
          cart: state.cart.map((item) => (item.id === id ? { ...item, savedForLater: !item.savedForLater } : item))
        })),
      toggleWishlist: (productId) =>
        set((state) => ({
          wishlist: state.wishlist.some((item) => item.productId === productId)
            ? state.wishlist.filter((item) => item.productId !== productId)
            : [...state.wishlist, { id: `wish-${Date.now()}`, productId, createdAt: new Date().toISOString() }]
        })),
      applyCoupon: (code) => {
        const isValid = coupons.some((coupon) => coupon.code.toLowerCase() === code.toLowerCase());
        if (isValid) {
          set({ activeCoupon: code.toUpperCase() });
        }
        return isValid;
      },
      clearCoupon: () => set({ activeCoupon: undefined }),
      placeOrder: (paymentMethod, address) => {
        const state = get();
        const subtotal = state.cart.reduce((sum, item) => sum + calculateItemPrice(item), 0);
        const discountCoupon = coupons.find((coupon) => coupon.code === state.activeCoupon);
        const discount =
          discountCoupon && subtotal >= discountCoupon.minimumOrderValue
            ? discountCoupon.discountType === "percentage"
              ? Math.round((subtotal * discountCoupon.value) / 100)
              : discountCoupon.value
            : 0;
        const shipping = subtotal > 1999 ? 0 : 99;
        const order: Order = {
          id: `order-${Date.now()}`,
          orderNumber: `FAB${Date.now()}`,
          createdAt: new Date().toISOString(),
          status: "Placed",
          paymentMethod,
          subtotal,
          shipping,
          discount,
          total: subtotal + shipping - discount,
          address,
          items: state.cart.map((item) => ({
            id: item.id,
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            price: calculateItemPrice(item) / item.quantity,
            customization: item.customization ? cloneCustomDesign(item.customization) : undefined
          })),
          trackingSteps: [
            "Order placed",
            "Artwork review queued",
            "Production awaiting approval"
          ]
        };

        set({
          orders: [order, ...state.orders],
          cart: [],
          activeCoupon: undefined
        });

        return order;
      },
      completeOrder: (order) =>
        set((state) => ({
          orders: [order, ...state.orders.filter((entry) => entry.id !== order.id)],
          cart: [],
          activeCoupon: undefined
        })),
      addRecentProduct: (productId) =>
        set((state) => ({
          recentProductIds: [productId, ...state.recentProductIds.filter((id) => id !== productId)].slice(0, 8)
        })),
      updateCustomDesign: (payload) =>
        set((state) => ({ customDesign: { ...state.customDesign, ...payload } })),
      addDesignLayer: (layer) =>
        set((state) => ({
          customDesign: { ...state.customDesign, layers: [...state.customDesign.layers, layer] },
          selectedLayerId: layer.id
        })),
      updateDesignLayer: (layerId, payload) =>
        set((state) => ({
          customDesign: {
            ...state.customDesign,
            layers: state.customDesign.layers.map((layer) =>
              layer.id === layerId ? { ...layer, ...payload } : layer
            )
          }
        })),
      duplicateDesignLayer: (layerId) =>
        set((state) => {
          const layer = state.customDesign.layers.find((entry) => entry.id === layerId);
          if (!layer) {
            return state;
          }
          const duplicate = { ...layer, id: `layer-${Date.now()}`, x: layer.x + 16, y: layer.y + 16 };
          return {
            customDesign: { ...state.customDesign, layers: [...state.customDesign.layers, duplicate] },
            selectedLayerId: duplicate.id
          };
        }),
      deleteDesignLayer: (layerId) =>
        set((state) => ({
          customDesign: {
            ...state.customDesign,
            layers: state.customDesign.layers.filter((layer) => layer.id !== layerId)
          },
          selectedLayerId: state.selectedLayerId === layerId ? undefined : state.selectedLayerId
        })),
      selectLayer: (layerId) => set({ selectedLayerId: layerId }),
      resetDesign: (payload) => {
        const design = cloneCustomDesign({ ...baseDesign, ...payload, layers: baseDesign.layers });
        set({ customDesign: design, selectedLayerId: design.layers[0]?.id });
      }
    }),
    {
      name: "fab-couture-store"
    }
  )
);
