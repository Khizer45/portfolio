# Admin guide

Everything on the public site comes from the database and is managed in the admin dashboard at **`/admin`** (for example `https://khizer-hayat.vercel.app/admin`). You don't need to edit code to add a project, skill, job, certificate, or article.

**Golden rules**

- **Drafts are private.** A project marked *Draft* (or a hidden skill or experience entry) is never shown to visitors. Use drafts while you're still writing.
- **Changes go live in seconds.** After you save, the public site refreshes on the next page view. Reload once if you don't see it.
- **Be honest.** Mark planned and in-progress work as such, and only add results, employers, clients, and certificates you can verify.

---

## 1. First-time setup

You need an administrator account. It's created from the command line. There is deliberately no sign-up page.

```powershell
cd backend
.venv\Scripts\Activate.ps1
python -m app.cli create-admin --email khizerhayat.official0@gmail.com --name "Khizer Hayat"
```

Type a password of at least 12 characters when asked. A passphrase like `quiet-river-orbit-2026` is strong and easy to remember. For production, run this with `DATABASE_URL` pointing at the production database (see [DEPLOYMENT.md](./DEPLOYMENT.md#load-content-and-create-your-administrator)).

Forgot the password? `python -m app.cli set-password --email you@example.com`

## 2. Signing in and out

- Go to `/admin`. You'll be sent to the sign-in page.
- After **5 wrong passwords** in 15 minutes, sign-in is blocked for that account for 15 minutes. Wait, or reset the password from the command line.
- Sessions last **12 hours**. When one expires, you're returned to the sign-in page with a message, and nothing you already saved is lost.
- Sign out with the **arrow icon** at the bottom of the sidebar (on a phone, open the menu ☰ first).

## 3. The dashboard

It shows real counts from the database (published and draft projects, skills, experience, certifications, articles) and your **recent changes**. The quick buttons create a project, edit your profile, or open the public site.

---

## 4. Projects

**Admin → Projects → New project**

| Section | What to fill in |
| --- | --- |
| **Basics** | Title and short description (required; shown on cards). Subtitle, highlight label (e.g. "Final Year Project"), and an optional detailed description in Markdown. Leave **Slug** empty and it's generated from the title (`Local AI Lab` → `/projects/local-ai-lab`). |
| **Classification** | Primary category (required) and optional extra categories. **Status:** Planned, In Progress, Prototype, Completed, or Deployed. Your role, start and completion dates (`2026` or `2026-03`). **Technologies:** type a name and press Enter. Order is kept, and existing names are reused. |
| **Case study** | The problem, **features** (each marked *implemented*, *in progress*, or *planned*), your contribution and implementation (one point per line), architecture, engineering decisions, challenges, lessons, next steps. Empty sections are hidden on the site. |
| **Results & evaluation** | **Only measured results**, each with how it was measured (dataset, hardware, model version). If you have none yet, write an *evaluation note* such as "Results will be published after benchmarking". |
| **Media & links** | Screenshots and diagrams (see [§10](#10-images-certificates-and-your-cv)), plus GitHub, live demo, documentation, and video URLs. Leave any you don't have empty. |
| **Notice** | Optional warning box, e.g. "Educational project — not a medical device". |
| **Publishing** | **Published** (visible to visitors), **Featured** (shown on the home page), display order. |

Click **Create project**. If something is wrong, a red summary at the top lists the problems and each field shows its message. Nothing is saved until you fix them.

**From the project list you can:**
- **Publish or unpublish:** click the *Published / Draft* badge.
- **Feature or unfeature:** click the *Featured / Not featured* badge.
- **Reorder:** use the ↑ ↓ buttons (clear the search box first). The order is the order on the site.
- **Search and filter:** by text, publishing state, or status.
- **View, edit, delete:** use the icons. Deleting always asks for confirmation and can't be undone.

> To remove a project from the site but keep it, **unpublish** it rather than deleting it.

## 5. Skills

**Admin → Skills → New skill**: name, category, **proficiency** (Beginner / Intermediate / Advanced, explained on the Skills page), optional description, and an optional **evidence project** that demonstrates the skill. That project is linked only if it's published.

- **Currently learning** adds a "Learning" tag.
- **Show on the home page** puts the skill in the home page's skills overview.
- **Hide** a skill (badge in the list) to keep it without showing it.
- **Categories** are managed under **Admin → Skill categories** (create, rename, reorder). A category can't be deleted while it still has skills.

When you level up, just edit the skill's proficiency.

## 6. Experience: jobs, internships, freelance, contracts

**Admin → Experience → New experience entry**

- **Type:** Full-time, Part-time, Internship, Freelance, Contract, Volunteer, or Open source.
- **Organization or client**, website, location, and work mode (On-site / Remote / Hybrid).
- **Dates:** start (required) and end. For your current job, tick **I currently work here** and leave the end date empty.
- **Responsibilities** and **verified achievements**: one per line.
- **Technologies**, plus an optional link (label + URL).
- **Freelance client under NDA?** Tick **Confidential client**. The site then shows "Confidential client" instead of the name and hides the website.

The public timeline puts current roles first, then the most recent. Use the ↑ ↓ buttons to override the order.

## 7. Certifications, awards, and publications

**Admin → Certifications → New certification**: name, issuer, issue date, optional expiry and credential ID, **verification URL** (always add it when the issuer offers one), a link to the certificate image or PDF, related skills, and a description.

**Admin → Awards & publications** covers awards, achievements, scholarships, competitions, and publications. Each type gets its own section on the Certifications page.

Only add certificates and awards you actually hold.

## 8. Education

**Admin → Education**: qualification, institution, dates, grade, highlights, and coursework. Tick **Primary** for the entry highlighted on the home page; ticking it on one entry unticks it on the others.

## 9. Articles (Writing)

**Admin → Articles → New article**

- **Content** is written in **Markdown**: `## Heading`, `**bold**`, `- lists`, `` `code` ``, code blocks, and tables. Use the **Preview** tab to check it. Raw HTML is deliberately not rendered.
- **Status:** *Draft* (private) or *Published*. Publishing sets the publication date.
- **Published elsewhere?** Put the Medium or dev.to link in **External URL** instead of writing content here.
- **Related project:** the article is linked from that project's page.

## 10. Images, certificates, and your CV

The site stores **links** to files, not the files themselves. Free hosting providers delete uploaded files when they restart. You have two free options.

**Option A — put the file in the website (recommended)**

1. Copy the file into the frontend's `public` folder, for example:
   - `frontend/public/images/projects/skyntri/dashboard.png`
   - `frontend/public/certificates/aws-cloud-practitioner.pdf`
   - `frontend/public/cv/Khizer-Hayat-CV.pdf`
2. `git add`, `git commit`, `git push`. Vercel redeploys with the file.
3. In the admin, use the path **without** `public`: `/images/projects/skyntri/dashboard.png`.

**Option B — an external link.** Any `https://` URL works: an image in a GitHub repository (use the *raw* link), a Google Drive file shared as "anyone with the link", Cloudinary's free plan, and so on.

**Tips for screenshots**
- Use real screenshots of your own work only. Until you add one, a "Screenshot coming soon" placeholder is shown.
- Landscape images around **1600 × 1000** look best. Fill in width and height if you know them; it prevents layout jumps while the page loads.
- Always write meaningful **alt text** (what the image shows).
- Choose **Type → Architecture diagram** for diagrams. They appear in the Architecture section instead of the screenshot gallery.
- The first screenshot becomes the cover image on project cards.

**Your CV:** replace `frontend/public/cv/Khizer-Hayat-CV.pdf` and push, or put any URL in **Admin → Profile → CV URL**. The Download CV buttons follow that setting, and show "CV coming soon" if it's empty.

## 11. Profile

**Admin → Profile** edits your display name, role line, headline, introduction, biography (separate paragraphs with a blank line), location, **contact email** (leave empty to hide email everywhere), GitHub, LinkedIn, other profiles, CV, profile photo (optional; real photo only), the availability badge, focus areas, roles you're pursuing, languages, and the About-page lists.

## 12. Categories and technologies

- **Project categories:** each has a public page at `/projects/category/<slug>`. Categories without projects say "Projects coming soon". You can add new ones (pick an icon) and reorder them. A category can't be deleted while a project uses it as its primary category.
- **Technologies** are created automatically from project forms. Under **Admin → Technologies** you can fix spelling everywhere at once (e.g. "Pytorch" → "PyTorch"), delete one (it's removed from all projects), or remove unused ones.

## 13. Account and activity

- **Account & password:** change your password. Other devices are signed out.
- **Activity log:** every change and sign-in, with time and author. Use it to check what changed.

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Sign-in takes a long time the first time | The free backend was asleep; it wakes in about a minute. |
| "Too many failed sign-in attempts" | Wait 15 minutes, or reset the password with `python -m app.cli set-password`. |
| "Your session has expired" | Sign in again. Work you already saved is kept. |
| A change doesn't appear on the site | Reload the page. Changes always appear within 5 minutes even if the instant refresh fails. Check the item is **Published** / **Visible**. |
| "A project with this slug already exists" | Choose another slug, or leave it empty to generate a unique one. |
| "This record is still in use…" when deleting a category | Move its projects or skills to another category first. |
| Image doesn't show | Check the URL opens in a new tab. For files in `public/`, the path must start with `/` and the file must be pushed to GitHub. |
