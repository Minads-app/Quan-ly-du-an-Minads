"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createUserSchema = z.object({
    email: z.string().email("Email không hợp lệ"),
    password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
    fullName: z.string().min(1, "Vui lòng nhập họ tên"),
    role: z.enum(["Admin", "Accountant", "Employee"]),
});

export async function createUser(data: z.infer<typeof createUserSchema>) {
    const supabase = await createClient();

    // 1. Check permission
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: "Unauthorized" };
    }

    // Check if current user is admin via profiles table
    // Note: We can also rely on RLS, but explicit check is better for actions
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "Admin") {
        return { error: "Bạn không có quyền thực hiện hành động này" };
    }

    // 2. Create user using Admin Client
    try {
        const adminClient = createAdminClient();

        // Create auth user
        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
            email: data.email,
            password: data.password,
            email_confirm: true, // Auto confirm
            user_metadata: {
                full_name: data.fullName,
            },
        });

        if (createError) {
            return { error: createError.message };
        }

        if (!newUser.user) {
            return { error: "Không thể tạo user" };
        }

        // 3. Update profile role
        // The trigger 'on_auth_user_created' in DB should have created the profile
        // We need to update it with the correct role and full_name (if trigger didn't pick it up)

        // Optimization: Wait a bit or retry if trigger is slow? 
        // Usually trigger is immediate within transaction, but we are using API.
        // We can upsert profile to be sure.

        const { error: updateError } = await adminClient
            .from("profiles")
            .upsert({
                id: newUser.user.id,
                email: data.email,
                full_name: data.fullName,
                role: data.role,
                updated_at: new Date().toISOString(),
            });

        if (updateError) {
            // If fail to update profile, maybe we should delete auth user?
            // For now just return error
            return { error: "Tạo user thành công nhưng lỗi cập nhật thông tin: " + updateError.message };
        }

        revalidatePath("/admin/users");
        return { success: true };
    } catch (e: any) {
        return { error: e.message || "Lỗi hệ thống" };
    }
}

export async function updateUser(userId: string, data: { fullName: string; role: any }) {
    const supabase = await createClient();

    // Check permission
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "Admin") {
        return { error: "Forbidden" };
    }

    const { error } = await supabase
        .from("profiles")
        .update({
            full_name: data.fullName,
            role: data.role,
        })
        .eq("id", userId);

    if (error) return { error: error.message };

    revalidatePath("/admin/users");
    return { success: true };
}

export async function deleteUser(userId: string) {
    const supabase = await createClient();

    // Check permission (Admin only)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "Admin") {
        return { error: "Forbidden" };
    }

    // Delete from Auth (requires Admin Client)
    try {
        const adminClient = createAdminClient();
        const { error } = await adminClient.auth.admin.deleteUser(userId);
        if (error) return { error: error.message };

        revalidatePath("/admin/users");
        return { success: true };
    } catch (e: any) {
        return { error: e.message };
    }
}
