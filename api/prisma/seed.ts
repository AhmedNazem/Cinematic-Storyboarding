import { prisma } from "../src/lib/db/client";

async function main(): Promise<void> {
  console.log("🌱 Seeding database...\n");

  // Clean existing data (reverse dependency order)
  await prisma.shot.deleteMany();
  await prisma.sequence.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  // --- Organizations ---
  const orgs = await Promise.all(
    [
      { name: "Axiom Studios" },
      { name: "Nebula Pictures" },
      { name: "Vertex Animation" },
      { name: "Parallax Films" },
      { name: "Lumina Productions" },
    ].map((data) => prisma.organization.create({ data })),
  );
  console.log(`✔ Created ${orgs.length} organizations`);

  // --- Users (spread across orgs, various roles) ---
  const users = await Promise.all(
    [
      { orgId: orgs[0].id, email: "director@axiom.studio", role: "owner" },
      { orgId: orgs[0].id, email: "editor@axiom.studio", role: "editor" },
      { orgId: orgs[1].id, email: "lead@nebula.pictures", role: "admin" },
      { orgId: orgs[2].id, email: "artist@vertex.anim", role: "editor" },
      { orgId: orgs[3].id, email: "viewer@parallax.film", role: "viewer" },
    ].map((data) => prisma.user.create({ data })),
  );
  console.log(`✔ Created ${users.length} users`);

  // --- Projects (one per org, cinematic aspect ratios) ---
  const projects = await Promise.all(
    [
      { orgId: orgs[0].id, name: "Desert Chase", aspectRatio: "2.39:1" },
      { orgId: orgs[1].id, name: "Neon City", aspectRatio: "1.85:1" },
      { orgId: orgs[2].id, name: "The Descent", aspectRatio: "2.39:1" },
      { orgId: orgs[3].id, name: "Orbital Dawn", aspectRatio: "16:9" },
      { orgId: orgs[4].id, name: "Silent Bloom", aspectRatio: "2.39:1" },
    ].map((data) => prisma.project.create({ data })),
  );
  console.log(`✔ Created ${projects.length} projects`);

  // --- Sequences (one per project) ---
  const sequences = await Promise.all(
    [
      { projectId: projects[0].id, name: "Act I – Ambush", orderIndex: 0 },
      { projectId: projects[1].id, name: "Opening Titles", orderIndex: 0 },
      { projectId: projects[2].id, name: "Cave Entrance", orderIndex: 0 },
      { projectId: projects[3].id, name: "Launch Sequence", orderIndex: 0 },
      { projectId: projects[4].id, name: "Garden at Dawn", orderIndex: 0 },
    ].map((data) => prisma.sequence.create({ data })),
  );
  console.log(`✔ Created ${sequences.length} sequences`);

  // --- Shots (one per sequence, with scene data stubs) ---
  const shots = await Promise.all(
    [
      {
        sequenceId: sequences[0].id,
        name: "Wide establishing – dunes",
        orderIndex: 0,
        durationSec: 4.5,
        sceneData: {
          camera: { type: "dolly", fov: 35, position: [0, 2, 10] },
          lights: [{ type: "directional", intensity: 1.2 }],
        },
      },
      {
        sequenceId: sequences[1].id,
        name: "Crane over skyline",
        orderIndex: 0,
        durationSec: 6.0,
        sceneData: {
          camera: { type: "crane", fov: 50, position: [0, 15, 5] },
          lights: [{ type: "point", intensity: 0.8, color: "#ff00ff" }],
        },
      },
      {
        sequenceId: sequences[2].id,
        name: "POV flashlight reveal",
        orderIndex: 0,
        durationSec: 3.0,
        sceneData: {
          camera: { type: "handheld", fov: 65, position: [0, 1.7, 0] },
          lights: [{ type: "spot", intensity: 2.0, angle: 0.3 }],
        },
      },
      {
        sequenceId: sequences[3].id,
        name: "Countdown montage",
        orderIndex: 0,
        durationSec: 8.0,
        sceneData: {
          camera: { type: "static", fov: 40, position: [5, 3, 12] },
          lights: [{ type: "ambient", intensity: 0.5 }],
        },
      },
      {
        sequenceId: sequences[4].id,
        name: "Close-up – petals falling",
        orderIndex: 0,
        durationSec: 5.0,
        sceneData: {
          camera: { type: "dolly", fov: 85, position: [0, 0.5, 1] },
          lights: [
            { type: "directional", intensity: 0.9, color: "#ffe4b5" },
          ],
        },
      },
    ].map((data) => prisma.shot.create({ data })),
  );
  console.log(`✔ Created ${shots.length} shots`);

  console.log("\n✅ Seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
