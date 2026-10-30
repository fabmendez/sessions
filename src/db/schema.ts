import {
  pgTable, pgEnum, text, timestamp, boolean, integer, real, primaryKey, uniqueIndex, index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const created = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

// ─── Enums ────────────────────────────────────────────────────────────────
export const availabilityEnum = pgEnum("availability", ["available", "selective", "busy"]);
export const connectionStatusEnum = pgEnum("connection_status", ["pending", "accepted", "declined"]);
export const opportunityCategoryEnum = pgEnum("opportunity_category", [
  "vocalist", "producer", "remix", "songwriter", "session_musician",
  "dj_booking", "mix_engineer", "mastering_engineer", "live_performer", "band_member",
]);
export const opportunityStatusEnum = pgEnum("opportunity_status", ["open", "filled", "closed"]);
export const applicationStatusEnum = pgEnum("application_status", ["pending", "shortlisted", "accepted", "declined"]);
export const projectStatusEnum = pgEnum("project_status", ["idea", "recruiting", "in_progress", "mixing", "finished", "released"]);
export const memberStatusEnum = pgEnum("member_status", ["invited", "active", "left"]);
export const sceneKindEnum = pgEnum("scene_kind", ["genre", "city", "community"]);
export const inviteStatusEnum = pgEnum("invite_status", ["requested", "approved", "declined"]);
export const messageKindEnum =pgEnum("message_kind", ["text", "project_invite", "opportunity_link", "profile_link", "project_link"]);

// ─── Auth ─────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"), // null for OAuth-only accounts
  createdAt: created(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // random token, stored hashed
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, (t) => [index("sessions_user_idx").on(t.userId)]);

/** Fixed-window counters for login and invite rate limiting (see src/lib/rate-limit.ts). */
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(), // e.g. "login:email:x@y.z", "login:ip:1.2.3.4", "invite:ip:1.2.3.4"
  count: integer("count").notNull().default(0),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
}, (t) => [index("rate_limits_reset_idx").on(t.resetAt)]);

/**
 * Session is invite-only. A member requests an invite → an admin approves it (admins' own invites skip that step)
 * → the approved invite gets a link → the account is created from that link, with the invite's email.
 */
export const invites = pgTable("invites", {
  id: id(),
  email: text("email").notNull(), // the account is created with this email
  note: text("note").notNull().default(""), // the inviter's "who are they?" for the admin
  status: inviteStatusEnum("status").notNull().default("requested"),
  invitedById: text("invited_by_id").references(() => creatorProfiles.id, { onDelete: "set null" }), // null = created from the command line
  createdAt: created(),
  reviewedById: text("reviewed_by_id").references(() => creatorProfiles.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  tokenHash: text("token_hash").unique(), // set on approval; the link's token, stored hashed
  expiresAt: timestamp("expires_at", { withTimezone: true }), // set on approval
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  acceptedUserId: text("accepted_user_id").references(() => users.id, { onDelete: "set null" }),
}, (t) => [index("invites_inviter_idx").on(t.invitedById), index("invites_email_idx").on(t.email), index("invites_status_idx").on(t.status)]);

/** Reserved for OAuth providers (Google, Apple, Spotify…). */
export const accounts = pgTable("accounts", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  createdAt: created(),
}, (t) => [uniqueIndex("accounts_provider_uq").on(t.provider, t.providerAccountId), index("accounts_user_idx").on(t.userId)]);

// ─── Taxonomy ─────────────────────────────────────────────────────────────
export const roles = pgTable("roles", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  sort: integer("sort").notNull().default(0),
});

export const genres = pgTable("genres", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
});

export const skills = pgTable("skills", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(), // Production, Vocals, DJ, Instruments, Engineering, Writing
}, (t) => [index("skills_category_idx").on(t.category)]);

// ─── Creator profile ──────────────────────────────────────────────────────
export const creatorProfiles = pgTable("creator_profiles", {
  id: id(),
  userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  handle: text("handle").notNull().unique(),
  displayName: text("display_name").notNull(),
  bio: text("bio").notNull().default(""),
  avatarUrl: text("avatar_url"),
  avatarSeed: integer("avatar_seed").notNull().default(0),
  city: text("city"),
  country: text("country"),
  lat: real("lat"),
  lng: real("lng"),
  remote: boolean("remote").notNull().default(true),
  availability: availabilityEnum("availability").notNull().default("available"),
  lookingFor: text("looking_for").array().notNull().default(sql`'{}'::text[]`),
  onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: created(),
}, (t) => [
  index("profiles_city_idx").on(t.city),
  index("profiles_availability_idx").on(t.availability),
  index("profiles_active_idx").on(t.lastActiveAt),
]);

export const profileRoles = pgTable("profile_roles", {
  profileId: text("profile_id").notNull().references(() => creatorProfiles.id, { onDelete: "cascade" }),
  roleId: text("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  isPrimary: boolean("is_primary").notNull().default(false),
}, (t) => [primaryKey({ columns: [t.profileId, t.roleId] }), index("profile_roles_role_idx").on(t.roleId)]);

export const profileGenres = pgTable("profile_genres", {
  profileId: text("profile_id").notNull().references(() => creatorProfiles.id, { onDelete: "cascade" }),
  genreId: text("genre_id").notNull().references(() => genres.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.profileId, t.genreId] }), index("profile_genres_genre_idx").on(t.genreId)]);

/** Endorsements / evidence can hang off this row later. */
export const profileSkills = pgTable("profile_skills", {
  profileId: text("profile_id").notNull().references(() => creatorProfiles.id, { onDelete: "cascade" }),
  skillId: text("skill_id").notNull().references(() => skills.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.profileId, t.skillId] }), index("profile_skills_skill_idx").on(t.skillId)]);

export const workSamples = pgTable("work_samples", {
  id: id(),
  profileId: text("profile_id").notNull().references(() => creatorProfiles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  artworkUrl: text("artwork_url"),
  artSeed: integer("art_seed").notNull().default(0),
  audioUrl: text("audio_url"),
  externalUrl: text("external_url"),
  creditRole: text("credit_role").notNull(), // Produced, Vocals, Mixed…
  genreId: text("genre_id").references(() => genres.id, { onDelete: "set null" }),
  collaboratorNote: text("collaborator_note"), // free text for people not on the platform
  position: integer("position").notNull().default(0),
  createdAt: created(),
}, (t) => [index("work_samples_profile_idx").on(t.profileId, t.position)]);

export const workSampleCollaborators = pgTable("work_sample_collaborators", {
  workSampleId: text("work_sample_id").notNull().references(() => workSamples.id, { onDelete: "cascade" }),
  profileId: text("profile_id").notNull().references(() => creatorProfiles.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.workSampleId, t.profileId] })]);

// ─── Connections ──────────────────────────────────────────────────────────
export const connections = pgTable("connections", {
  id: id(),
  requesterId: text("requester_id").notNull().references(() => creatorProfiles.id, { onDelete: "cascade" }),
  addresseeId: text("addressee_id").notNull().references(() => creatorProfiles.id, { onDelete: "cascade" }),
  status: connectionStatusEnum("status").notNull().default("pending"),
  note: text("note"),
  createdAt: created(),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
}, (t) => [
  uniqueIndex("connections_pair_uq").on(t.requesterId, t.addresseeId),
  index("connections_addressee_idx").on(t.addresseeId, t.status),
]);

// ─── Scenes ───────────────────────────────────────────────────────────────
export const scenes = pgTable("scenes", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  kind: sceneKindEnum("kind").notNull(),
  city: text("city"),
  genreId: text("genre_id").references(() => genres.id, { onDelete: "set null" }),
  artSeed: integer("art_seed").notNull().default(0),
  createdAt: created(),
});

export const sceneMembers = pgTable("scene_members", {
  sceneId: text("scene_id").notNull().references(() => scenes.id, { onDelete: "cascade" }),
  profileId: text("profile_id").notNull().references(() => creatorProfiles.id, { onDelete: "cascade" }),
  joinedAt: created(),
}, (t) => [primaryKey({ columns: [t.sceneId, t.profileId] }), index("scene_members_profile_idx").on(t.profileId)]);

// ─── Projects ─────────────────────────────────────────────────────────────
export const projects = pgTable("projects", {
  id: id(),
  slug: text("slug").notNull().unique(),
  ownerId: text("owner_id").notNull().references(() => creatorProfiles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  genreId: text("genre_id").references(() => genres.id, { onDelete: "set null" }),
  status: projectStatusEnum("status").notNull().default("idea"),
  progress: integer("progress").notNull().default(0), // 0–100
  artworkUrl: text("artwork_url"),
  artSeed: integer("art_seed").notNull().default(0),
  demoUrl: text("demo_url"),
  sceneId: text("scene_id").references(() => scenes.id, { onDelete: "set null" }),
  creditsIssuedAt: timestamp("credits_issued_at", { withTimezone: true }),
  createdAt: created(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("projects_owner_idx").on(t.ownerId),
  index("projects_status_idx").on(t.status, t.updatedAt),
  index("projects_scene_idx").on(t.sceneId),
]);

export const projectMembers = pgTable("project_members", {
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  profileId: text("profile_id").notNull().references(() => creatorProfiles.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  status: memberStatusEnum("status").notNull().default("active"),
  invitedById: text("invited_by_id").references(() => creatorProfiles.id, { onDelete: "set null" }),
  joinedAt: created(),
}, (t) => [primaryKey({ columns: [t.projectId, t.profileId] }), index("project_members_profile_idx").on(t.profileId, t.status)]);

export const projectFollows = pgTable("project_follows", {
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  profileId: text("profile_id").notNull().references(() => creatorProfiles.id, { onDelete: "cascade" }),
  createdAt: created(),
}, (t) => [primaryKey({ columns: [t.projectId, t.profileId] }), index("project_follows_profile_idx").on(t.profileId)]);

export const projectActivity = pgTable("project_activity", {
  id: id(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  actorId: text("actor_id").references(() => creatorProfiles.id, { onDelete: "set null" }),
  kind: text("kind").notNull(), // joined, status, update, demo, credits
  body: text("body").notNull(),
  createdAt: created(),
}, (t) => [index("project_activity_project_idx").on(t.projectId, t.createdAt)]);

// ─── Opportunities (open calls) ───────────────────────────────────────────
export const opportunities = pgTable("opportunities", {
  id: id(),
  authorId: text("author_id").notNull().references(() => creatorProfiles.id, { onDelete: "cascade" }),
  projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }), // set → it's an open role on a project
  sceneId: text("scene_id").references(() => scenes.id, { onDelete: "set null" }),
  category: opportunityCategoryEnum("category").notNull(),
  title: text("title").notNull(),
  projectSummary: text("project_summary").notNull(),
  lookingFor: text("looking_for").notNull(),
  style: text("style"),
  bpm: integer("bpm"),
  musicalKey: text("musical_key"),
  paid: boolean("paid").notNull().default(false),
  budgetAmount: integer("budget_amount"), // whole currency units
  currency: text("currency").notNull().default("GBP"),
  deadline: timestamp("deadline", { withTimezone: true }),
  remote: boolean("remote").notNull().default(true),
  city: text("city"),
  demoUrl: text("demo_url"),
  status: opportunityStatusEnum("status").notNull().default("open"),
  createdAt: created(),
}, (t) => [
  index("opportunities_status_deadline_idx").on(t.status, t.deadline),
  index("opportunities_author_idx").on(t.authorId),
  index("opportunities_project_idx").on(t.projectId),
  index("opportunities_category_idx").on(t.category),
]);

export const opportunityGenres = pgTable("opportunity_genres", {
  opportunityId: text("opportunity_id").notNull().references(() => opportunities.id, { onDelete: "cascade" }),
  genreId: text("genre_id").notNull().references(() => genres.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.opportunityId, t.genreId] }), index("opportunity_genres_genre_idx").on(t.genreId)]);

export const opportunityApplications = pgTable("opportunity_applications", {
  id: id(),
  opportunityId: text("opportunity_id").notNull().references(() => opportunities.id, { onDelete: "cascade" }),
  applicantId: text("applicant_id").notNull().references(() => creatorProfiles.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  workSampleId: text("work_sample_id").references(() => workSamples.id, { onDelete: "set null" }),
  proposedFee: integer("proposed_fee"),
  status: applicationStatusEnum("status").notNull().default("pending"),
  createdAt: created(),
}, (t) => [
  uniqueIndex("applications_once_uq").on(t.opportunityId, t.applicantId),
  index("applications_applicant_idx").on(t.applicantId),
]);

// ─── Credits & reputation ─────────────────────────────────────────────────
export const credits = pgTable("credits", {
  id: id(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  profileId: text("profile_id").notNull().references(() => creatorProfiles.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  confirmed: boolean("confirmed").notNull().default(false),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  createdAt: created(),
}, (t) => [
  uniqueIndex("credits_uq").on(t.projectId, t.profileId, t.role),
  index("credits_profile_idx").on(t.profileId, t.confirmed),
]);

/** Private, author→subject only. Not surfaced in the MVP UI; never aggregated into a public score. */
export const collaboratorFeedback = pgTable("collaborator_feedback", {
  id: id(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull().references(() => creatorProfiles.id, { onDelete: "cascade" }),
  subjectId: text("subject_id").notNull().references(() => creatorProfiles.id, { onDelete: "cascade" }),
  wouldWorkAgain: boolean("would_work_again"),
  note: text("note"),
  createdAt: created(),
}, (t) => [uniqueIndex("feedback_uq").on(t.projectId, t.authorId, t.subjectId)]);

// ─── Messaging ────────────────────────────────────────────────────────────
export const conversations = pgTable("conversations", {
  id: id(),
  createdAt: created(),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
});

export const conversationParticipants = pgTable("conversation_participants", {
  conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  profileId: text("profile_id").notNull().references(() => creatorProfiles.id, { onDelete: "cascade" }),
  lastReadAt: timestamp("last_read_at", { withTimezone: true }),
}, (t) => [primaryKey({ columns: [t.conversationId, t.profileId] }), index("participants_profile_idx").on(t.profileId)]);

export const messages = pgTable("messages", {
  id: id(),
  conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  senderId: text("sender_id").notNull().references(() => creatorProfiles.id, { onDelete: "cascade" }),
  kind: messageKindEnum("kind").notNull().default("text"),
  body: text("body").notNull().default(""),
  refId: text("ref_id"), // project / opportunity / profile id for rich messages
  refRole: text("ref_role"), // role offered in a project invite
  createdAt: created(),
}, (t) => [index("messages_conversation_idx").on(t.conversationId, t.createdAt)]);

// ─── Relations (for the relational query API) ─────────────────────────────
export const profileRelations = relations(creatorProfiles, ({ one, many }) => ({
  user: one(users, { fields: [creatorProfiles.userId], references: [users.id] }),
  roles: many(profileRoles),
  genres: many(profileGenres),
  skills: many(profileSkills),
  workSamples: many(workSamples),
}));
export const profileRolesRelations = relations(profileRoles, ({ one }) => ({
  profile: one(creatorProfiles, { fields: [profileRoles.profileId], references: [creatorProfiles.id] }),
  role: one(roles, { fields: [profileRoles.roleId], references: [roles.id] }),
}));
export const profileGenresRelations = relations(profileGenres, ({ one }) => ({
  profile: one(creatorProfiles, { fields: [profileGenres.profileId], references: [creatorProfiles.id] }),
  genre: one(genres, { fields: [profileGenres.genreId], references: [genres.id] }),
}));
export const profileSkillsRelations = relations(profileSkills, ({ one }) => ({
  profile: one(creatorProfiles, { fields: [profileSkills.profileId], references: [creatorProfiles.id] }),
  skill: one(skills, { fields: [profileSkills.skillId], references: [skills.id] }),
}));
export const workSamplesRelations = relations(workSamples, ({ one, many }) => ({
  profile: one(creatorProfiles, { fields: [workSamples.profileId], references: [creatorProfiles.id] }),
  genre: one(genres, { fields: [workSamples.genreId], references: [genres.id] }),
  collaborators: many(workSampleCollaborators),
}));
export const workSampleCollaboratorsRelations = relations(workSampleCollaborators, ({ one }) => ({
  workSample: one(workSamples, { fields: [workSampleCollaborators.workSampleId], references: [workSamples.id] }),
  profile: one(creatorProfiles, { fields: [workSampleCollaborators.profileId], references: [creatorProfiles.id] }),
}));
