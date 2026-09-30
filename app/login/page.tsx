"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    if (isSignup) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
      } else {
        setMessage(
          "Account created! Please check your email to confirm your account."
        );
      }

      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    // Login successful
    const returnUrl = sessionStorage.getItem("loginReturn");

    window.location.href = returnUrl || "/";
  }

  return (
    <main className="min-h-screen bg-[#fffafc] flex items-center justify-center p-5">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl">
        <div className="text-center">
          <div className="mx-auto h-24 w-24 overflow-hidden rounded-3xl bg-[#f8ecfb] p-2">
            <img
              src="/logo.png"
              alt="Scoopie Pookie"
              className="h-full w-full object-contain"
            />
          </div>

          <h1 className="mt-5 text-3xl font-black text-[#321442]">
            {isSignup ? "Create Account" : "Welcome Back"} 💕
          </h1>

          <p className="text-center text-gray-500 mt-2 mb-7">
            {isSignup
              ? "Create your ScoopiePookie account"
              : "Login to continue shopping"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#321442]"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#321442]"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#321442] py-3.5 font-bold text-white disabled:opacity-60"
          >
            {loading
              ? "Please wait..."
              : isSignup
                ? "Create Account"
                : "Login"}
          </button>
        </form>

        {message && (
          <p className="mt-5 text-center text-sm text-gray-600">
            {message}
          </p>
        )}

        <button
          type="button"
          onClick={() => {
            setIsSignup(!isSignup);
            setMessage("");
          }}
          className="mt-5 w-full text-sm font-semibold text-[#321442]"
        >
          {isSignup
            ? "Already have an account? Login"
            : "New customer? Create an account"}
        </button>
      </div>
    </main>
  );
}