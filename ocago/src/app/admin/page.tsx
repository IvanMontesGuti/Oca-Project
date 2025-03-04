"use client"
import ProtectedRoute from "@/components/ProtectedRoute/page"
import AdminPanel from "@/components/AdminPanel/page"
export default function AdminPage(){
    return (
        <ProtectedRoute adminOnly>
            <AdminPanel/>
        </ProtectedRoute>
    )
}