"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const ADMIN_EMAIL = "scoopiepookie@gmail.com";

type Order = {
  id: string;
  user_id: string;
  customer_name: string;
  phone: string;
  address: string;
  city: string;
  pin: string;
  items: string;
  total: number;
  payment_status: string | null;
  order_status: string | null;
  payment_screenshot_url: string | null;
  payment_verified_at: string | null;
  payment_verified_by: string | null;
  created_at: string;
};

type Category = {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
};

type Product = {
  id: string;
  name: string;
  price: number;
  description: string | null;
  image_url: string | null;
  category: string | null;
  is_active: boolean;
  created_at: string;
};

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categorySaving, setCategorySaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [screenshotLoading, setScreenshotLoading] = useState(false);

  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [productActive, setProductActive] = useState(true);
  const [productImage, setProductImage] = useState<File | null>(null);
  const [productImagePreview, setProductImagePreview] = useState("");
  const [productSaving, setProductSaving] = useState(false);

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  async function checkAdminAndLoad() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    if (user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      setMessage("Access denied. Admin account required.");
      setLoading(false);
      return;
    }

    await Promise.all([loadOrders(), loadProducts(), loadCategories()]);
    setLoading(false);
  }

  async function loadOrders() {
    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        id, user_id, customer_name, phone, address, city, pin, items, total,
        payment_status, order_status, payment_screenshot_url,
        payment_verified_at, payment_verified_by, created_at
        `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setMessage("Orders load nahi ho pa rahe.");
      return;
    }

    setOrders(data || []);
  }

  async function loadCategories() {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, is_active, created_at")
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      alert("Categories load nahi ho pa rahi.");
      return;
    }

    setCategories(data || []);
  }

  async function saveCategory() {
    const name = categoryName.trim();
    if (!name) { alert("Category name enter karein."); return; }
    setCategorySaving(true);
    try {
      const result = editingCategoryId
        ? await supabase.from("categories").update({ name }).eq("id", editingCategoryId)
        : await supabase.from("categories").insert({ name, is_active: true });
      if (result.error) {
        console.error(result.error);
        alert(result.error.code === "23505" ? "Ye category already exist karti hai." : "Category save nahi ho payi.");
        return;
      }
      setCategoryName("");
      setEditingCategoryId(null);
      await loadCategories();
    } finally { setCategorySaving(false); }
  }

  async function toggleCategory(category: Category) {
    const { error } = await supabase.from("categories").update({ is_active: !category.is_active }).eq("id", category.id);
    if (error) { console.error(error); alert("Category status update nahi ho paya."); return; }
    await loadCategories();
  }

  async function deleteCategory(category: Category) {
    if (!confirm(`"${category.name}" delete karna hai?`)) return;
    const { error } = await supabase.from("categories").delete().eq("id", category.id);
    if (error) { console.error(error); alert("Category delete nahi ho payi. Pehle products ki category change karein."); return; }
    if (editingCategoryId === category.id) { setEditingCategoryId(null); setCategoryName(""); }
    await loadCategories();
  }

  async function loadProducts() {
    setProductsLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select("id, name, price, description, image_url, category, is_active, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      alert("Products load nahi ho pa rahe.");
      setProductsLoading(false);
      return;
    }

    setProducts(data || []);
    setProductsLoading(false);
  }

  function resetProductForm() {
    setEditingProductId(null);
    setProductName("");
    setProductPrice("");
    setProductDescription("");
    setProductCategory("");
    setProductActive(true);
    setProductImage(null);
    setProductImagePreview("");
    setShowProductForm(false);
  }

  function startEditProduct(product: Product) {
    setEditingProductId(product.id);
    setProductName(product.name);
    setProductPrice(String(product.price));
    setProductDescription(product.description || "");
    setProductCategory(product.category || "");
    setProductActive(product.is_active);
    setProductImage(null);
    setProductImagePreview(product.image_url || "");
    setShowProductForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleProductImage(file: File | null) {
    setProductImage(file);

    if (!file) {
      setProductImagePreview("");
      return;
    }

    setProductImagePreview(URL.createObjectURL(file));
  }

  async function saveProduct() {
    if (!productName.trim()) {
      alert("Product name required.");
      return;
    }

    const price = Number(productPrice);

    if (!Number.isFinite(price) || price < 0) {
      alert("Valid price enter karein.");
      return;
    }

    setProductSaving(true);

    try {
      let imageUrl = productImagePreview || "";

      if (productImage) {
        const safeName = productImage.name
          .toLowerCase()
          .replace(/[^a-z0-9.]+/g, "-");

        const filePath = `products/${crypto.randomUUID()}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(filePath, productImage, {
            upsert: false,
            contentType: productImage.type,
          });

        if (uploadError) {
          console.error(uploadError);
          alert("Product image upload nahi ho paayi.");
          return;
        }

        const { data } = supabase.storage
          .from("product-images")
          .getPublicUrl(filePath);

        imageUrl = data.publicUrl;
      }

      if (editingProductId) {
        const { error } = await supabase
          .from("products")
          .update({
            name: productName.trim(),
            price,
            description: productDescription.trim() || null,
            category: productCategory || null,
            image_url: imageUrl || null,
            is_active: productActive,
          })
          .eq("id", editingProductId);

        if (error) {
          console.error(error);
          alert("Product update nahi ho paya.");
          return;
        }

        alert("Product updated successfully.");
      } else {
        const { error } = await supabase.from("products").insert({
          name: productName.trim(),
          price,
          description: productDescription.trim() || null,
          category: productCategory || null,
          image_url: imageUrl || null,
          is_active: productActive,
        });

        if (error) {
          console.error(error);
          alert("Product save nahi ho paya.");
          return;
        }

        alert("Product added successfully.");
      }

      resetProductForm();
      await loadProducts();
    } finally {
      setProductSaving(false);
    }
  }

  async function toggleProduct(product: Product) {
    const { error } = await supabase
      .from("products")
      .update({ is_active: !product.is_active })
      .eq("id", product.id);

    if (error) {
      console.error(error);
      alert("Product status update nahi ho paya.");
      return;
    }

    await loadProducts();
  }

  async function deleteProduct(product: Product) {
    const confirmed = window.confirm(
      `Delete "${product.name}"? Ye product website se remove ho jayega.`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id);

    if (error) {
      console.error(error);
      alert("Product delete nahi ho paya.");
      return;
    }

    alert("Product deleted.");
    await loadProducts();
  }

  async function openScreenshot(path: string | null) {
    if (!path) {
      alert("Payment screenshot available nahi hai.");
      return;
    }

    setScreenshotLoading(true);

    const { data, error } = await supabase.storage
      .from("payment-screenshots")
      .createSignedUrl(path, 60 * 10);

    setScreenshotLoading(false);

    if (error || !data?.signedUrl) {
      console.error(error);
      alert("Screenshot open nahi ho pa raha.");
      return;
    }

    setScreenshotUrl(data.signedUrl);
  }

  async function verifyPayment(orderId: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      alert("Admin access required.");
      return;
    }

    const { error } = await supabase
      .from("orders")
      .update({
        payment_status: "Paid / Verified",
        payment_verified_at: new Date().toISOString(),
        payment_verified_by: user.email,
        order_status: "New",
      })
      .eq("id", orderId);

    if (error) {
      console.error(error);
      alert("Payment verify nahi ho paya.");
      return;
    }

    alert("Payment verified successfully.");
    await loadOrders();
  }

  async function rejectPayment(orderId: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      alert("Admin access required.");
      return;
    }

    const { error } = await supabase
      .from("orders")
      .update({
        payment_status: "Rejected",
        payment_verified_at: new Date().toISOString(),
        payment_verified_by: user.email,
      })
      .eq("id", orderId);

    if (error) {
      console.error(error);
      alert("Payment reject nahi ho paya.");
      return;
    }

    alert("Payment rejected.");
    await loadOrders();
  }

  async function updateOrderStatus(orderId: string, status: string) {
    const { error } = await supabase
      .from("orders")
      .update({ order_status: status })
      .eq("id", orderId);

    if (error) {
      console.error(error);
      alert("Order status update nahi ho paya.");
      return;
    }

    await loadOrders();
  }

  function formatDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Date unavailable";

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function paymentBadge(status: string | null) {
    const value = (status ?? "").toLowerCase();

    if (value.includes("verified")) return "bg-green-100 text-green-700";
    if (value.includes("rejected")) return "bg-red-100 text-red-700";
    return "bg-yellow-100 text-yellow-700";
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fffaff]">
        <div className="text-center">
          <div className="text-5xl">♡</div>
          <p className="mt-3 font-black text-[#35154f]">
            Loading Admin Dashboard...
          </p>
        </div>
      </main>
    );
  }

  if (message) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fffaff] p-5">
        <div className="w-full max-w-md rounded-[2rem] bg-white p-8 text-center shadow-xl">
          <div className="text-5xl">🔒</div>
          <h1 className="mt-4 text-2xl font-black text-[#321442]">
            Access Denied
          </h1>
          <p className="mt-3 text-sm text-gray-500">{message}</p>
          <a
            href="/"
            className="mt-6 inline-block rounded-full bg-[#35154f] px-7 py-3 font-black text-white"
          >
            Back to Shop
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fffaff] text-[#321442]">
      <header className="sticky top-0 z-40 border-b border-[#ead8ef] bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 overflow-hidden rounded-2xl bg-[#f8ecfb] p-1">
              <img src="/logo.png" alt="Scoopie Pookie" className="h-full w-full object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-black text-[#35154f]">SCOOPIE POOKIE♡</h1>
              <p className="text-[8px] font-bold tracking-[0.2em] text-[#79537f]">ADMIN DASHBOARD</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a href="/" className="rounded-full border border-[#d9bde1] bg-white px-4 py-2.5 text-xs font-black text-[#35154f]">
              Shop
            </a>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = "/login";
              }}
              className="rounded-full bg-[#35154f] px-4 py-2.5 text-xs font-black text-white"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-7 md:px-6">
        {/* CATEGORY MANAGEMENT */}
        <div className="mb-10 rounded-[2rem] border border-[#ead8ef] bg-white p-5 shadow-sm md:p-7">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#8b3aa6]">Store Setup</p>
            <h2 className="mt-1 text-2xl font-black">Categories</h2>
            <p className="mt-2 text-sm text-gray-500">Pehle category banayein, phir product add karte waqt yahin se select karein.</p>
          </div>
          <div className="flex flex-col gap-2 md:flex-row">
            <input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveCategory(); }} placeholder="e.g. Hampers" className="flex-1 rounded-2xl border border-[#dfc9e5] px-4 py-3 outline-none focus:border-[#8b3aa6]" />
            <button onClick={saveCategory} disabled={categorySaving} className="rounded-full bg-[#35154f] px-6 py-3 text-sm font-black text-white disabled:opacity-60">{categorySaving ? "Saving..." : editingCategoryId ? "Update Category" : "+ Add Category"}</button>
            {editingCategoryId && <button onClick={() => { setEditingCategoryId(null); setCategoryName(""); }} className="rounded-full border border-[#d9bde1] px-5 py-3 text-sm font-black">Cancel</button>}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center gap-2 rounded-full border border-[#ead8ef] bg-[#fffaff] px-3 py-2">
                <span className={`h-2 w-2 rounded-full ${category.is_active ? "bg-green-500" : "bg-gray-400"}`} />
                <span className="text-xs font-black">{category.name}</span>
                <button onClick={() => { setEditingCategoryId(category.id); setCategoryName(category.name); }} className="text-[10px] font-black text-[#8b3aa6]">Edit</button>
                <button onClick={() => toggleCategory(category)} className="text-[10px] font-black text-gray-600">{category.is_active ? "Hide" : "Show"}</button>
                <button onClick={() => deleteCategory(category)} className="text-[10px] font-black text-red-600">Delete</button>
              </div>
            ))}
          </div>
        </div>

        {/* PRODUCTS MANAGEMENT */}
        <div className="mb-10">
          <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#8b3aa6]">
                Store Management
              </p>
              <h2 className="mt-1 text-3xl font-black">Products</h2>
              <p className="mt-2 text-sm text-gray-500">
                Website ke products, images aur prices yahin se manage karein.
              </p>
            </div>

            <button
              onClick={() => {
                if (showProductForm) resetProductForm();
                else setShowProductForm(true);
              }}
              className="rounded-full bg-[#35154f] px-5 py-3 text-sm font-black text-white"
            >
              {showProductForm ? "Close Form" : "+ Add Product"}
            </button>
          </div>

          {showProductForm && (
            <div className="mb-6 rounded-[2rem] border border-[#ead8ef] bg-white p-5 shadow-sm md:p-7">
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="text-xs font-black">Product Name</label>
                  <input
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="e.g. Cute Mini Hamper"
                    className="mt-2 w-full rounded-2xl border border-[#dfc9e5] px-4 py-3 outline-none focus:border-[#8b3aa6]"
                  />
                </div>

                <div>
                  <label className="text-xs font-black">Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={productPrice}
                    onChange={(e) => setProductPrice(e.target.value)}
                    placeholder="399"
                    className="mt-2 w-full rounded-2xl border border-[#dfc9e5] px-4 py-3 outline-none focus:border-[#8b3aa6]"
                  />
                </div>

                <div>
                  <label className="text-xs font-black">Category</label>
                  <select value={productCategory} onChange={(e) => setProductCategory(e.target.value)} className="mt-2 w-full rounded-2xl border border-[#dfc9e5] bg-white px-4 py-3 outline-none focus:border-[#8b3aa6]">
                    <option value="">Select category</option>
                    {categories.filter((c) => c.is_active).map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-black">Description</label>
                  <textarea
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                    placeholder="Short product description..."
                    rows={3}
                    className="mt-2 w-full rounded-2xl border border-[#dfc9e5] px-4 py-3 outline-none focus:border-[#8b3aa6]"
                  />
                </div>

                <div>
                  <label className="text-xs font-black">Product Image</label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => handleProductImage(e.target.files?.[0] || null)}
                    className="mt-2 w-full rounded-2xl border border-[#dfc9e5] bg-white px-4 py-3 text-sm"
                  />

                  {productImagePreview && (
                    <img
                      src={productImagePreview}
                      alt="Preview"
                      className="mt-3 h-32 w-32 rounded-2xl object-cover"
                    />
                  )}

                  <p className="mt-2 text-[10px] text-gray-500">
                    Edit karte waqt image change nahi karni ho to existing image same rahegi.
                  </p>
                </div>

                <div className="flex items-center">
                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-[#fffaff] p-4">
                    <input
                      type="checkbox"
                      checked={productActive}
                      onChange={(e) => setProductActive(e.target.checked)}
                      className="h-5 w-5"
                    />
                    <span className="text-sm font-black">Show on website</span>
                  </label>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  onClick={saveProduct}
                  disabled={productSaving}
                  className="rounded-full bg-[#8b3aa6] px-6 py-3 text-sm font-black text-white disabled:opacity-60"
                >
                  {productSaving
                    ? "Saving..."
                    : editingProductId
                    ? "Update Product"
                    : "Save Product"}
                </button>

                <button
                  onClick={resetProductForm}
                  className="rounded-full border border-[#d9bde1] px-6 py-3 text-sm font-black"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {productsLoading ? (
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
              Loading products...
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-[2rem] bg-white p-10 text-center shadow-sm">
              <div className="text-5xl">🛍️</div>
              <h3 className="mt-3 text-xl font-black">No Products Yet</h3>
              <p className="mt-2 text-sm text-gray-500">
                + Add Product se pehla product create karein.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((product) => (
                <article
                  key={product.id}
                  className="overflow-hidden rounded-[1.5rem] border border-[#ead8ef] bg-white shadow-sm"
                >
                  <div className="aspect-square bg-[#faf2fc]">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-5xl">🛍️</div>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-black leading-5">{product.name}</h3>
                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black ${
                          product.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {product.is_active ? "LIVE" : "HIDDEN"}
                      </span>
                    </div>

                    <p className="mt-2 text-xl font-black">
                      ₹{Number(product.price).toLocaleString("en-IN")}
                    </p>
                    {product.category && (
                      <span className="mt-2 inline-block rounded-full bg-[#f4e8f7] px-2.5 py-1 text-[10px] font-black text-[#6d2b80]">{product.category}</span>
                    )}

                    {product.description && (
                      <p className="mt-2 line-clamp-2 text-xs text-gray-500">
                        {product.description}
                      </p>
                    )}

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => startEditProduct(product)}
                        className="rounded-full border border-[#d9bde1] px-3 py-2.5 text-xs font-black text-[#35154f]"
                      >
                        ✏️ Edit
                      </button>

                      <button
                        onClick={() => toggleProduct(product)}
                        className="rounded-full bg-[#f4e8f7] px-3 py-2.5 text-xs font-black text-[#6d2b80]"
                      >
                        {product.is_active ? "Hide" : "Show"}
                      </button>

                      <button
                        onClick={() => deleteProduct(product)}
                        className="col-span-2 rounded-full bg-red-50 px-3 py-2.5 text-xs font-black text-red-600"
                      >
                        🗑️ Delete Product
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* ORDERS */}
        <div className="border-t border-[#ead8ef] pt-8">
          <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#8b3aa6]">
                Store Management
              </p>
              <h2 className="mt-1 text-3xl font-black">Orders Dashboard</h2>
              <p className="mt-2 text-sm text-gray-500">
                Payment screenshots verify karein aur order status manage karein.
              </p>
            </div>

            <button
              onClick={loadOrders}
              className="rounded-full bg-[#35154f] px-5 py-3 text-sm font-black text-white"
            >
              ↻ Refresh Orders
            </button>
          </div>

          <div className="mb-7 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-xs font-bold text-gray-500">Total Orders</p>
              <p className="mt-1 text-2xl font-black">{orders.length}</p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-xs font-bold text-gray-500">Payment Pending</p>
              <p className="mt-1 text-2xl font-black text-yellow-600">
                {orders.filter((o) => (o.payment_status ?? "").toLowerCase().includes("pending")).length}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-xs font-bold text-gray-500">Verified Payments</p>
              <p className="mt-1 text-2xl font-black text-green-600">
                {orders.filter((o) => (o.payment_status ?? "").toLowerCase().includes("verified")).length}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-xs font-bold text-gray-500">Rejected Payments</p>
              <p className="mt-1 text-2xl font-black text-red-600">
                {orders.filter((o) => (o.payment_status ?? "").toLowerCase().includes("rejected")).length}
              </p>
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="rounded-[2rem] bg-white p-10 text-center shadow-sm">
              <div className="text-6xl">📦</div>
              <h3 className="mt-4 text-xl font-black">No Orders Yet</h3>
              <p className="mt-2 text-sm text-gray-500">Customer orders yahan appear honge.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {orders.map((order) => (
                <article key={order.id} className="overflow-hidden rounded-[2rem] border border-[#ead8ef] bg-white shadow-sm">
                  <div className="border-b border-[#ead8ef] bg-[#fcf6fd] p-5">
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8b3aa6]">Order</p>
                        <h3 className="mt-1 break-all text-sm font-black">#{order.id}</h3>
                        <p className="mt-1 text-xs text-gray-500">{formatDate(order.created_at)}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full px-3 py-2 text-xs font-black ${paymentBadge(order.payment_status)}`}>
                          💳 {order.payment_status || "Payment Pending"}
                        </span>
                        <span className="rounded-full bg-purple-100 px-3 py-2 text-xs font-black text-purple-700">
                          📦 {order.order_status || "New"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-5 p-5 lg:grid-cols-[1.2fr_.8fr]">
                    <div>
                      <h4 className="text-sm font-black">Customer Details</h4>
                      <div className="mt-3 rounded-2xl bg-[#fffaff] p-4 text-sm">
                        <p><span className="font-bold">Name:</span> {order.customer_name}</p>
                        <p className="mt-1"><span className="font-bold">Phone:</span> {order.phone}</p>
                        <p className="mt-1"><span className="font-bold">Address:</span> {order.address}</p>
                        <p className="mt-1"><span className="font-bold">City:</span> {order.city} - {order.pin}</p>
                      </div>

                      <div className="mt-5">
                        <h4 className="text-sm font-black">Products</h4>
                        <div className="mt-3 whitespace-pre-line rounded-2xl bg-[#fffaff] p-4 text-sm leading-6">{order.items}</div>
                        <div className="mt-3 flex items-center justify-between rounded-2xl bg-[#f8ecfb] p-4">
                          <span className="font-black">Order Total</span>
                          <span className="text-xl font-black">₹{Number(order.total).toLocaleString("en-IN")}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-black">Payment Verification</h4>
                      <div className="mt-3 rounded-2xl border border-[#ead8ef] bg-[#fffaff] p-4">
                        {order.payment_screenshot_url ? (
                          <button
                            onClick={() => openScreenshot(order.payment_screenshot_url)}
                            disabled={screenshotLoading}
                            className="w-full rounded-2xl border-2 border-dashed border-[#c99bd5] bg-white p-6 text-center transition hover:bg-[#f9effb]"
                          >
                            <div className="text-4xl">📸</div>
                            <p className="mt-2 text-sm font-black text-[#6d2b80]">
                              {screenshotLoading ? "Opening..." : "View Payment Screenshot"}
                            </p>
                            <p className="mt-1 text-[10px] text-gray-500">Secure private screenshot</p>
                          </button>
                        ) : (
                          <div className="rounded-2xl bg-yellow-50 p-5 text-center">
                            <div className="text-3xl">⚠️</div>
                            <p className="mt-2 text-sm font-black text-yellow-700">Screenshot Missing</p>
                          </div>
                        )}

                        {!((order.payment_status ?? "").toLowerCase().includes("verified")) &&
                          !((order.payment_status ?? "").toLowerCase().includes("rejected")) && (
                            <div className="mt-4 grid grid-cols-2 gap-2">
                              <button onClick={() => verifyPayment(order.id)} className="rounded-full bg-green-600 px-4 py-3 text-xs font-black text-white">
                                ✓ Verify Payment
                              </button>
                              <button onClick={() => rejectPayment(order.id)} className="rounded-full bg-red-500 px-4 py-3 text-xs font-black text-white">
                                ✕ Reject
                              </button>
                            </div>
                          )}

                        {order.payment_verified_by && (
                          <p className="mt-3 text-center text-[10px] text-gray-500">
                            Checked by {order.payment_verified_by}
                          </p>
                        )}
                      </div>

                      <div className="mt-5">
                        <h4 className="text-sm font-black">Order Status</h4>
                        <select
                          value={order.order_status || "New"}
                          onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                          className="mt-3 w-full rounded-2xl border border-[#dfc9e5] bg-white px-4 py-3 text-sm font-bold outline-none"
                        >
                          <option value="New">New</option>
                          <option value="Processing">Processing</option>
                          <option value="Shipped">Shipped</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {screenshotUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4" onClick={() => setScreenshotUrl("")}>
          <div className="relative max-h-[92vh] max-w-lg overflow-hidden rounded-3xl bg-white p-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setScreenshotUrl("")} className="absolute right-3 top-3 z-10 rounded-full bg-black/70 px-3 py-1 text-xl font-black text-white">
              ×
            </button>
            <img src={screenshotUrl} alt="Payment Screenshot" className="max-h-[85vh] w-auto max-w-full rounded-2xl object-contain" />
          </div>
        </div>
      )}
    </main>
  );
}