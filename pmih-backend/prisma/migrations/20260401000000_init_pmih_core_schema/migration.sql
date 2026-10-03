-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PROPOSED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "HealthStatus" AS ENUM ('GREEN', 'AMBER', 'RED');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('ANNUAL', 'SICK', 'PARENTAL', 'UNPAID', 'PUBLIC_HOLIDAY');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PriorityLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'DONE');

-- CreateEnum
CREATE TYPE "DeliverableStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PLANNED', 'ON_TRACK', 'AT_RISK', 'ACHIEVED', 'MISSED');

-- CreateEnum
CREATE TYPE "DeadlineEntityType" AS ENUM ('TASK', 'DELIVERABLE', 'MILESTONE', 'CHANGE_REQUEST');

-- CreateEnum
CREATE TYPE "SourceSystem" AS ENUM ('OUTLOOK', 'TEAMS', 'GOOGLE_SHEETS', 'EXCEL', 'CHROME', 'UPLOAD', 'CALL_NOTE');

-- CreateEnum
CREATE TYPE "AccessClassification" AS ENUM ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "CommunicationChannel" AS ENUM ('EMAIL', 'CHAT', 'TRANSCRIPT', 'NOTE');

-- CreateEnum
CREATE TYPE "RiskLikelihood" AS ENUM ('VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH');

-- CreateEnum
CREATE TYPE "RiskImpact" AS ENUM ('NEGLIGIBLE', 'MINOR', 'MODERATE', 'MAJOR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IssueSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'BLOCKER');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'WAITING_ON_EXTERNAL', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "DependencyType" AS ENUM ('FINISH_TO_START', 'START_TO_START', 'FINISH_TO_FINISH', 'START_TO_FINISH');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SyncJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'PARTIAL_SUCCESS');

-- CreateEnum
CREATE TYPE "AuditEventType" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'EXTRACTION_OVERRIDE', 'SYNC_EXECUTION');

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "industry" VARCHAR(100),
    "key_contacts" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "strategic_goals" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "program_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "phase" VARCHAR(100),
    "status" "ProjectStatus" NOT NULL DEFAULT 'PROPOSED',
    "health_status" "HealthStatus" NOT NULL DEFAULT 'GREEN',
    "start_date" DATE,
    "target_end_date" DATE,
    "actual_end_date" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "full_name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "role" VARCHAR(100) NOT NULL,
    "primary_department" VARCHAR(100) NOT NULL,
    "hourly_cost" DECIMAL(12,2),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_skills" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resource_id" UUID NOT NULL,
    "skill_name" VARCHAR(100) NOT NULL,
    "proficiency_level" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_availabilities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resource_id" UUID NOT NULL,
    "weekly_capacity_hours" DECIMAL(5,2) NOT NULL DEFAULT 40.00,
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    "max_simultaneous_projects" INTEGER NOT NULL DEFAULT 3,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_availabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_allocations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resource_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "allocated_percentage" DECIMAL(5,2) NOT NULL,
    "planned_effort_hours" DECIMAL(8,2) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaves_or_absences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resource_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "leave_type" "LeaveType" NOT NULL,
    "status" "LeaveStatus" NOT NULL DEFAULT 'REQUESTED',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leaves_or_absences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "client_id" UUID,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "priority" "PriorityLevel" NOT NULL DEFAULT 'MEDIUM',
    "status" "TaskStatus" NOT NULL DEFAULT 'BACKLOG',
    "accountable_owner_id" UUID NOT NULL,
    "estimated_effort_hours" DECIMAL(8,2),
    "start_date" DATE,
    "due_date" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subtasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "task_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "assigned_resource_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subtasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "target_date" DATE NOT NULL,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PLANNED',
    "completion_date" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliverables" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "milestone_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" "DeliverableStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "due_date" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deliverables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deadlines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entity_type" "DeadlineEntityType" NOT NULL,
    "entity_id" UUID NOT NULL,
    "constraint_date" DATE NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deadlines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "status_updates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "task_id" UUID,
    "author_resource_id" UUID NOT NULL,
    "summary_text" TEXT NOT NULL,
    "health_indicator" "HealthStatus" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "status_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_system" "SourceSystem" NOT NULL,
    "source_record_id" VARCHAR(255) NOT NULL,
    "source_url" TEXT,
    "author_sender" VARCHAR(255),
    "recipients_participants" JSONB NOT NULL DEFAULT '[]',
    "source_timestamp" TIMESTAMPTZ(6),
    "ingestion_timestamp" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "relevant_excerpt" TEXT,
    "client_id" UUID,
    "project_id" UUID,
    "extraction_confidence" DOUBLE PRECISION,
    "access_classification" "AccessClassification" NOT NULL DEFAULT 'INTERNAL',
    "content_hash" VARCHAR(64) NOT NULL,
    "original_metadata" JSONB NOT NULL DEFAULT '{}',
    "embedding" vector(1536),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_record_id" UUID NOT NULL,
    "channel_type" "CommunicationChannel" NOT NULL,
    "subject" VARCHAR(500),
    "content" TEXT NOT NULL,
    "sent_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meetings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_record_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "start_time" TIMESTAMPTZ(6) NOT NULL,
    "end_time" TIMESTAMPTZ(6) NOT NULL,
    "attendees" JSONB NOT NULL DEFAULT '[]',
    "transcript_text" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_record_id" UUID NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_type" VARCHAR(100) NOT NULL,
    "file_path_or_url" TEXT NOT NULL,
    "parsed_content" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decisions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_record_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "decision_maker_resource_id" UUID,
    "impact_summary" TEXT,
    "date_decided" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commitments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_record_id" UUID NOT NULL,
    "task_id" UUID,
    "meeting_id" UUID,
    "client_id" UUID,
    "resource_id" UUID,
    "description" TEXT NOT NULL,
    "target_fulfillment_date" DATE,
    "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commitments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "meeting_id" UUID,
    "source_record_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "assigned_resource_id" UUID NOT NULL,
    "due_date" DATE,
    "converted_to_task_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "action_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "likelihood" "RiskLikelihood" NOT NULL DEFAULT 'MEDIUM',
    "impact" "RiskImpact" NOT NULL DEFAULT 'MODERATE',
    "mitigation_plan" TEXT,
    "owner_resource_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issues" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "IssueSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "IssueStatus" NOT NULL DEFAULT 'OPEN',
    "blocker_age_days" INTEGER NOT NULL DEFAULT 0,
    "owner_resource_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dependencies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "predecessor_task_id" UUID NOT NULL,
    "successor_task_id" UUID NOT NULL,
    "dependency_type" "DependencyType" NOT NULL DEFAULT 'FINISH_TO_START',
    "lag_days" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "change_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "cr_code" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,
    "business_reason" TEXT,
    "schedule_impact_days" INTEGER NOT NULL DEFAULT 0,
    "cost_impact" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "approval_status" "ApprovalStatus" NOT NULL DEFAULT 'DRAFT',
    "approver_resource_id" UUID,
    "is_potential_unregistered_cr" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "connector_name" VARCHAR(100) NOT NULL,
    "status" "SyncJobStatus" NOT NULL DEFAULT 'QUEUED',
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "records_processed" INTEGER NOT NULL DEFAULT 0,
    "failed_records" INTEGER NOT NULL DEFAULT 0,
    "error_details" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_type" "AuditEventType" NOT NULL,
    "actor_user_id" VARCHAR(255) NOT NULL,
    "entity_affected" VARCHAR(100) NOT NULL,
    "entity_id" UUID NOT NULL,
    "source_record_id" UUID,
    "before_state" JSONB,
    "after_state" JSONB,
    "user_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clients_name_idx" ON "clients"("name");

-- CreateIndex
CREATE INDEX "programs_client_id_idx" ON "programs"("client_id");

-- CreateIndex
CREATE INDEX "projects_client_id_idx" ON "projects"("client_id");

-- CreateIndex
CREATE INDEX "projects_program_id_idx" ON "projects"("program_id");

-- CreateIndex
CREATE INDEX "projects_status_health_status_idx" ON "projects"("status", "health_status");

-- CreateIndex
CREATE UNIQUE INDEX "resources_email_key" ON "resources"("email");

-- CreateIndex
CREATE INDEX "resources_email_idx" ON "resources"("email");

-- CreateIndex
CREATE INDEX "resources_role_primary_department_idx" ON "resources"("role", "primary_department");

-- CreateIndex
CREATE INDEX "resource_skills_skill_name_idx" ON "resource_skills"("skill_name");

-- CreateIndex
CREATE UNIQUE INDEX "resource_skills_resource_id_skill_name_key" ON "resource_skills"("resource_id", "skill_name");

-- CreateIndex
CREATE UNIQUE INDEX "resource_availabilities_resource_id_key" ON "resource_availabilities"("resource_id");

-- CreateIndex
CREATE INDEX "resource_allocations_resource_id_idx" ON "resource_allocations"("resource_id");

-- CreateIndex
CREATE INDEX "resource_allocations_project_id_idx" ON "resource_allocations"("project_id");

-- CreateIndex
CREATE INDEX "resource_allocations_start_date_end_date_idx" ON "resource_allocations"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "leaves_or_absences_resource_id_idx" ON "leaves_or_absences"("resource_id");

-- CreateIndex
CREATE INDEX "leaves_or_absences_start_date_end_date_idx" ON "leaves_or_absences"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "tasks_project_id_status_idx" ON "tasks"("project_id", "status");

-- CreateIndex
CREATE INDEX "tasks_client_id_idx" ON "tasks"("client_id");

-- CreateIndex
CREATE INDEX "tasks_accountable_owner_id_idx" ON "tasks"("accountable_owner_id");

-- CreateIndex
CREATE INDEX "tasks_due_date_idx" ON "tasks"("due_date");

-- CreateIndex
CREATE INDEX "subtasks_task_id_idx" ON "subtasks"("task_id");

-- CreateIndex
CREATE INDEX "subtasks_assigned_resource_id_idx" ON "subtasks"("assigned_resource_id");

-- CreateIndex
CREATE INDEX "milestones_project_id_target_date_idx" ON "milestones"("project_id", "target_date");

-- CreateIndex
CREATE INDEX "deliverables_project_id_idx" ON "deliverables"("project_id");

-- CreateIndex
CREATE INDEX "deliverables_milestone_id_idx" ON "deliverables"("milestone_id");

-- CreateIndex
CREATE INDEX "deadlines_entity_type_entity_id_idx" ON "deadlines"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "deadlines_constraint_date_idx" ON "deadlines"("constraint_date");

-- CreateIndex
CREATE INDEX "status_updates_project_id_created_at_idx" ON "status_updates"("project_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "status_updates_task_id_idx" ON "status_updates"("task_id");

-- CreateIndex
CREATE INDEX "status_updates_author_resource_id_idx" ON "status_updates"("author_resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "source_records_content_hash_key" ON "source_records"("content_hash");

-- CreateIndex
CREATE INDEX "source_records_client_id_idx" ON "source_records"("client_id");

-- CreateIndex
CREATE INDEX "source_records_project_id_idx" ON "source_records"("project_id");

-- CreateIndex
CREATE INDEX "source_records_source_system_source_record_id_idx" ON "source_records"("source_system", "source_record_id");

-- CreateIndex
CREATE INDEX "source_records_ingestion_timestamp_idx" ON "source_records"("ingestion_timestamp" DESC);

-- CreateIndex
CREATE INDEX "communications_source_record_id_idx" ON "communications"("source_record_id");

-- CreateIndex
CREATE INDEX "communications_sent_at_idx" ON "communications"("sent_at" DESC);

-- CreateIndex
CREATE INDEX "meetings_source_record_id_idx" ON "meetings"("source_record_id");

-- CreateIndex
CREATE INDEX "meetings_start_time_idx" ON "meetings"("start_time" DESC);

-- CreateIndex
CREATE INDEX "documents_source_record_id_idx" ON "documents"("source_record_id");

-- CreateIndex
CREATE INDEX "decisions_source_record_id_idx" ON "decisions"("source_record_id");

-- CreateIndex
CREATE INDEX "decisions_decision_maker_resource_id_idx" ON "decisions"("decision_maker_resource_id");

-- CreateIndex
CREATE INDEX "commitments_source_record_id_idx" ON "commitments"("source_record_id");

-- CreateIndex
CREATE INDEX "commitments_resource_id_idx" ON "commitments"("resource_id");

-- CreateIndex
CREATE INDEX "commitments_client_id_idx" ON "commitments"("client_id");

-- CreateIndex
CREATE INDEX "commitments_task_id_idx" ON "commitments"("task_id");

-- CreateIndex
CREATE INDEX "action_items_source_record_id_idx" ON "action_items"("source_record_id");

-- CreateIndex
CREATE INDEX "action_items_assigned_resource_id_idx" ON "action_items"("assigned_resource_id");

-- CreateIndex
CREATE INDEX "action_items_meeting_id_idx" ON "action_items"("meeting_id");

-- CreateIndex
CREATE INDEX "risks_project_id_likelihood_impact_idx" ON "risks"("project_id", "likelihood", "impact");

-- CreateIndex
CREATE INDEX "risks_owner_resource_id_idx" ON "risks"("owner_resource_id");

-- CreateIndex
CREATE INDEX "issues_project_id_status_severity_idx" ON "issues"("project_id", "status", "severity");

-- CreateIndex
CREATE INDEX "issues_owner_resource_id_idx" ON "issues"("owner_resource_id");

-- CreateIndex
CREATE INDEX "dependencies_predecessor_task_id_idx" ON "dependencies"("predecessor_task_id");

-- CreateIndex
CREATE INDEX "dependencies_successor_task_id_idx" ON "dependencies"("successor_task_id");

-- CreateIndex
CREATE UNIQUE INDEX "dependencies_predecessor_task_id_successor_task_id_key" ON "dependencies"("predecessor_task_id", "successor_task_id");

-- CreateIndex
CREATE UNIQUE INDEX "change_requests_cr_code_key" ON "change_requests"("cr_code");

-- CreateIndex
CREATE INDEX "change_requests_project_id_approval_status_idx" ON "change_requests"("project_id", "approval_status");

-- CreateIndex
CREATE INDEX "change_requests_approver_resource_id_idx" ON "change_requests"("approver_resource_id");

-- CreateIndex
CREATE INDEX "sync_jobs_connector_name_status_idx" ON "sync_jobs"("connector_name", "status");

-- CreateIndex
CREATE INDEX "sync_jobs_started_at_idx" ON "sync_jobs"("started_at" DESC);

-- CreateIndex
CREATE INDEX "audit_events_entity_affected_entity_id_idx" ON "audit_events"("entity_affected", "entity_id");

-- CreateIndex
CREATE INDEX "audit_events_source_record_id_idx" ON "audit_events"("source_record_id");

-- CreateIndex
CREATE INDEX "audit_events_actor_user_id_idx" ON "audit_events"("actor_user_id");

-- CreateIndex
CREATE INDEX "audit_events_created_at_idx" ON "audit_events"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_skills" ADD CONSTRAINT "resource_skills_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_availabilities" ADD CONSTRAINT "resource_availabilities_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_allocations" ADD CONSTRAINT "resource_allocations_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_allocations" ADD CONSTRAINT "resource_allocations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaves_or_absences" ADD CONSTRAINT "leaves_or_absences_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_accountable_owner_id_fkey" FOREIGN KEY ("accountable_owner_id") REFERENCES "resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subtasks" ADD CONSTRAINT "subtasks_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subtasks" ADD CONSTRAINT "subtasks_assigned_resource_id_fkey" FOREIGN KEY ("assigned_resource_id") REFERENCES "resources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_updates" ADD CONSTRAINT "status_updates_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_updates" ADD CONSTRAINT "status_updates_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_updates" ADD CONSTRAINT "status_updates_author_resource_id_fkey" FOREIGN KEY ("author_resource_id") REFERENCES "resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_records" ADD CONSTRAINT "source_records_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_records" ADD CONSTRAINT "source_records_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communications" ADD CONSTRAINT "communications_source_record_id_fkey" FOREIGN KEY ("source_record_id") REFERENCES "source_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_source_record_id_fkey" FOREIGN KEY ("source_record_id") REFERENCES "source_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_source_record_id_fkey" FOREIGN KEY ("source_record_id") REFERENCES "source_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_source_record_id_fkey" FOREIGN KEY ("source_record_id") REFERENCES "source_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_decision_maker_resource_id_fkey" FOREIGN KEY ("decision_maker_resource_id") REFERENCES "resources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commitments" ADD CONSTRAINT "commitments_source_record_id_fkey" FOREIGN KEY ("source_record_id") REFERENCES "source_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commitments" ADD CONSTRAINT "commitments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commitments" ADD CONSTRAINT "commitments_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commitments" ADD CONSTRAINT "commitments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commitments" ADD CONSTRAINT "commitments_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_items" ADD CONSTRAINT "action_items_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_items" ADD CONSTRAINT "action_items_source_record_id_fkey" FOREIGN KEY ("source_record_id") REFERENCES "source_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_items" ADD CONSTRAINT "action_items_assigned_resource_id_fkey" FOREIGN KEY ("assigned_resource_id") REFERENCES "resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_items" ADD CONSTRAINT "action_items_converted_to_task_id_fkey" FOREIGN KEY ("converted_to_task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risks" ADD CONSTRAINT "risks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risks" ADD CONSTRAINT "risks_owner_resource_id_fkey" FOREIGN KEY ("owner_resource_id") REFERENCES "resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_owner_resource_id_fkey" FOREIGN KEY ("owner_resource_id") REFERENCES "resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dependencies" ADD CONSTRAINT "dependencies_predecessor_task_id_fkey" FOREIGN KEY ("predecessor_task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dependencies" ADD CONSTRAINT "dependencies_successor_task_id_fkey" FOREIGN KEY ("successor_task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_approver_resource_id_fkey" FOREIGN KEY ("approver_resource_id") REFERENCES "resources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_source_record_id_fkey" FOREIGN KEY ("source_record_id") REFERENCES "source_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Enable Extensions if not present
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- HNSW Vector Index for 1536-dimensional cosine similarity embeddings
CREATE INDEX IF NOT EXISTS source_records_embedding_hnsw_idx 
ON "source_records" 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- GIN Full-Text Index on excerpt for hybrid search
CREATE INDEX IF NOT EXISTS source_records_excerpt_fts_idx 
ON "source_records" 
USING gin (to_tsvector('english', coalesce("relevant_excerpt", '')));