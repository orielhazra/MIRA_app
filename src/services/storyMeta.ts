import { Story, StoryMeta } from "../types";

export function storyToMeta(story: Story): StoryMeta {
  const castMembers = Array.isArray(story.castMembers) ? story.castMembers : [];

  return {
    id: story.id,
    title: story.title || "Untitled Story",
    templateWorldId: story.templateWorldId || "",
    castMemberCount: castMembers.length,
    createdAt: story.createdAt,
    lastPlayedAt: story.lastPlayedAt,
  };
}

export function upsertStoryMeta(metas: StoryMeta[], meta: StoryMeta): StoryMeta[] {
  const index = metas.findIndex((item) => item.id === meta.id);
  if (index === -1) return [...metas, meta];
  return metas.map((item, itemIndex) => (itemIndex === index ? meta : item));
}
