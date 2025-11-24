// scripts/seeds.ts; need to test pa since iba yung supabase 
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

if (!process.env.ADMIN_EMAIL || !process.env.MANAGER_EMAIL) {
  console.error("Error: ADMIN_EMAIL or MANAGER_EMAIL is missing");
  process.exit(1);
}
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Error: Supabase URL or Service Role Key is missing");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ROLES = [
  { email: process.env.ADMIN_EMAIL, role: "admin" },
  { email: process.env.MANAGER_EMAIL, role: "manager" }
];

async function seed() {
  console.log("Assigning roles to existing users...");

  try {
    const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    const users = listData.users;

    for (const entry of ROLES) {
      const user = users.find((u: any) => u.email === entry.email);

      if (!user) {
        console.warn(`User ${entry.email} not found. They must log in via Google first.`);
        continue;
      }

      const { data: role, error: roleError } = await supabase
        .from("roles")
        .select("id")
        .eq("name", entry.role)
        .single();

      if (roleError || !role) {
        console.warn(`Role ${entry.role} not found`);
        continue;
      }

      await supabase.from("user_roles").upsert(
        { user_id: user.id, role_id: role.id },
        { onConflict: "user_id, role_id" }
      );

      console.log(`Promoted ${entry.email} to ${entry.role}`);
    }

    console.log("Seeding completed!");
  } catch (err) {
    console.error("Error during seeding:", err);
  }
}

seed();
