import { prisma } from "../../../lib/db/client";

export interface FixtureProject {
  id: string;
  orgId: string;
  name: string;
  aspectRatio: string;
}

export interface FixtureSequence {
  id: string;
  projectId: string;
  name: string;
  orderIndex: number;
  shots: FixtureShot[];
}

export interface FixtureShot {
  id: string;
  sequenceId: string;
  name: string;
  orderIndex: number;
  durationSec: number;
}

export interface FixtureTree {
  project: FixtureProject;
  sequences: FixtureSequence[];
}

export interface SeedFixturesOptions {
  sequenceCount?: number;
  shotsPerSequence?: number;
  aspectRatio?: string;
  shotDurationSec?: number;
}

export async function seedFixtures(
  orgId: string,
  tag: string,
  opts: SeedFixturesOptions = {},
): Promise<FixtureTree> {
  const {
    sequenceCount = 2,
    shotsPerSequence = 3,
    aspectRatio = "16:9",
    shotDurationSec = 5.0,
  } = opts;

  const project = await prisma.project.create({
    data: { orgId, name: `Fixture-Film-${tag}`, aspectRatio },
  });

  const sequences: FixtureSequence[] = [];

  for (let si = 0; si < sequenceCount; si++) {
    const sequence = await prisma.sequence.create({
      data: {
        projectId: project.id,
        name: `Seq-${tag}-${si + 1}`,
        orderIndex: si,
      },
    });

    const shots: FixtureShot[] = [];
    for (let hi = 0; hi < shotsPerSequence; hi++) {
      const shot = await prisma.shot.create({
        data: {
          sequenceId: sequence.id,
          name: `Shot-${tag}-${si + 1}-${hi + 1}`,
          orderIndex: hi,
          durationSec: shotDurationSec,
        },
      });
      shots.push({
        id: shot.id,
        sequenceId: shot.sequenceId,
        name: shot.name,
        orderIndex: shot.orderIndex,
        durationSec: shot.durationSec,
      });
    }

    sequences.push({
      id: sequence.id,
      projectId: sequence.projectId,
      name: sequence.name,
      orderIndex: sequence.orderIndex,
      shots,
    });
  }

  return {
    project: {
      id: project.id,
      orgId: project.orgId,
      name: project.name,
      aspectRatio: project.aspectRatio,
    },
    sequences,
  };
}

export async function teardownFixtures(projectId: string): Promise<void> {
  await prisma.project.delete({ where: { id: projectId } });
}
