// scripts/seed-user-buildings.js
// Seeds user_buildings assignments for managers
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing");
  process.exit(1);
}

const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seedUserBuildings() {
  console.log("Starting user_buildings seeding...");

  try {
    // 1. Get all managers
    const { data: managers, error: managersError } = await supabaseClient
      .from("users")
      .select("id, email, role")
      .eq("role", "manager");

    if (managersError) throw managersError;
    console.log(`Found ${managers?.length || 0} managers`);

    // 2. Get all buildings
    const { data: buildings, error: buildingsError } = await supabaseClient
      .from("buildings")
      .select("id, name, code");

    if (buildingsError) throw buildingsError;
    console.log(`Found ${buildings?.length || 0} buildings`);

    if (!managers || !buildings || managers.length === 0 || buildings.length === 0) {
      console.warn("No managers or buildings found. Please seed managers and buildings first.");
      return;
    }

    // 3. Assign each manager to at least one building
    for (const manager of managers) {
      // Assign to first building
      const { data, error } = await supabaseClient
        .from("user_buildings")
        .upsert(
          { user_id: manager.id, building_id: buildings[0].id },
          { onConflict: "user_id,building_id" }
        );

      if (error) {
        console.error(`Error assigning building to ${manager.email}:`, error);
      } else {
        console.log(`✓ Assigned ${manager.email} to ${buildings[0].name}`);
      }
    }

    console.log("\n✓ Seeding completed!");
    process.exit(0);
  } catch (err) {
    console.error("Error during seeding:", err);
    process.exit(1);
  }
}

seedUserBuildings();
