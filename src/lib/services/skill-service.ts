import { eq, and } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import { db } from '@/lib/db';
import { studySkills } from '@/lib/db/schema';
import { ServiceError } from '@/lib/services/service-error';
import { PREDEFINED_SKILLS } from '@/lib/exam/predefined-skills';

export type StudySkill = InferSelectModel<typeof studySkills>;

export interface SkillItem {
  id:         string;
  name:       string;
  topic:      string;
  rubric:     string;
  isCustom:   boolean;
}

/** Predefined skills plus the user's own custom skills, merged for display and for the examiner prompt. */
export async function listSkills(userId: string): Promise<SkillItem[]> {
  const custom = await db
    .select()
    .from(studySkills)
    .where(eq(studySkills.user_id, userId))
    .orderBy(studySkills.created_at);

  const predefined: SkillItem[] = PREDEFINED_SKILLS.map((s) => ({
    id:       s.id,
    name:     s.name,
    topic:    s.topic,
    rubric:   s.rubric,
    isCustom: false,
  }));

  const customItems: SkillItem[] = custom.map((s) => ({
    id:       s.id,
    name:     s.name,
    topic:    s.topic,
    rubric:   s.rubric,
    isCustom: true,
  }));

  return [...predefined, ...customItems];
}

export async function createSkill(
  userId: string,
  data: { name: string; topic: string; rubric: string },
): Promise<StudySkill> {
  const [skill] = await db
    .insert(studySkills)
    .values({ user_id: userId, ...data })
    .returning();

  return skill;
}

export async function deleteSkill(userId: string, skillId: string): Promise<void> {
  const [skill] = await db
    .select({ id: studySkills.id, user_id: studySkills.user_id })
    .from(studySkills)
    .where(eq(studySkills.id, skillId));

  if (!skill) {
    throw new ServiceError('NOT_FOUND', 'Skill not found');
  }
  if (skill.user_id !== userId) {
    throw new ServiceError('FORBIDDEN', 'Access denied');
  }

  await db
    .delete(studySkills)
    .where(and(eq(studySkills.id, skillId), eq(studySkills.user_id, userId)));
}
