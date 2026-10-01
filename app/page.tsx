"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Product = {
  id: string;
  name: string;
  price: number;
  image: string;
  description?: string | null;
  category: string;
};

type CartItem = Product & { quantity: number };

const UPI_ID = "shikshakatiyar800@oksbi";
const UPI_NAME = "Scoopie Pookie";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All Products");
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(
        products
          .map((product) => product.category?.trim())
          .filter(Boolean)
      )
    ) as string[];

    return ["All Products", ...uniqueCategories];
  }, [products]);


  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerCity, setCustomerCity] = useState("");
  const [customerPincode, setCustomerPincode] = useState("");

  const [orderSaving, setOrderSaving] = useState(false);
  const [paymentStarted, setPaymentStarted] = useState(false);
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [paymentScreenshotPreview, setPaymentScreenshotPreview] = useState("");
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [whatsappSent, setWhatsappSent] = useState(false);

  useEffect(() => {
    const loadProducts = async () => {
      setProductsLoading(true);

      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, description, image_url, category, is_active")
        .eq("is_active", true)
        .order("name");

      if (error) {
        console.error("Products load failed:", error);
        setProducts([]);
      } else {
        const mappedProducts: Product[] = (data ?? []).map((item) => ({
          id: String(item.id),
          name: item.name,
          price: Number(item.price),
          image: item.image_url || "/background.png",
          description: item.description,
          category: item.category || "Other",
        }));

        setProducts(mappedProducts);
      }

      setProductsLoading(false);
    };

    loadProducts();
  }, []);

  /*
   * After login:
   * If a product was waiting to be added, add it automatically.
   */
  useEffect(() => {
    const pendingPayment = sessionStorage.getItem("scoopiePaymentStarted");

    if (pendingPayment === "true") {
      setPaymentStarted(true);
    }

    const pendingProductId = sessionStorage.getItem("pendingProductId");

    if (!pendingProductId || !products.length) {
      return;
    }

    const product = products.find(
      (item) => item.id === pendingProductId
    );

    if (product) {
      setCart((current) => {
        const existing = current.find((item) => item.id === product.id);

        if (existing) {
          return current.map((item) =>
            item.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        }

        return [...current, { ...product, quantity: 1 }];
      });

      setCartOpen(true);
      sessionStorage.removeItem("pendingProductId");
      sessionStorage.removeItem("loginReturn");
    }
  }, [products]);

  const filteredProducts = useMemo(
    () =>
      activeCategory === "All Products"
        ? products
        : products.filter((p) => p.category === activeCategory),
    [activeCategory, products]
  );

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  /*
   * Normal Add To Cart
   */
  const addToCart = (product: Product) => {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);

      if (existing) {
        return current.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...current, { ...product, quantity: 1 }];
    });
  };

  /*
   * Login-required Add To Cart
   */
  const handleAddToCart = async (product: Product) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      sessionStorage.setItem("pendingProductId", String(product.id));
      sessionStorage.setItem("loginReturn", window.location.href);

      window.location.href = "/login";
      return;
    }

    addToCart(product);
  };

  const changeQuantity = (id: string, amount: number) => {
    setCart((current) =>
      current
        .map((item) =>
          item.id === id
            ? { ...item, quantity: item.quantity + amount }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };


  const getProductQuantity = (id: string) => {
    return cart.find((item) => item.id === id)?.quantity ?? 0;
  };

  const removeFromCart = (id: string) => {
    setCart((current) => current.filter((item) => item.id !== id));
  };

  const openCheckout = () => {
    if (!cart.length) {
      alert("Your cart is empty.");
      return;
    }

    setCartOpen(false);
    setCheckoutOpen(true);
  };

  const payViaUPI = () => {
    if (!cart.length) {
      alert("Your cart is empty.");
      return;
    }

    const upiUrl =
      `upi://pay?pa=${encodeURIComponent(UPI_ID)}` +
      `&pn=${encodeURIComponent(UPI_NAME)}` +
      `&am=${cartTotal.toFixed(2)}` +
      `&cu=INR` +
      `&tn=${encodeURIComponent("Scoopie Pookie Order")}`;

    setPaymentStarted(true);
    sessionStorage.setItem("scoopiePaymentStarted", "true");
    window.location.href = upiUrl;
  };

  const handlePaymentScreenshot = (file: File | null) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload a payment screenshot image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Screenshot should be 5 MB or smaller.");
      return;
    }

    setPaymentScreenshot(file);

    const previewUrl = URL.createObjectURL(file);
    setPaymentScreenshotPreview(previewUrl);
  };

  const placeOrderOnWhatsApp = async () => {
    if (
      !customerName.trim() ||
      !customerPhone.trim() ||
      !customerAddress.trim() ||
      !customerCity.trim() ||
      !customerPincode.trim()
    ) {
      alert("Please fill all details.");
      return;
    }

    if (!cart.length) {
      alert("Your cart is empty.");
      return;
    }

    if (!paymentStarted) {
      alert("Please complete the UPI payment first.");
      return;
    }

    if (!paymentScreenshot) {
      alert("Please upload your payment screenshot before placing the order.");
      return;
    }

    const items = cart
      .map(
        (item) =>
          `${item.name} x ${item.quantity} = ₹${
            item.price * item.quantity
          }`
      )
      .join("\n");

    setOrderSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        alert("Please login before placing your order.");
        return;
      }

      setUploadingScreenshot(true);

      const fileExtension =
        paymentScreenshot.name.split(".").pop()?.toLowerCase() || "jpg";

      const screenshotPath = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;

      const { error: uploadError } = await supabase.storage
        .from("payment-screenshots")
        .upload(screenshotPath, paymentScreenshot, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Payment screenshot upload failed:", uploadError);
        alert("Payment screenshot upload nahi ho paya. Please try again.");
        return;
      }

      const { error } = await supabase.from("orders").insert({
        user_id: user.id,
        customer_name: customerName.trim(),
        phone: customerPhone.trim(),
        address: customerAddress.trim(),
        city: customerCity.trim(),
        pin: customerPincode.trim(),
        items,
        total: cartTotal,
        payment_screenshot_url: screenshotPath,
        payment_status: "Payment Verification Pending",
        order_status: "New",
      });

      if (error) {
        console.error("Supabase order save failed:", error);
        alert("Order could not be saved. Please try again.");
        return;
      }

      setUploadingScreenshot(false);

      const message =
        `🛍️ *New Order - ScoopiePookie*\n\n` +
        `*Customer Details*\n` +
        `Name: ${customerName.trim()}\n` +
        `Phone: ${customerPhone.trim()}\n\n` +
        `*Order*\n${items}\n\n` +
        `*Total: ₹${cartTotal}*\n\n` +
        `*Delivery Address*\n` +
        `${customerAddress.trim()}\n` +
        `${customerCity.trim()} - ${customerPincode.trim()}\n\n` +
        `*Payment:* Pending / UPI`;

      const whatsappWindow = window.open(
        `https://wa.me/918707237705?text=${encodeURIComponent(message)}`,
        "_blank",
        "noopener,noreferrer"
      );

      if (whatsappWindow) {
        setTimeout(() => setWhatsappSent(true), 700);
      } else {
        alert("Please allow pop-ups for WhatsApp and try again.");
        return;
      }

      setCart([]);
      setCheckoutOpen(false);
      setCartOpen(false);

      setCustomerName("");
      setCustomerPhone("");
      setCustomerAddress("");
      setCustomerCity("");
      setCustomerPincode("");

      setPaymentStarted(false);
      setPaymentScreenshot(null);
      setPaymentScreenshotPreview("");
      sessionStorage.removeItem("scoopiePaymentStarted");
    } finally {
      setOrderSaving(false);
      setUploadingScreenshot(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#fffaff] text-[#321442]">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-[#ead8ef] bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-6">
          <a href="#" className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#f8ecfb]">
              <img
                src="/logo.png"
                alt="Scoopie Pookie"
                className="h-full w-full object-contain"
              />
            </div>

            <div className="hidden min-w-0 sm:block">
              <h1 className="truncate text-lg font-black tracking-wide text-[#35154f]">
                SCOOPIE POOKIE♡
              </h1>
              <p className="text-[8px] font-bold tracking-[0.22em] text-[#79537f]">
                SMALL STORES BIG SMILES
              </p>
            </div>
          </a>

          <nav className="hidden items-center gap-8 text-sm font-bold md:flex">
            <a href="#" className="text-[#8b3aa6]">
              Home
            </a>
            <a
              href="#products"
              className="transition hover:text-[#8b3aa6]"
            >
              Shop
            </a>
            <a
              href="#about"
              className="transition hover:text-[#8b3aa6]"
            >
              About
            </a>
            <a
              href="#contact"
              className="transition hover:text-[#8b3aa6]"
            >
              Contact
            </a>
          </nav>
          <div className="flex items-center gap-2">

  <a
    href="/my-orders"
    className="rounded-full bg-[#35154f] px-4 py-2.5 text-xs font-black text-white shadow-md transition hover:bg-[#8b3aa6] sm:px-5 sm:text-sm"
  >
    ♡ My Orders
  </a>
          <div className="flex items-center gap-2">
            <a
              href="/login"
              className="rounded-full bg-[#35154f] px-4 py-2.5 text-xs font-black text-white shadow-md transition hover:bg-[#8b3aa6] sm:px-5 sm:text-sm"
            >
              ♡ Login
            </a>

            <button
              onClick={() => setCartOpen(true)}
              className="relative rounded-full bg-[#35154f] px-4 py-2.5 text-xs font-black text-white shadow-md transition hover:bg-[#8b3aa6] sm:px-5 sm:text-sm"
            >
              🛒 Cart ({cartCount})
            </button>
          </div>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section
        className="relative overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: "url('/background.png')" }}
      >
        <div className="absolute inset-0 bg-[#f9eafb]/80" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-5 py-12 md:grid-cols-[1.1fr_.9fr] md:px-8 md:py-20">
          <div>
            <div className="inline-flex rounded-full border border-[#dcbbe5] bg-white/75 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#7c3b91] shadow-sm">
              ♡ Thank You For Supporting Our Small Business
            </div>

            <h2 className="mt-5 text-5xl font-black leading-[.92] tracking-tight text-[#321442] md:text-7xl">
              SCOOPIE
              <br />
              <span className="text-[#8b3aa6]">POOKIE♡</span>
            </h2>

            <p className="mt-4 text-sm font-black tracking-[0.28em] text-[#633b70]">
              SMALL STORES BIG SMILES
            </p>

            <p className="mt-5 max-w-xl text-base leading-7 text-[#5d4165] md:text-lg">
              Cute hampers, jewellery and little gifts made to turn everyday
              moments into happy ones.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="#products"
                className="rounded-full bg-[#35154f] px-7 py-3.5 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#8b3aa6]"
              >
                Shop Collection →
              </a>

              <a
                href="https://www.instagram.com/scoopiepookie/"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-[#b986c5] bg-white/80 px-6 py-3.5 text-sm font-black text-[#6d2b80] shadow-sm transition hover:bg-white"
              >
                ◎ @scoopiepookie
              </a>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["🚚", "PAN INDIA", "DELIVERY"],
                ["🛡️", "TRUSTED", "SELLER"],
                ["♡", "CUTE", "QUALITY"],
                ["📦", "FAST", "SHIPPING"],
              ].map(([icon, title, sub]) => (
                <div
                  key={title}
                  className="rounded-2xl border border-white/70 bg-white/75 p-3 text-center shadow-sm backdrop-blur"
                >
                  <div className="text-xl">{icon}</div>
                  <p className="mt-1 text-[9px] font-black">{title}</p>
                  <p className="text-[8px] font-semibold text-gray-500">
                    {sub}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center">
            <div className="relative rounded-[2rem] border border-white/80 bg-white/65 p-5 shadow-2xl backdrop-blur">
              <div className="absolute -right-3 -top-3 rounded-full bg-[#8b3aa6] px-3 py-2 text-xs font-black text-white shadow-lg">
                Made with ♡
              </div>

              <img
                src="/logo.png"
                alt="Scoopie Pookie Logo"
                className="h-60 w-60 object-contain md:h-80 md:w-80"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <div className="rounded-[2rem] border border-[#ead5ef] bg-white p-7 text-center shadow-sm md:p-10">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#8b3aa6]">
            Made With Love ♡
          </p>

          <h2 className="mt-2 text-3xl font-black text-[#321442]">
            Little Things, Big Smiles
          </h2>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#6b4c72]">
            Discover cute hampers, chains, earrings and rings selected for
            gifting, styling and special moments.
          </p>
        </div>
      </section>

      {/* PRODUCTS */}
      <section
        id="products"
        className="mx-auto max-w-7xl px-5 pb-16 md:px-8"
      >
        <div className="text-center">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#8b3aa6]">
            Our Collection
          </p>

          <h2 className="mt-2 text-3xl font-black md:text-4xl">
            Shop Your Favourites ♡
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-sm text-[#75587b]">
            Cute products, beautiful gifts and little things that make you
            smile.
          </p>
        </div>

        <div className="mt-7 flex gap-2 overflow-x-auto pb-2 md:justify-center">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`shrink-0 rounded-full px-5 py-2.5 text-xs font-black transition ${
                activeCategory === category
                  ? "bg-[#35154f] text-white shadow-md"
                  : "border border-[#ead5ef] bg-white text-[#5b3865] hover:bg-[#f7eafa]"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {productsLoading ? (
          <div className="mt-10 rounded-3xl border border-[#ead8ef] bg-white p-10 text-center shadow-sm">
            <div className="text-3xl">♡</div>
            <p className="mt-3 text-sm font-black text-[#35154f]">
              Loading our cute collection...
            </p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-[#ead8ef] bg-white p-10 text-center shadow-sm">
            <div className="text-3xl">🛍️</div>
            <p className="mt-3 text-sm font-black text-[#35154f]">
              No products available right now.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {filteredProducts.map((product) => (
            <article
              key={product.id}
              className="group overflow-hidden rounded-[1.35rem] border border-[#ead8ef] bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="relative aspect-square overflow-hidden bg-[#faf2fc]">
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />

                <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2.5 py-1 text-[8px] font-black text-[#6d2b80] shadow-sm">
                  {product.category}
                </span>
              </div>

              <div className="p-3.5">
                <h3 className="min-h-[40px] text-sm font-black leading-5 text-[#321442]">
                  {product.name}
                </h3>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-lg font-black">
                    ₹{product.price.toLocaleString("en-IN")}
                  </p>

                  <span className="text-xs text-[#8b3aa6]">♡</span>
                </div>

                {getProductQuantity(product.id) === 0 ? (
                  <button
                    type="button"
                    onClick={() => handleAddToCart(product)}
                    className="mt-3 w-full rounded-full bg-[#35154f] py-3 text-xs font-black text-white transition hover:bg-[#8b3aa6]"
                  >
                    + Add to Cart
                  </button>
                ) : (
                  <div className="mt-3 flex items-center justify-center gap-4 rounded-full bg-[#f8ecfb] py-2.5">
                    <button
                      type="button"
                      onClick={() => changeQuantity(product.id, -1)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg font-black text-[#35154f] shadow-sm"
                    >
                      −
                    </button>

                    <span className="min-w-6 text-center text-sm font-black text-[#35154f]">
                      {getProductQuantity(product.id)}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleAddToCart(product)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[#35154f] text-lg font-black text-white shadow-sm"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            </article>
            ))}
          </div>
        )}
      </section>

      {/* CONTACT */}
      <section
        id="contact"
        className="border-y border-[#ead8ef] bg-[#f8ecfb]"
      >
        <div className="mx-auto max-w-7xl px-5 py-11 text-center">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#8b3aa6]">
            Stay Connected
          </p>

          <h2 className="mt-2 text-3xl font-black">
            Follow Our Cute World ♡
          </h2>

          <p className="mx-auto mt-2 max-w-lg text-sm text-[#6f5276]">
            Follow us for new launches, gift ideas and product updates.
          </p>

          <a
            href="https://www.instagram.com/scoopiepookie/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex rounded-full bg-[#7d2a99] px-7 py-3.5 text-sm font-black text-white shadow-lg transition hover:bg-[#5c1d72]"
          >
            ◎ Instagram @scoopiepookie
          </a>

          <a
            href="mailto:scoopiepookie@gmail.com"
            className="mt-3 inline-flex rounded-full border border-[#7d2a99] bg-white px-7 py-3.5 text-sm font-black text-[#7d2a99] transition hover:bg-[#f5e6fa]"
          >
            ✉ scoopiepookie@gmail.com
          </a>
        </div>
      </section>

      {/* CART */}
      {cartOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50"
          onClick={() => setCartOpen(false)}
        >
          <aside
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-[#fffaff] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#ead8ef] bg-white p-5">
              <div>
                <h2 className="text-2xl font-black">Your Cart</h2>
                <p className="text-xs text-gray-500">
                  {cartCount} item(s)
                </p>
              </div>

              <button
                onClick={() => setCartOpen(false)}
                className="rounded-full bg-[#f5e8f8] px-3 py-1 text-2xl leading-none text-[#633b70]"
              >
                ×
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="flex flex-1 items-center justify-center p-6 text-center">
                <div>
                  <div className="text-6xl">🛍️</div>

                  <h3 className="mt-4 font-black">
                    Your cart is waiting ♡
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    Add something cute to continue.
                  </p>

                  <button
                    onClick={() => setCartOpen(false)}
                    className="mt-5 rounded-full bg-[#35154f] px-6 py-3 text-sm font-black text-white"
                  >
                    Continue Shopping
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 space-y-4 overflow-y-auto p-5">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-[#ead8ef] bg-white p-3"
                    >
                      <div className="flex gap-3">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-20 w-20 rounded-xl object-cover"
                        />

                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-black">
                            {item.name}
                          </h3>

                          <p className="mt-1 font-black">
                            ₹{item.price}
                          </p>

                          <div className="mt-2 flex items-center gap-3">
                            <button
                              onClick={() =>
                                changeQuantity(item.id, -1)
                              }
                              className="h-8 w-8 rounded-full border border-[#ddc4e3] font-black"
                            >
                              −
                            </button>

                            <span className="min-w-5 text-center text-sm font-black">
                              {item.quantity}
                            </span>

                            <button
                              onClick={() =>
                                changeQuantity(item.id, 1)
                              }
                              className="h-8 w-8 rounded-full border border-[#ddc4e3] font-black"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="self-start text-xs font-bold text-red-500"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-[#ead8ef] bg-white p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="font-bold">Total</span>

                    <span className="text-xl font-black">
                      ₹{cartTotal.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <button
                    onClick={openCheckout}
                    className="w-full rounded-full bg-[#35154f] py-4 text-sm font-black text-white shadow-lg transition hover:bg-[#8b3aa6]"
                  >
                    Proceed to Checkout →
                  </button>
                </div>
              </>
            )}
          </aside>
        </div>
      )}

      {/* CHECKOUT */}
      {checkoutOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4"
          onClick={() => setCheckoutOpen(false)}
        >
          <div
            className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[2rem] bg-white p-5 shadow-2xl sm:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#ead8ef] pb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8b3aa6]">
                  Almost Done ♡
                </p>

                <h2 className="mt-1 text-2xl font-black">
                  Delivery Details
                </h2>
              </div>

              <button
                onClick={() => setCheckoutOpen(false)}
                className="rounded-full bg-[#f5e8f8] px-3 py-1 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {[
                [
                  "Full Name",
                  customerName,
                  setCustomerName,
                  "text",
                ],
                [
                  "Phone Number",
                  customerPhone,
                  setCustomerPhone,
                  "tel",
                ],
                ["City", customerCity, setCustomerCity, "text"],
                [
                  "Pincode",
                  customerPincode,
                  setCustomerPincode,
                  "text",
                ],
              ].map(([placeholder, value, setter, type]) => (
                <input
                  key={placeholder as string}
                  type={type as string}
                  placeholder={placeholder as string}
                  value={value as string}
                  onChange={(e) =>
                    (setter as (v: string) => void)(e.target.value)
                  }
                  className="w-full rounded-2xl border border-[#e4cfe8] bg-[#fffaff] px-4 py-3.5 text-sm outline-none transition focus:border-[#8b3aa6] focus:ring-2 focus:ring-[#ead8ef]"
                />
              ))}

              <textarea
                placeholder="Full Delivery Address"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-[#e4cfe8] bg-[#fffaff] px-4 py-3.5 text-sm outline-none transition focus:border-[#8b3aa6] focus:ring-2 focus:ring-[#ead8ef]"
              />
            </div>

            <div className="mt-5 rounded-2xl bg-[#f8ecfb] p-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Items</span>
                <span className="font-bold">{cartCount}</span>
              </div>

              <div className="mt-2 flex justify-between">
                <span className="font-black">Total</span>

                <span className="text-xl font-black">
                  ₹{cartTotal.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* UPI PAYMENT */}
            <div className="mt-4 rounded-2xl border border-[#d8c0df] bg-[#fbf5fd] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-[#7d2a99]">
                    Pay via UPI
                  </p>

                  <p className="mt-1 text-sm font-bold text-[#321442]">
                    {UPI_ID}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(UPI_ID);
                    alert("UPI ID copied.");
                  }}
                  className="rounded-full border border-[#d8c0df] bg-white px-3 py-2 text-xs font-black text-[#6d2b80]"
                >
                  Copy
                </button>
              </div>

              <div className="mt-4 rounded-2xl bg-white p-4 text-center shadow-sm">
                <p className="text-xs font-black text-[#321442]">
                  Scan QR to Pay
                </p>

                <img
                  src="/upi-qr.png"
                  alt="UPI QR Code"
                  className="mx-auto mt-3 h-48 w-48 rounded-xl object-contain"
                />

                <p className="mt-2 text-[10px] text-gray-500">
                  UPI: {UPI_ID}
                </p>
              </div>

              <button
                type="button"
                onClick={payViaUPI}
                className="mt-3 w-full rounded-full bg-[#6d2b80] py-3.5 text-sm font-black text-white shadow-md transition hover:bg-[#54205f]"
              >
                💳 Pay ₹{cartTotal.toLocaleString("en-IN")} via UPI
              </button>

              <p className="mt-2 text-center text-[10px] leading-4 text-gray-500">
                On a phone, this will try to open your installed UPI app.
                Always verify the payment in your bank/UPI app.
              </p>
            </div>

            {/* PAYMENT SCREENSHOT */}
            <div className="mt-4 rounded-2xl border border-[#d8c0df] bg-white p-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-[#7d2a99]">
                  Payment Screenshot *
                </p>
                <p className="mt-1 text-xs leading-5 text-gray-500">
                  UPI payment complete karne ke baad payment success screenshot
                  upload karein. Screenshot admin payment verification ke liye
                  use hoga.
                </p>
              </div>

              <label className="mt-3 flex cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-[#d8c0df] bg-[#fbf5fd] px-4 py-5 text-center transition hover:bg-[#f5e8fa]">
                <div>
                  <div className="text-3xl">📸</div>
                  <p className="mt-2 text-sm font-black text-[#6d2b80]">
                    {paymentScreenshot ? "Change Screenshot" : "Upload Payment Screenshot"}
                  </p>
                  <p className="mt-1 text-[10px] text-gray-500">
                    JPG, PNG • Max 5 MB
                  </p>
                </div>

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) =>
                    handlePaymentScreenshot(e.target.files?.[0] || null)
                  }
                />
              </label>

              {paymentScreenshotPreview && (
                <div className="mt-3 rounded-2xl border border-[#ead8ef] bg-[#fffaff] p-3">
                  <img
                    src={paymentScreenshotPreview}
                    alt="Payment screenshot preview"
                    className="mx-auto max-h-64 rounded-xl object-contain"
                  />
                  <p className="mt-2 text-center text-xs font-bold text-green-600">
                    ✓ Screenshot selected
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={placeOrderOnWhatsApp}
              disabled={
                orderSaving ||
                uploadingScreenshot ||
                !paymentStarted ||
                !paymentScreenshot
              }
              className="mt-4 w-full rounded-full bg-[#35154f] py-4 text-sm font-black text-white shadow-lg transition hover:bg-[#8b3aa6] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploadingScreenshot
                ? "Uploading Screenshot…"
                : orderSaving
                  ? "Placing Order…"
                  : !paymentStarted
                    ? "🔒 Pay via UPI First"
                    : !paymentScreenshot
                      ? "📸 Upload Screenshot First"
                      : "🛍️ Place Order"}
            </button>

            <p className="mt-3 text-center text-[10px] leading-4 text-gray-500">
              Your order will be placed as <b>Payment Verification Pending</b>.
              Admin will verify the payment screenshot before confirming the
              payment.
            </p>
          </div>
        </div>
      )}

      {/* ORDER SUCCESS POPUP */}
      {whatsappSent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-[2rem] bg-white p-7 text-center shadow-2xl">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#eafaf0] text-4xl">
              ✓
            </div>

            <h2 className="mt-5 text-2xl font-black text-[#321442]">
              Your Order Has Been Ordered Successfully! 🎉
            </h2>

            <p className="mt-3 text-sm leading-6 text-[#6b4c72]">
              Your order details have been opened in WhatsApp.
              <br />
              Thank you for shopping with Scoopie Pookie ♡
            </p>

            <button
              onClick={() => setWhatsappSent(false)}
              className="mt-6 w-full rounded-full bg-[#35154f] py-3.5 text-sm font-black text-white shadow-lg transition hover:bg-[#8b3aa6]"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-[#291331] px-5 py-10 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 overflow-hidden rounded-2xl bg-white p-1">
                <img
                  src="/logo.png"
                  alt="Scoopie Pookie"
                  className="h-full w-full object-contain"
                />
              </div>

              <div>
                <h2 className="text-xl font-black">
                  SCOOPIE POOKIE♡
                </h2>

                <p className="text-[8px] tracking-[0.22em] text-purple-200">
                  SMALL STORES BIG SMILES
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm text-purple-200">
              Cute things made to make you smile ❤️
            </p>
          </div>

          <div>
            <h3 className="font-black">Quick Links</h3>

            <div className="mt-3 space-y-2 text-sm text-purple-200">
              <a href="#" className="block hover:text-white">
                Home
              </a>
              <a href="#products" className="block hover:text-white">
                Shop
              </a>
              <a href="#about" className="block hover:text-white">
                About
              </a>
              <a href="#contact" className="block hover:text-white">
                Contact
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-black">Follow Us</h3>

            <a
              href="https://www.instagram.com/scoopiepookie/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-sm font-bold text-purple-200 hover:text-white"
            >
              ◎ Instagram @scoopiepookie
            </a>

            <a
              href="mailto:scoopiepookie@gmail.com"
              className="mt-4 block text-sm font-bold text-purple-200 hover:text-white"
            >
              ✉ scoopiepookie@gmail.com
            </a>

            <p className="mt-5 text-sm text-purple-200">
              Thank You For Supporting Our Small Business ♡
            </p>
          </div>
        </div>

        <div className="mx-auto mt-8 max-w-7xl border-t border-white/10 pt-6 text-center text-xs text-purple-300">
          © 2026 ScoopiePookie. All rights reserved.
        </div>
      </footer>
    </main>
  );
}