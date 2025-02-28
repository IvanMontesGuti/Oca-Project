"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { API_BASE_URL, UPDATE_USER_URL, IMAGE_PUT_BY_NAME_URL, GET_USER_BY_ID_URL } from "@/lib/endpoints/config";
import { Header2 } from "@/components/Home/navUser";
export default function ProfilePage() {
  const { userInfo, updateUserInfo } = useAuth();
  const [formData, setFormData] = useState({
    mail: "",
    nickname: "",
    password: "",
    confirmPassword: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (userInfo?.id) {
      fetchUserData(userInfo.id);
    }
  }, [userInfo?.id]);

  const fetchUserData = async (id: number) => {
    try {
      const response = await fetch(GET_USER_BY_ID_URL(id), {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) throw new Error("Error al obtener los datos del usuario");

      const userData = await response.json();
      console.log("📌 Datos del usuario recibidos:", userData);

      setFormData({
        mail: userData.mail || "",
        nickname: userData.nickname || "Usuario",
        password: "",
        confirmPassword: "",
      });

      setImagePreview(userData.avatarUrl ? `${API_BASE_URL}/${userData.avatarUrl}` : "/placeholder.svg");
    } catch (error) {
      console.error("❌ Error al obtener usuario:", error);
      toast.error("Error al cargar el perfil");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password && formData.password !== formData.confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    try {
      const dataToSend = {
        id: userInfo.id, // Es obligatorio enviar el ID del usuario
        mail: formData.mail,
        nickname: formData.nickname,
        password: formData.password || null, // Si no cambia la contraseña, envía null
      };

      console.log("📤 Enviando datos al backend:", dataToSend);

      const response = await fetch(UPDATE_USER_URL, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) throw new Error("Error al actualizar la información");

      if (imageFile) {
        const imageData = new FormData();
        imageData.append("file", imageFile);

        const imageResponse = await fetch(IMAGE_PUT_BY_NAME_URL(formData.nickname), {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: imageData,
        });

        if (!imageResponse.ok) throw new Error("Error al actualizar la imagen de perfil");
      }

      updateUserInfo({ ...userInfo, ...dataToSend });
      toast.success("Perfil actualizado correctamente");
    } catch (error) {
      console.error("❌ Error al actualizar perfil:", error);
      toast.error("Error al actualizar el perfil");
    }
};


  return (
    <div className="min-h-screen bg-[#231356] text-white">
      <Header2/>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Mi Perfil</h1>
        <div className="max-w-2xl mx-auto bg-[#1B0F40] shadow-lg rounded-lg overflow-hidden">
          {isLoading ? (
            <p className="text-center text-white py-6">Cargando perfil...</p>
          ) : (
            <div className="md:flex">
              <div className="p-6">
                <div className="relative w-48 h-48 mx-auto">
                  <img
                    src={imagePreview || "/placeholder.svg"}
                    alt="Profile"
                    className="rounded-full object-cover w-full h-full border-4 border-[#4C1D95]"
                  />
                  <label
                    htmlFor="profile-image"
                    className="absolute bottom-0 right-0 bg-[#4C1D95] text-white p-2 rounded-full cursor-pointer hover:bg-[#5B21B6] transition-colors"
                  >
                    📸
                  </label>
                  <input
                    id="profile-image"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </div>
              </div>
              <div className="p-8 flex-1">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <Label htmlFor="nickname" className="text-white">Nombre</Label>
                    <Input
                      id="nickname"
                      name="nickname"
                      value={formData.nickname}
                      onChange={handleInputChange}
                      required
                      className="bg-[#2D1B59] text-white border-gray-600 focus:border-[#4C1D95]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="mail" className="text-white">Email</Label>
                    <Input
                      id="mail"
                      name="mail"
                      type="email"
                      value={formData.mail}
                      onChange={handleInputChange}
                      required
                      className="bg-[#2D1B59] text-white border-gray-600 focus:border-[#4C1D95]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password" className="text-white">Nueva Contraseña</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="bg-[#2D1B59] text-white border-gray-600 focus:border-[#4C1D95]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword" className="text-white">Confirmar Contraseña</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="bg-[#2D1B59] text-white border-gray-600 focus:border-[#4C1D95]"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-[#4C1D95] hover:bg-[#5B21B6] text-white">
                    Guardar Cambios
                  </Button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
