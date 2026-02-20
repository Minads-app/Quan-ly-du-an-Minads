"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const settingsSchema = z.object({
    name: z.string().min(1, "Tên công ty là bắt buộc"),
    address: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
    website: z.string().url("Website không hợp lệ").optional().or(z.literal("")),
    tax_id: z.string().optional(),
    bank_info: z.string().optional(),
    logo_url: z.string().optional(),
});

export type SettingsFormData = z.infer<typeof settingsSchema>;

export async function getSettings() {
    const supabase = await createClient();

    // Put singleton ID = 1
    const { data, error } = await supabase
        .from("organization_settings")
        .select("*")
        .eq("id", 1)
        .single();

    if (error) {
        console.error("Error fetching settings:", error);
        return null; // Return null to let UI handle empty state or defaults
    }

    return data;
}

export async function updateSettings(data: SettingsFormData) {
    const supabase = await createClient();

    // Check permissions (Admin only)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: "Unauthorized" };
    }

    // Verify role
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "Admin") {
        return { error: "Forbidden: Admin only" };
    }

    const { error } = await supabase
        .from("organization_settings")
        .upsert({
            id: 1, // Always update row 1
            ...data,
            updated_at: new Date().toISOString(),
        });

    if (error) {
        console.error("Error updating settings:", error);
        return { error: "Failed to update settings" };
    }

    revalidatePath("/");
    revalidatePath("/settings");
    return { success: true };
}
