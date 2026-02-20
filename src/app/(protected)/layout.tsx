import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProtectedLayoutClient from "./ProtectedLayoutClient";

export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Lấy profile của user hiện tại
    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    if (!profile) {
        redirect("/login");
    }

    return (
        <ProtectedLayoutClient profile={profile}>
            {children}
        </ProtectedLayoutClient>
    );
}
