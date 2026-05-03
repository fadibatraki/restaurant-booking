# Restaurant Booking Project — Agent Reference

This document is the single source of truth for the current state of the **restaurant-booking** project. It is intended for use by the coding agent inside VS Code so the agent understands exactly what has already been done, what architecture is approved, and what constraints must be respected.

---

## 1) Project Goal

We are building a **restaurant booking platform** inside a **monorepo**.

Current planned apps:

* `apps/web` → web app / admin dashboard later
* `apps/mobile` → customer mobile app using Expo / React Native
* `apps/api` → backend API using NestJS

The current goal is no longer only to build the backend foundation.  
We now have a working backend MVP, and the next major phase is to begin **web integration** while keeping the architecture clean and scalable.

---

## 2) Approved Technical Decisions

### Monorepo

* The project was created with **Turborepo**
* The selected package manager is **npm**
* Do **not** switch to `pnpm`
* Do **not** mix package managers

### Frontend / Mobile / Backend

* `apps/web` exists and was created from the Turborepo template
* `apps/mobile` was created successfully with Expo
* `apps/api` was created successfully with NestJS

### Database / ORM

* Database: **PostgreSQL** running in Docker
* ORM: **Prisma v6**
* Prisma v7 was tried, but the project was intentionally moved back to **Prisma 6** to avoid unnecessary configuration complexity and keep compatibility with standard NestJS + Prisma patterns

---

## 3) Current Repository Structure

Project root:

```bash
restaurant-booking/

Relevant structure:

apps/
  web/
  mobile/
  api/
packages/
Removed app
apps/docs was deleted because it is not needed for this product
4) Database Setup
PostgreSQL Docker container

A PostgreSQL container is running with the following concept:

container name: restaurant-postgres
database name: restaurant_booking
username: postgres
password: postgres
host port: 5433
container port: 5432
Why host port 5433?

Because local port 5432 was already in use on the machine.

apps/api/.env

The API app uses this database connection string:

DATABASE_URL="postgresql://postgres:postgres@localhost:5433/restaurant_booking"
5) Prisma Setup
Approved versions
prisma@6
@prisma/client@6
Important
prisma.config.ts was removed intentionally
The project uses the classic Prisma 6 setup
Do not reintroduce prisma.config.ts
Do not upgrade back to Prisma 7 unless explicitly requested
apps/api/prisma/schema.prisma

Current schema includes:

Enums
UserRole
ReservationStatus

Current ReservationStatus values now in use:

PENDING
CONFIRMED
CANCELLED
COMPLETED
Models
User
Restaurant
Table
Reservation
The top of schema.prisma must remain in this format:
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
Migration status

Initial migration was created and applied successfully:

init

The database is in sync with the Prisma schema.

6) Backend Folder Structure

Inside apps/api/src, the approved structure is:

src/
  common/
  config/
  database/
  modules/
Planned modules

Folders/modules planned in the backend:

auth
users
restaurants
tables
reservations
Actually implemented now

Currently implemented and working:

users
auth
restaurants
tables
reservations
7) DatabaseModule and PrismaService
Existing files
src/database/prisma.service.ts
src/database/database.module.ts
PrismaService
Extends PrismaClient
Uses onModuleInit and onModuleDestroy
Connects and disconnects from the database properly
DatabaseModule
Marked as global with @Global()
Exports PrismaService
Critical rule

Any service that needs database access must use dependency injection with the existing PrismaService.

Do not create new PrismaClient() inside modules or services.

8) AppModule Expectations

AppModule should keep importing at least:

DatabaseModule
UsersModule
AuthModule
RestaurantsModule
TablesModule
ReservationsModule

If the agent edits app.module.ts, it must not remove DatabaseModule.

9) Users Module — Current Status
Generated with Nest CLI

The following files exist:

users.module.ts
users.service.ts
users.controller.ts
Current endpoints
GET /users

Returns users from PostgreSQL.

POST /users

Creates a user directly through UsersService.

Important note

POST /users exists for learning/testing and internal progress only.
It is not the final public registration flow.
Actual registration is now implemented in AuthModule.

10) Current UsersService Behavior
findAll()

Returns only safe fields using Prisma select:

id
name
email
phone
role
createdAt
create()

Creates a user with Prisma and returns only safe fields.

Security rule

Do not expose:

passwordHash

in external API responses.

11) DTO + Validation Setup
Installed packages

Inside apps/api, the following are installed:

class-validator
class-transformer
Global validation

ValidationPipe is enabled globally in src/main.ts with:

whitelist: true
forbidNonWhitelisted: true
transform: true
DTO usage

DTO validation is now used across implemented modules, including:

users
auth
restaurants
tables
reservations
TypeScript note

In DTOs, required fields use the ! operator to satisfy strict initialization rules, for example:

name!: string;
email!: string;
password!: string;
Validation already tested successfully
Valid request succeeds
Invalid request returns 400 Bad Request
Extra unexpected properties are rejected due to forbidNonWhitelisted: true
12) What Has Been Tested Successfully
Users
GET /users works and reads data from PostgreSQL
POST /users works and created test users such as:
Fadi
Ali
Sara
Validation behavior

Confirmed working:

invalid short name is rejected
invalid email is rejected
short password/hash/password fields are rejected depending on DTO
unexpected fields are rejected where DTO validation is applied
Response behavior

Confirmed that passwordHash is not returned in safe responses.

Auth behavior

Confirmed working:

register
login
get current user from token
Reservation customer flows

Confirmed working:

create reservation as authenticated user
list current user's reservations
get reservation by id for the owner only
update reservation notes for the owner only
cancel reservation for the owner only
Restaurant owner flows

Confirmed working:

list reservations for a restaurant owned by the current user
filter restaurant reservations by status
confirm reservation as restaurant owner
complete reservation as restaurant owner
non-owner access returns 403 Forbidden
Availability behavior

Confirmed working:

availability returns true when slot is free
availability returns false when blocked by PENDING or CONFIRMED
CANCELLED and COMPLETED do not block availability
optional guestsCount filtering works
invalid date query returns 400
invalid guestsCount returns 400
Reservation hardening behavior

Confirmed working:

reservation create rejects inactive table
reservation create still works for active table
duplicate same-table same-datetime blocking still works
13) Auth Module — Current Status

Implemented inside src/modules/auth:

auth.module.ts
auth.service.ts
auth.controller.ts
jwt-auth.guard.ts
dto/register.dto.ts
dto/login.dto.ts
Installed auth packages
bcrypt
@types/bcrypt
@nestjs/jwt
Current auth endpoints
POST /auth/register

Implemented and working.

Behavior:

validates request with RegisterDto
checks if email is already registered
hashes incoming password with bcrypt
saves the hash as passwordHash
returns only safe user fields
POST /auth/login

Implemented and working.

Behavior:

validates request with LoginDto
finds user by email
compares password with bcrypt.compare()
returns a real JWT access token
returns safe user fields only
GET /auth/me

Implemented and working.

Behavior:

protected by the existing JwtAuthGuard
reads Bearer token from Authorization header
validates JWT
returns basic current-user info from token payload
currently returns token-derived fields only and does not query the database
Important auth rules
Clients send password, never passwordHash
Backend hashes password with bcrypt
JWT payload includes:
sub
email
role
JWT_SECRET is configured in apps/api/.env
Guard/module wiring rule

JwtAuthGuard depends on JwtService, so AuthModule exports the needed JWT providers and other modules that use the guard must import AuthModule rather than duplicating JWT configuration.

14) Restaurants Module — Current Status

Implemented inside src/modules/restaurants.

Current endpoints
POST /restaurants

Implemented and working.

Temporary behavior:

accepts ownerId in request body
validates input with DTO
creates restaurant using Prisma
returns safe restaurant fields
GET /restaurants

Implemented and working.

Returns restaurant list from PostgreSQL.

Now also supports optional search query:

GET /restaurants?q=omar
GET /restaurants?q=berlin

Behavior:

filters restaurants by name OR address
filtering is case-insensitive
returns all restaurants when q is missing
ordered by createdAt desc
GET /restaurants/:id

Implemented and working.

Behavior:

returns one restaurant by id
throws NotFoundException if not found
GET /restaurants/:id/tables

Implemented and working.

Behavior:

verifies restaurant exists first
throws NotFoundException if restaurant not found
returns only tables belonging to that restaurant
GET /restaurants/:id/availability

Implemented and working.

Behavior:

verifies restaurant exists first
throws NotFoundException if restaurant not found
requires query param date
validates date as ISO 8601 string
returns restaurant tables with existing safe table fields plus isAvailable
marks a table as unavailable only if same table + same reservationDate has status:
PENDING
CONFIRMED
ignores these statuses for blocking:
CANCELLED
COMPLETED

Supports optional query param:

GET /restaurants/:id/availability?date=2026-04-29T19:00:00.000Z&guestsCount=4

When guestsCount is provided:

validates it as a positive integer
returns only tables where capacity >= guestsCount
GET /restaurants/:id/reservations

Implemented and working.

Behavior:

protected by the existing JwtAuthGuard
verifies restaurant exists first
throws NotFoundException if restaurant not found
allows access only if restaurant.ownerId === request.user.sub
throws ForbiddenException otherwise
returns only reservations for that restaurant
ordered by reservationDate asc

Supports optional query param status using existing ReservationStatus enum:

GET /restaurants/:id/reservations?status=PENDING
GET /restaurants/:id/reservations?status=CONFIRMED
GET /restaurants/:id/reservations?status=CANCELLED
GET /restaurants/:id/reservations?status=COMPLETED
PATCH /restaurants/:restaurantId/reservations/:reservationId/confirm

Implemented and working.

Behavior:

protected by the existing JwtAuthGuard
verifies restaurant exists first
throws NotFoundException if restaurant not found
allows access only if restaurant.ownerId === request.user.sub
finds reservation by id
throws NotFoundException if reservation not found
rejects if reservation does not belong to that restaurant
allows confirm only from PENDING
updates status to CONFIRMED
returns safe reservation fields
PATCH /restaurants/:restaurantId/reservations/:reservationId/complete

Implemented and working.

Behavior:

protected by the existing JwtAuthGuard
verifies restaurant exists first
throws NotFoundException if restaurant not found
allows access only if restaurant.ownerId === request.user.sub
finds reservation by id
throws NotFoundException if reservation not found
rejects if reservation does not belong to that restaurant
allows complete only from CONFIRMED
updates status to COMPLETED
returns safe reservation fields
Current returned fields
id
name
description
address
phone
image
openTime
closeTime
ownerId
createdAt
Important note

Using ownerId from request body is a temporary foundation-phase solution. Later this should be connected to the authenticated user context.

15) Tables Module — Current Status

Implemented inside src/modules/tables.

Current endpoints
POST /tables

Implemented and working.

Behavior:

validates input with DTO
accepts:
name
capacity
isActive?
restaurantId
creates table linked to restaurant
returns safe table fields
GET /tables

Implemented and working.

Returns table list from PostgreSQL.

Current returned fields
id
name
capacity
isActive
restaurantId
createdAt
16) Reservations Module — Current Status

Implemented inside src/modules/reservations.

Current endpoints
POST /reservations

Implemented and working.

Current behavior:

protected by the existing JwtAuthGuard
does not accept userId in request body anymore
reads authenticated user from request.user.sub
creates reservation for the authenticated user
returns safe reservation fields
GET /reservations

Implemented and working.

Returns reservation list from PostgreSQL.

GET /reservations/my

Implemented and working.

Behavior:

protected by the existing JwtAuthGuard
reads authenticated user from request.user
returns only reservations belonging to request.user.sub
ordered by reservationDate asc
GET /reservations/:id

Implemented and working.

Behavior:

protected by the existing JwtAuthGuard
finds reservation by id
throws NotFoundException if not found
allows access only if reservation.userId === request.user.sub
throws ForbiddenException otherwise
returns safe reservation fields
PATCH /reservations/:id/notes

Implemented and working.

Behavior:

protected by the existing JwtAuthGuard
owner-only
updates notes only
uses DTO validation
throws NotFoundException if reservation not found
throws ForbiddenException if reservation belongs to another user
returns safe reservation fields
PATCH /reservations/:id/cancel

Implemented and working.

Behavior:

protected by the existing JwtAuthGuard
owner-only
throws NotFoundException if reservation not found
throws ForbiddenException if reservation belongs to another user
allows cancel only from:
PENDING
CONFIRMED
rejects already cancelled reservation with BadRequestException
updates status to CANCELLED
returns safe reservation fields
Current returned fields
id
userId
restaurantId
tableId
reservationDate
guestsCount
notes
status
createdAt
Business rules already implemented in reservation create flow

Before creating a reservation, the service now:

Verifies the restaurant exists
Verifies the table exists
Verifies the table belongs to the provided restaurant
Rejects if the selected table is inactive
Rejects if guestsCount > table.capacity
Rejects if reservationDate is in the past
Rejects duplicate bookings when another PENDING or CONFIRMED reservation exists for the same table at the same reservationDate
Exception behavior

The reservation create flow now uses proper Nest exceptions such as:

NotFoundException
BadRequestException
ConflictException
Important note

This is now a full authenticated customer reservation flow, not only the initial foundation route.

17) Agent Rules and Constraints

The coding agent must follow these rules:

Do not change the approved architecture unless explicitly asked.
Do not recreate the project from scratch.
Do not reintroduce Prisma 7 config patterns.
Do not re-add prisma.config.ts.
Do not instantiate new PrismaClient() inside services.
Always use the existing PrismaService.
Never expose passwordHash in external responses.
Use bcrypt for auth password hashing.
Reuse the existing JWT setup rather than duplicating it.
Any new input should use DTOs and validation where appropriate.
Prefer small, focused edits over broad refactors.
Do not break existing working endpoints.
Do not refactor unrelated modules when implementing one small feature.
Prefer runtime-safe Nest module wiring when guards/providers cross module boundaries.
18) Collaboration Style From Now On

We will continue using the coding agent like this:

Give a small, precise prompt
Let the agent implement a focused change
Review the output carefully
Explain what changed
Test it
Move to the next step

In short:

Prompt → Implement → Review → Explain → Test → Continue

19) Current Development Priorities

Recommended next order from the current state:

Begin apps/web integration using the now-working backend APIs
Replace temporary ownerId request-body flows with authenticated ownership
Add additional owner/admin dashboard flows as needed
Add more UX-oriented web/mobile consumption patterns
Add future availability/time-slot refinements if product requirements need them
20) Preferred Prompt Style for the Agent

Prompts should be:

short
explicit
scoped to specific files/modules
architecture-safe
minimal in blast radius
Example prompt style

Implement only the first web integration step for login inside apps/web, using the existing backend auth API, without refactoring unrelated files.

21) Important General Notes
The project is no longer only in the abstract foundation stage; it already has a working backend MVP
We still want speed, but not at the cost of breaking structure
Agent-generated code must always be reviewed before being trusted
The goal is not only “make it work” but also:
keep it understandable
keep it organized
keep it scalable
Runtime validation matters in NestJS, especially for module wiring and guards, not only compile success
22) Current Status Summary
Current status
monorepo ready
web ready
mobile ready
api ready
postgres running in docker on port 5433
prisma v6 working
migrations working
database connected
users module working
auth module fully working
restaurants module working
tables module working
reservations module working
DTO validation working
JWT auth working
protected routes working
customer reservation flows working
restaurant owner flows working
availability working
reservation hardening rules working
Working flows now
create user
list users
register
login
get current user from token
create restaurant
list restaurants
search restaurants
get restaurant by id
get restaurant tables
get restaurant availability
create table
list tables
create reservation as authenticated user
list reservations
list current user's reservations
get reservation by id for the owner
update reservation notes
cancel reservation
list restaurant reservations as owner
filter restaurant reservations by status
confirm reservation as owner
complete reservation as owner
Next actionable task

Begin apps/web integration using the existing backend flows:

login
list/search restaurants
restaurant details
availability
create reservation
my reservations
owner dashboard later





=============================



## 23) Web App Progress — What Was Completed In This Conversation

The project is no longer only “web ready”.  
A substantial real **apps/web MVP** has now been built and connected to the existing backend auth + restaurant APIs.

This section reflects the current implemented state inside `apps/web`.

---

## 24) Core Web Architecture Decisions

### Session/Auth Model

The web app uses the existing backend auth system.

Approved web auth behavior:

- Login uses backend `POST /auth/login`
- JWT is stored as a secure HTTP-only cookie on the web side
- Protected pages resolve the current user server-side through existing `GET /auth/me`
- No duplicate auth system was introduced
- No frontend-only fake auth state

### Role-Based Web Access

Current route access model:

- Public users → public pages
- `RESTAURANT_ADMIN` → `/owner`
- `SUPER_ADMIN` → `/admin`
- `CUSTOMER` users are redirected away from internal admin surfaces

This uses the existing backend roles.

---

## 25) Public Web Pages Implemented

### Landing Page (`/`)

A real polished public homepage now exists.

Includes:

- Hero section
- CTA buttons
- Admin login entry
- Clear restaurant discovery messaging

### Restaurants Discovery (`/restaurants`)

Implemented and working.

Includes:

- Public restaurant listing
- Search UI connected to backend restaurant search
- Cards with live restaurant data
- Access notices when owner-only routes are blocked
- Navigation into restaurant details

### Restaurant Details (`/restaurants/:id`)

Implemented and working.

Includes:

- Restaurant information
- Address / hours / phone
- Live table inventory
- Booking preparation surface
- Navigation back to restaurants list

---

## 26) Login / Web Authentication Pages

### Login Page (`/login`)

Implemented and working.

Behavior:

- Uses real backend login
- Stores session cookie
- Redirects based on role:
  - restaurant admin → `/owner`
  - super admin → `/admin`

### Public Login Redirect Fix

Important bug was fixed:

Public “Admin Login” buttons previously ended in owner-only redirect loops.

Now:

- Public CTA links intentionally open login
- Existing session redirects remain intact
- Protected routes still behave correctly

### Register Page (`/register`)

Public self-signup was intentionally removed.

Current behavior:

- Invitation-only explanation page
- Explains that restaurant admins are created by super admins
- Direct link back to login

This matches SaaS onboarding direction.

---

## 27) Invitation-Based Restaurant Admin Onboarding

A first real invitation flow now exists.

### Super Admin Creates Invitation

Inside `/admin`, super admin can create invitations.

Invitation data includes:

- target email
- intended restaurant linkage
- tokenized invite link
- expiry
- status

### Accept Invite Page (`/accept-invite?token=...`)

Implemented and working.

Flow:

1. Open invite link
2. If another admin session exists:
   - user must sign out first
3. Invitee completes account setup:
   - password
   - account creation
4. Can login as new restaurant admin

### Important Protection

Invite acceptance is intentionally blocked while already signed in to another admin account to avoid session/account mixing.

This was tested and works correctly.

---

## 28) Owner Dashboard (`/owner`)

A real restaurant admin dashboard now exists.

Uses live backend data.

Features implemented:

### Owner Summary

- signed-in account
- role
- linked restaurants count

### Restaurant Management

For owned restaurants:

- restaurant cards
- summary data
- address
- hours
- phone
- created date

### Tables Management

Real live sections:

- list current tables
- table capacity
- active/inactive state
- create new table

### Reservations Management

Connected to existing backend flows:

- list restaurant reservations
- filter by status
- confirm reservation
- complete reservation

This was tested successfully.

### Logout Flow

Working from protected area.

---

## 29) Super Admin Dashboard (`/admin`)

A real protected platform admin area now exists.

Access:

- only `SUPER_ADMIN`

Restaurant admins are redirected to `/owner`.

### Dashboard Features

#### Platform Summary

Live metrics:

- total users
- total restaurants
- customer accounts
- restaurant admins

#### Restaurants Management

Shows:

- restaurant ownership coverage
- restaurants missing owners
- linked admins
- restaurant records

#### Users & Accounts

Lists accounts with clear role separation:

- SUPER_ADMIN
- RESTAURANT_ADMIN
- CUSTOMER

#### Invitation Management

Now upgraded from placeholder to first real invite flow.

#### Session Actions

- logout
- open owner area (when relevant)

---

## 30) UI / Design System

A premium warm neutral design language was applied consistently across apps/web.

Current style direction:

- elegant cream backgrounds
- orange CTAs
- serif headlines
- SaaS premium dashboard feeling
- card-based layouts
- polished spacing

This applies across:

- public pages
- login
- owner dashboard
- admin dashboard
- invite flow

---

## 31) Arabic-First Direction Approved

Product decision approved:

The platform is intended for Syria / Arabic users.

Therefore apps/web is now moving to:

- Arabic as default language
- RTL layout
- Arabic wording across all screens
- Arabic dashboards
- Arabic forms / notices / CTAs

This migration was requested and should be treated as the next main UI milestone.

---

## 32) What Has Been Successfully Tested

Confirmed working in web:

- public landing page
- restaurants listing
- restaurant details
- login flow
- role redirects
- owner dashboard access
- admin dashboard access
- create invitation
- open invite link
- accept invite after logout
- create invited restaurant admin account
- login with invited account
- table confirmation flows
- reservation completion flows

---

## 33) Critical Rules For Future Work

Do NOT break:

- existing cookie auth flow
- `/owner` role gate
- `/admin` role gate
- invite acceptance flow
- backend API contracts
- current dashboards

Prefer:

- focused safe edits
- real backend integration
- no fake placeholder systems unless explicitly temporary
- production-minded SaaS architecture

---

## 34) Current Real Product Status

Current state now:

- backend MVP working
- web MVP working
- public discovery working
- auth working
- owner operations working
- super admin operations working
- invitation onboarding working
- Arabic localization in progress

---

## 35) Recommended Next Priorities

Best next order:

1. Complete Arabic-first conversion of apps/web
2. Improve booking UX for customers
3. Add customer account dashboard
4. Add owner restaurant editing flows
5. Add invitation email sending backend
6. Build apps/mobile using same APIs
7. Production deployment

