"use client"

import ProtectedRoute from "@/components/ProtectedRoute/page";
import { RegisterForm } from "@/components/Register/register-form";
import React from "react";

export default function LoginPage() {
  return (
    <ProtectedRoute>
      <div className="bg-svg bg-cover bg-no-repeat h-full min-h-screen w-full flex items-center justify-center relative">
        <div className="absolute inset-0 bg-black opacity-50"></div>
        <div className="w-full max-w-sm md:max-w-3xl relative z-10">
          <RegisterForm />
        </div>
      </div>
    </ProtectedRoute>

  );
}