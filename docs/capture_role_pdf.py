"""Capture viewport screenshots per role and build a screenshot-only PDF."""
from __future__ import annotations

import time
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright
from reportlab.lib.pagesizes import landscape
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

BASE = "http://localhost:5173"
OUT_DIR = Path(r"C:\xampp\htdocs\construction-project-management\docs\role-screenshots")
PDF_PATH = Path(r"C:\xampp\htdocs\construction-project-management\docs\Keystone-Role-Views.pdf")
PASSWORD = "Password123!"
VIEWPORT = {"width": 1440, "height": 900}

# Main features only — ordered by role. No text pages in the PDF.
CAPTURES: list[dict] = [
    # SaaS Admin
    {"role": "saas-admin", "email": "saas.admin@cpm.test", "path": "/admin/dashboard", "file": "01-saas-dashboard.png"},
    {"role": "saas-admin", "email": "saas.admin@cpm.test", "path": "/admin/saas/tenants", "file": "02-saas-tenants.png"},
    {"role": "saas-admin", "email": "saas.admin@cpm.test", "path": "/admin/saas/plans", "file": "03-saas-plans.png"},
    {"role": "saas-admin", "email": "saas.admin@cpm.test", "path": "/admin/saas/registration", "file": "04-saas-registration.png"},
    # Company Owner
    {"role": "owner", "email": "owner@desertbuild.test", "path": "/admin/dashboard", "file": "05-owner-dashboard.png"},
    {"role": "owner", "email": "owner@desertbuild.test", "path": "/admin/organization/projects", "file": "06-owner-projects.png"},
    {"role": "owner", "email": "owner@desertbuild.test", "path": "/admin/rbac/users", "file": "07-owner-users.png"},
    {"role": "owner", "email": "owner@desertbuild.test", "path": "/admin/organization/companies", "file": "08-owner-companies.png"},
    # Project Manager
    {"role": "pm", "email": "pm@desertbuild.test", "path": "/admin/dashboard", "file": "09-pm-dashboard.png"},
    {"role": "pm", "email": "pm@desertbuild.test", "path": "/admin/organization/projects", "file": "10-pm-projects.png"},
    {"role": "pm", "email": "pm@desertbuild.test", "path": "PROJECT_DETAIL", "file": "11-pm-project-detail.png"},
    {"role": "pm", "email": "pm@desertbuild.test", "path": "/admin/operations/inventory", "file": "12-pm-inventory.png"},
    # Viewer
    {"role": "viewer", "email": "viewer@desertbuild.test", "path": "/admin/dashboard", "file": "13-viewer-dashboard.png"},
    {"role": "viewer", "email": "viewer@desertbuild.test", "path": "/admin/organization/projects", "file": "14-viewer-projects.png"},
    {"role": "viewer", "email": "viewer@desertbuild.test", "path": "PROJECT_DETAIL", "file": "15-viewer-project-detail.png"},
    # Site Supervisor
    {"role": "supervisor", "email": "supervisor@desertbuild.test", "path": "/admin/dashboard", "file": "16-supervisor-dashboard.png"},
    {"role": "supervisor", "email": "supervisor@desertbuild.test", "path": "/admin/organization/projects", "file": "17-supervisor-projects.png"},
    {"role": "supervisor", "email": "supervisor@desertbuild.test", "path": "PROJECT_DETAIL_DIARY", "file": "18-supervisor-site-diary.png"},
]


def wait_app(page, timeout=20000):
    page.wait_for_load_state("networkidle", timeout=timeout)
    # Settle UI / React Query
    page.wait_for_timeout(800)


def login(page, email: str):
    page.goto(f"{BASE}/login", wait_until="networkidle")
    page.wait_for_timeout(400)
    # Clear any existing session
    page.evaluate(
        """() => {
      try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}
    }"""
    )
    page.goto(f"{BASE}/login", wait_until="networkidle")
    page.fill('input[type="email"], input[name="email"], input[autocomplete="username"]', email)
    page.fill('input[type="password"]', PASSWORD)
    page.click('button[type="submit"]')
    page.wait_for_url("**/admin/**", timeout=20000)
    wait_app(page)


def open_first_project(page) -> bool:
    page.goto(f"{BASE}/admin/organization/projects", wait_until="networkidle")
    wait_app(page)
    # Prefer portfolio cards / links into project detail
    link = page.locator('a[href*="/admin/organization/projects/"]').first
    if link.count() == 0:
        # Fallback: click first project card/button that navigates
        card = page.locator(".projects-card, .project-card, article a, table a").first
        if card.count() == 0:
            return False
        card.click()
    else:
        link.click()
    page.wait_for_url("**/admin/organization/projects/**", timeout=15000)
    wait_app(page)
    return True


def open_site_diary(page) -> bool:
    if not open_first_project(page):
        return False
    url = page.url.split("?")[0]
    page.goto(f"{url}?tab=site-diary", wait_until="networkidle")
    wait_app(page)
    for name in ("Site diary", "Site Diary", "Diary"):
        loc = page.get_by_role("tab", name=name)
        if loc.count() == 0:
            loc = page.get_by_role("button", name=name)
        if loc.count() > 0:
            loc.first.click()
            wait_app(page)
            break
    return True


def capture_all() -> list[Path]:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    paths: list[Path] = []
    current_role = None

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport=VIEWPORT,
            device_scale_factor=1,
            color_scheme="light",
        )
        page = context.new_page()

        for shot in CAPTURES:
            if shot["role"] != current_role:
                current_role = shot["role"]
                print(f"Logging in as {shot['email']}…")
                login(page, shot["email"])

            target = shot["path"]
            print(f"  Capturing {shot['file']} ({target})")
            try:
                if target == "PROJECT_DETAIL":
                    ok = open_first_project(page)
                    if not ok:
                        print("    skip: no project")
                        continue
                elif target == "PROJECT_DETAIL_DIARY":
                    ok = open_site_diary(page)
                    if not ok:
                        print("    skip: no diary view")
                        continue
                else:
                    page.goto(f"{BASE}{target}", wait_until="networkidle")
                    wait_app(page)

                # Close any open modals/toasts that might obscure the page
                page.keyboard.press("Escape")
                page.wait_for_timeout(200)

                out = OUT_DIR / shot["file"]
                page.screenshot(path=str(out), full_page=False)
                paths.append(out)
            except Exception as exc:  # noqa: BLE001
                print(f"    error: {exc}")

        browser.close()
    return paths


def build_pdf(images: list[Path]):
    if not images:
        raise SystemExit("No screenshots to build PDF")

    # Use first image size as page size (points ≈ pixels for 72dpi feel; scale to fit)
    first = Image.open(images[0])
    page_w, page_h = first.size  # use pixel dimensions as PDF points for 1:1 look
    # Cap PDF page size for viewers; keep aspect
    max_w, max_h = 1440, 900
    scale = min(max_w / page_w, max_h / page_h, 1.0)
    page_w = page_w * scale
    page_h = page_h * scale

    c = canvas.Canvas(str(PDF_PATH), pagesize=(page_w, page_h))
    for img_path in images:
        img = Image.open(img_path).convert("RGB")
        # Fit image exactly to page (viewport only)
        c.drawImage(
            ImageReader(img),
            0,
            0,
            width=page_w,
            height=page_h,
            preserveAspectRatio=True,
            anchor="c",
        )
        c.showPage()
    c.save()
    print(f"PDF written: {PDF_PATH}")


if __name__ == "__main__":
    shots = capture_all()
    print(f"Captured {len(shots)} screenshots")
    build_pdf(shots)
