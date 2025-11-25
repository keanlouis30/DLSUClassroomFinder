// scripts/seeds.ts
// npx ts-node scripts/seeds.ts

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Error: Supabase URL or Service Role Key is missing");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const USERS_TO_ASSIGN = [
  { email: process.env.ADMIN_EMAIL, role: "admin" },
  { email: process.env.MANAGER_EMAIL, role: "manager" },
  { email: process.env.USER_EMAIL, role: "user" },
].filter(entry => !!entry.email);

async function seed() {
  console.log("Assigning roles to users...");

  for (const entry of USERS_TO_ASSIGN) {
    try {
      // Update the user's role based on email
      const { data, error } = await supabase
        .from("users")
        .update({ role: entry.role })
        .eq("email", entry.email)
        .select();

      if (error) {
        console.warn(`Failed to assign role ${entry.role} to ${entry.email}:`, error.message);
      } else if (data.length === 0) {
        console.warn(`User with email ${entry.email} not found.`);
      } else {
        console.log(`Assigned role ${entry.role} to ${entry.email}`);
      }

    } catch (err) {
      console.error(`Unexpected error assigning role ${entry.role} to ${entry.email}:`, err);
    }
  }

  console.log("Seeding completed!");
}

seed(); 
